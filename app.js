/* global ethers, APP_CONFIG */

let provider, signer, user;
let usdt, df, core, vault, staking;

let selectedPkg = null;          // S / M / L
let selectedSideRight = null;    // false = Left, true = Right
let sponsorAddr = null;

const $ = (id) => document.getElementById(id);

/* =========================
   Helpers
========================= */
function setStatus(msg) {
  $("status").textContent = msg;
}

function shortAddr(a) {
  return a ? a.slice(0, 6) + "..." + a.slice(-4) : "-";
}

function format18(v) {
  try {
    return ethers.utils.formatUnits(v, 18);
  } catch {
    return "0";
  }
}

function pkgName(n) {
  if (n === 1) return "Small";
  if (n === 2) return "Medium";
  if (n === 3) return "Large";
  return "None";
}

function rankName(n) {
  if (n === 1) return "Bronze";
  if (n === 2) return "Silver";
  if (n === 3) return "Gold";
  return "None";
}

function secondsToText(sec) {
  if (sec <= 0) return "ครบกำหนดแล้ว";
  const d = Math.floor(sec / 86400);
  sec %= 86400;
  const h = Math.floor(sec / 3600);
  sec %= 3600;
  const m = Math.floor(sec / 60);
  return `${d} วัน ${h} ชม ${m} นาที`;
}

/* =========================
   Parse Referral URL
========================= */
function parseQuery() {
  const q = new URLSearchParams(window.location.search);
  const ref = q.get("ref");
  const side = q.get("side");

  if (ref && ethers.utils.isAddress(ref)) {
    sponsorAddr = ethers.utils.getAddress(ref);
    $("sponsor").textContent = sponsorAddr;
  } else {
    $("sponsor").textContent = "(ไม่มี)";
  }

  if (side) {
    if (side.toUpperCase() === "L") selectedSideRight = false;
    if (side.toUpperCase() === "R") selectedSideRight = true;
  }

  if (selectedSideRight !== null) {
    $("sideText").textContent = selectedSideRight ? "Right" : "Left";
  }
}

/* =========================
   Bind UI
========================= */
function bindUI() {
  $("btnConnect").onclick = connectWallet;

  $("btnSideL").onclick = () => {
    selectedSideRight = false;
    $("sideText").textContent = "Left";
  };

  $("btnSideR").onclick = () => {
    selectedSideRight = true;
    $("sideText").textContent = "Right";
  };

  document.querySelectorAll(".pkg").forEach(btn => {
    btn.onclick = () => {
      selectedPkg = btn.dataset.pkg;
      $("selectedPkg").textContent = selectedPkg;
      $("btnBuy").disabled = !user;
    };
  });

  $("btnBuy").onclick = buyPackage;
  $("btnRefresh").onclick = refreshAll;
  $("btnClaimBonus").onclick = claimBonus;
  $("btnClaimStake").onclick = claimStake;
}

/* =========================
   Connect Wallet
========================= */
async function connectWallet() {
  try {
    if (!window.ethereum) throw new Error("ไม่พบ Wallet");

    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    user = await signer.getAddress();

    const net = await provider.getNetwork();
    if (net.chainId !== APP_CONFIG.CHAIN_ID_DEC) {
      throw new Error("กรุณาเปลี่ยนเป็น BSC Mainnet");
    }

    $("wallet").textContent = user;
    $("network").textContent = net.chainId;

    usdt = new ethers.Contract(APP_CONFIG.USDT, APP_CONFIG.ABI.ERC20, signer);
    df = new ethers.Contract(APP_CONFIG.DF, APP_CONFIG.ABI.ERC20, signer);
    core = new ethers.Contract(APP_CONFIG.CORE, APP_CONFIG.ABI.CORE, signer);
    vault = new ethers.Contract(APP_CONFIG.VAULT, APP_CONFIG.ABI.VAULT, signer);
    staking = new ethers.Contract(APP_CONFIG.STAKING, APP_CONFIG.ABI.STAKING, signer);

    $("contractsLine").textContent =
      `CORE ${APP_CONFIG.CORE} | VAULT ${APP_CONFIG.VAULT} | STAKING ${APP_CONFIG.STAKING}`;

    $("btnBuy").disabled = !selectedPkg;
    $("btnRefresh").disabled = false;
    $("btnClaimBonus").disabled = false;
    $("btnClaimStake").disabled = false;

    setStatus("เชื่อมต่อสำเร็จ กด Refresh เพื่อโหลดข้อมูล");
    await refreshAll();

    window.ethereum.on("accountsChanged", () => location.reload());
    window.ethereum.on("chainChanged", () => location.reload());

  } catch (e) {
    setStatus("Connect error: " + e.message);
  }
}

