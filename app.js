// app.js
// ต้องมี <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
// และโหลด config.js ก่อน app.js

(() => {
  const C = window.APP_CONFIG;

  let provider, signer, account;
  let usdt, core, vault, staking;

  let selectedPkg = null;     // {pkgId, usdt}
  let sponsor = ethers.constants.AddressZero;
  let sideRight = true;       // true=Right, false=Left

  // ===== Helpers =====
  const $ = (id) => document.getElementById(id);

  function shortAddr(a) {
    if (!a) return "-";
    return a.slice(0, 6) + "..." + a.slice(-4);
  }

  function parseReferral() {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    const side = (url.searchParams.get("side") || "").toUpperCase();

    if (ref && ethers.utils.isAddress(ref)) sponsor = ethers.utils.getAddress(ref);
    if (side === "L" || side === "LEFT") sideRight = false;
    if (side === "R" || side === "RIGHT") sideRight = true;

    // เติม UI ถ้ามี element
    if ($("txtSponsor")) $("txtSponsor").textContent = sponsor === ethers.constants.AddressZero ? "(ไม่มี)" : sponsor;
    if ($("btnLeft") && $("btnRight")) {
      $("btnLeft").classList.toggle("active", !sideRight);
      $("btnRight").classList.toggle("active", sideRight);
    }
    if ($("refUrl")) {
      const base = window.location.origin + window.location.pathname;
      const myRef = `${base}?ref=${account || "0xSponsor"}&side=${sideRight ? "R" : "L"}`;
      $("refUrl").textContent = myRef;
    }
  }

  async function ensureBSC() {
    const net = await provider.getNetwork();
    if (net.chainId === C.CHAIN_ID_DEC) return true;

    // แสดงปุ่ม switch ถ้ามี
    if ($("netWarning")) {
      $("netWarning").style.display = "block";
      $("netWarning").textContent = `เครือข่ายไม่ใช่ BSC (ตอนนี้ ${net.chainId}) กรุณาสลับเป็น BSC`;
    }

    // พยายาม switch อัตโนมัติ (ถ้า wallet รองรับ)
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: C.CHAIN_ID_HEX }],
      });
      return true;
    } catch (e) {
      // ถ้าไม่มี chain ใน wallet ให้ add
      if (e?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: C.CHAIN_ID_HEX,
            chainName: C.CHAIN_NAME,
            rpcUrls: [C.RPC_URL],
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            blockExplorerUrls: [C.BLOCK_EXPLORER],
          }],
        });
        return true;
      }
      console.warn("Switch chain failed:", e);
      return false;
    }
  }

  function setStatus(msg, ok=true) {
    if (!$("status")) return;
    $("status").textContent = msg;
    $("status").style.color = ok ? "" : "#ff6b6b";
  }

  function initContracts() {
    usdt    = new ethers.Contract(C.USDT, C.ABI.ERC20, signer);
    core    = new ethers.Contract(C.CORE, C.ABI.CORE, signer);
    vault   = new ethers.Contract(C.VAULT, C.ABI.VAULT, signer);
    staking = new ethers.Contract(C.STAKING, C.ABI.STAKING, signer);
  }

  async function refreshDashboard() {
    if (!account) return;

    try {
      // user core
      const u = await core.getUserCore(account);
      // u: sponsor, parent, sideRight, pkg, rank, directCount
      if ($("dashPkg")) $("dashPkg").textContent = ["Small","Medium","Large"][u.pkg] ?? "None";
      if ($("dashRank")) $("dashRank").textContent = String(u.rank);

      // vault earns
      const e = await vault.earns(account);
      // e: claimUSDT, claimDF, ...
      const usdtDec = 18; // BSC USDT ตัวนี้ 18
      const dfDec = 18;

      if ($("claimUSDT")) $("claimUSDT").textContent = ethers.utils.formatUnits(e.claimUSDT, usdtDec);
      if ($("claimDF"))   $("claimDF").textContent   = ethers.utils.formatUnits(e.claimDF, dfDec);

      // staking pending
      const pending = await staking.pendingReward(account);
      if ($("pendingStake")) $("pendingStake").textContent = ethers.utils.formatUnits(pending, dfDec);

    } catch (err) {
      console.warn(err);
    }
  }

  // ===== Actions =====
  async function connectWallet() {
    try {
      if (typeof window.ethereum === "undefined") {
        alert("ไม่พบกระเป๋า (Wallet) ในเบราว์เซอร์นี้");
        return;
      }

      // ขอ account
      await window.ethereum.request({ method: "eth_requestAccounts" });

      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      signer = provider.getSigner();
      account = await signer.getAddress();

      // ensure chain
      const ok = await ensureBSC();
      if (!ok) {
        setStatus("กรุณาสลับเครือข่ายเป็น BSC ก่อน", false);
        return;
      }

      initContracts();

      // UI
      if ($("walletAddr")) $("walletAddr").textContent = account;
      if ($("netId")) $("netId").textContent = String((await provider.getNetwork()).chainId);

      setStatus("เชื่อมต่อสำเร็จ ✅");

      parseReferral();
      await refreshDashboard();

      // subscribe events
      window.ethereum.on?.("accountsChanged", () => window.location.reload());
      window.ethereum.on?.("chainChanged", () => window.location.reload());

    } catch (e) {
      console.error(e);
      setStatus(e?.message || "เชื่อมต่อไม่สำเร็จ", false);
    }
  }

  function choosePkg(pkgId) {
    selectedPkg = C.PACKAGES.find(p => p.pkgId === pkgId) || null;
    if ($("selectedPkg")) $("selectedPkg").textContent = selectedPkg ? `${selectedPkg.label} (${selectedPkg.usdt} USDT)` : "-";

    // active class
    C.PACKAGES.forEach(p => {
      const el = $(`pkg_${p.pkgId}`);
      if (el) el.classList.toggle("active", selectedPkg?.pkgId === p.pkgId);
    });
  }

  async function approveAndBuy() {
    if (!account) return alert("กรุณา Connect Wallet");
    if (!selectedPkg) return alert("กรุณาเลือกแพ็คเกจก่อน");

    try {
      setStatus("กำลังตรวจ allowance...");

      const usdtDec = 18;
      const need = ethers.utils.parseUnits(selectedPkg.usdt, usdtDec);

      const allowance = await usdt.allowance(account, C.CORE);
      if (allowance.lt(need)) {
        setStatus("กำลัง Approve USDT...");
        const tx1 = await usdt.approve(C.CORE, need);
        await tx1.wait();
      }

      setStatus("กำลังซื้อ/สมัครแพ็คเกจ...");
      // สมัคร = buyOrUpgrade
      const tx2 = await core.buyOrUpgrade(selectedPkg.pkgId, sponsor, sideRight);
      await tx2.wait();

      setStatus("สำเร็จ ✅ ซื้อ/สมัครเรียบร้อย");
      await refreshDashboard();
    } catch (e) {
      console.error(e);
      setStatus(e?.data?.message || e?.message || "ทำรายการไม่สำเร็จ", false);
      alert(e?.data?.message || e?.message || "ทำรายการไม่สำเร็จ");
    }
  }

  async function claimVault() {
    if (!account) return alert("กรุณา Connect Wallet");
    try {
      setStatus("กำลัง Claim จาก Vault...");
      const tx = await vault.claim();
      await tx.wait();
      setStatus("Claim สำเร็จ ✅");
      await refreshDashboard();
    } catch (e) {
      console.error(e);
      setStatus(e?.message || "Claim ไม่สำเร็จ", false);
    }
  }

  async function claimStake() {
    if (!account) return alert("กรุณา Connect Wallet");
    try {
      setStatus("กำลัง Claim Stake...");
      const tx = await staking.claimStake();
      await tx.wait();
      setStatus("Claim Stake สำเร็จ ✅");
      await refreshDashboard();
    } catch (e) {
      console.error(e);
      setStatus(e?.message || "Claim Stake ไม่สำเร็จ", false);
    }
  }

  function setSide(isRight) {
    sideRight = !!isRight;
    if ($("btnLeft")) $("btnLeft").classList.toggle("active", !sideRight);
    if ($("btnRight")) $("btnRight").classList.toggle("active", sideRight);
    parseReferral();
  }

  // ===== Wire to DOM =====
  window.addEventListener("DOMContentLoaded", () => {
    // buttons (ให้ id ตรงกับ UI)
    $("btnConnect")?.addEventListener("click", connectWallet);
    $("btnBuy")?.addEventListener("click", approveAndBuy);
    $("btnClaimVault")?.addEventListener("click", claimVault);
    $("btnClaimStake")?.addEventListener("click", claimStake);

    $("btnLeft")?.addEventListener("click", () => setSide(false));
    $("btnRight")?.addEventListener("click", () => setSide(true));

    // package cards
    C.PACKAGES.forEach(p => {
      $(`pkg_${p.pkgId}`)?.addEventListener("click", () => choosePkg(p.pkgId));
    });

    // preload referral (ยังไม่ connect ก็แสดง sponsor/side ได้)
    parseReferral();
    setStatus("พร้อมใช้งาน • กด Connect Wallet");
  });
})();