/* =========================
   Buy / Upgrade
========================= */
async function buyPackage() {
  try {
    if (!user) throw new Error("ยังไม่เชื่อมกระเป๋า");
    if (!selectedPkg) throw new Error("เลือกแพ็คเกจ");
    if (!sponsorAddr) throw new Error("ไม่มี sponsor ในลิงก์");
    if (selectedSideRight === null) throw new Error("เลือก Left / Right");

    const pkg = APP_CONFIG.PACKAGES[selectedPkg];
    const usdtAmount = ethers.utils.parseUnits(pkg.usdt, 18);

    setStatus("ตรวจสอบ allowance...");
    const allowance = await usdt.allowance(user, APP_CONFIG.CORE);

    if (allowance.lt(usdtAmount)) {
      setStatus("Approve USDT...");
      const tx1 = await usdt.approve(APP_CONFIG.CORE, usdtAmount);
      await tx1.wait();
    }

    setStatus("กำลังซื้อ / อัปเกรด...");
    const tx2 = await core.buyOrUpgrade(pkg.enum, sponsorAddr, selectedSideRight);
    await tx2.wait();

    setStatus("ซื้อสำเร็จ กำลังรีเฟรชข้อมูล");
    await refreshAll();

  } catch (e) {
    setStatus("Buy error: " + (e.error?.message || e.message));
  }
}

/* =========================
   Refresh Dashboard
========================= */
async function refreshAll() {
  try {
    if (!user) return;

    const u = await core.getUserCore(user);
    $("kpiPkg").textContent = pkgName(Number(u.pkg));
    $("kpiRank").textContent = rankName(Number(u.rank));

    const v = await core.volumesOf(user);
    $("kpiVolL").textContent = format18(v.l);
    $("kpiVolR").textContent = format18(v.r);

    const earns = await vault.earns(user);
    $("kpiClaimUSDT").textContent = format18(earns.claimUSDT);
    $("kpiClaimDF").textContent = format18(earns.claimDF);

    const s = await staking.stakes(user);
    $("kpiPrincipal").textContent = format18(s.principal);

    const pending = await staking.pendingReward(user);
    $("kpiPending").textContent = format18(pending);

    const endTs = Number(s.end);
    if (endTs > 0) {
      const now = Math.floor(Date.now() / 1000);
      $("kpiCountdown").textContent = secondsToText(endTs - now);
      $("kpiStakeEnd").textContent = new Date(endTs * 1000).toISOString();
    } else {
      $("kpiCountdown").textContent = "-";
      $("kpiStakeEnd").textContent = "-";
    }

    setStatus("อัปเดตข้อมูลเรียบร้อย");

  } catch (e) {
    setStatus("Refresh error: " + (e.error?.message || e.message));
  }
}

/* =========================
   Claim Bonus (Vault)
========================= */
async function claimBonus() {
  try {
    setStatus("กำลังเคลมโบนัส...");
    const tx = await vault.claim();
    await tx.wait();
    setStatus("เคลมโบนัสสำเร็จ");
    await refreshAll();
  } catch (e) {
    setStatus("Claim error: " + (e.error?.message || e.message));
  }
}

/* =========================
   Claim Stake
========================= */
async function claimStake() {
  try {
    setStatus("กำลังเคลม Staking...");
    const tx = await staking.claimStake();
    await tx.wait();
    setStatus("เคลม Staking สำเร็จ");
    await refreshAll();
  } catch (e) {
    setStatus("Claim stake error: " + (e.error?.message || e.message));
  }
}

/* =========================
   Init
========================= */
(function init() {
  parseQuery();
  bindUI();
})();
