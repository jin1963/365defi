// app.js
(() => {
  const C = window.APP_CONFIG;
  if (!C) throw new Error("APP_CONFIG missing");

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const shortAddr = (a) => a ? (a.slice(0, 6) + "..." + a.slice(-4)) : "-";
  const isAddr = (s) => /^0x[a-fA-F0-9]{40}$/.test(String(s || ""));
  const toNum = (v) => (v == null ? 0 : Number(v));
  const nowSec = () => Math.floor(Date.now() / 1000);

  function setStatus(msg, ok = true) {
    const el = $("statusText");
    if (!el) return;
    el.textContent = msg;
    el.dataset.ok = ok ? "1" : "0";
  }

  function parseQuery() {
    const q = new URLSearchParams(location.search);
    const ref = q.get("ref");
    const side = (q.get("side") || "").toUpperCase(); // L/R
    return {
      ref: isAddr(ref) ? ref : "",
      sideRight: side === "R",
      sideRaw: side === "R" ? "R" : "L",
    };
  }

  // Choose the correct injected provider (fix: Bitget / multiple providers)
  function pickProvider() {
    // Binance Wallet
    if (window.BinanceChain && window.BinanceChain.request) return window.BinanceChain;

    // Bitget (often under bitkeep)
    if (window.bitkeep && window.bitkeep.ethereum && window.bitkeep.ethereum.request) return window.bitkeep.ethereum;

    // Multiple providers
    const eth = window.ethereum;
    if (eth && Array.isArray(eth.providers) && eth.providers.length) {
      const mm = eth.providers.find((p) => p.isMetaMask);
      const bg = eth.providers.find((p) => p.isBitKeep || p.isBitgetWallet);
      const bn = eth.providers.find((p) => p.isBinance || p.isBinanceWallet);
      return bg || mm || bn || eth.providers[0];
    }

    if (eth && eth.request) return eth;
    return null;
  }

  async function ensureBSC(provider) {
    const chainId = await provider.request({ method: "eth_chainId" });
    if (chainId === C.CHAIN_ID_HEX) return;

    // try switch
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: C.CHAIN_ID_HEX }],
      });
    } catch (e) {
      // try add chain (some wallets need this)
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: C.CHAIN_ID_HEX,
          chainName: C.CHAIN_NAME,
          rpcUrls: [C.RPC_URL],
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          blockExplorerUrls: [C.BLOCK_EXPLORER],
        }],
      });
    }
  }

  // ---------- State ----------
  let provider;   // injected provider (EIP-1193)
  let ethersProv; // ethers provider
  let signer;
  let account = "";

  let usdt, df, core, vault, staking;

  // Package mapping (edit if your enum differs)
  const PKG = {
    NONE: 0,
    SMALL: 1,   // 100
    MEDIUM: 2,  // 1000
    LARGE: 3,   // 10000
  };

  // Price in USDT (based on your UI)
  const PKG_USDT = {
    [PKG.SMALL]: 100,
    [PKG.MEDIUM]: 1000,
    [PKG.LARGE]: 10000,
  };

  let selectedPkg = PKG.NONE;
  let sponsorAddr = "";
  let sideRight = false;

  // ---------- UI bindings (IDs ที่ต้องมีใน HTML) ----------
  // btnConnect, walletAddress, walletNetwork, sponsorAuto, btnSideL, btnSideR
  // pkgSmall, pkgMedium, pkgLarge, selectedPkgText, btnApproveBuy
  // dashPackage, dashRank, dashClaimUSDT, dashClaimDF, dashLeftVol, dashRightVol
  // dashStakePrincipal, dashPendingReward, dashStakeCountdown, dashStakeEnd
  // btnClaimBonus, btnClaimStake, btnRefresh
  // statusText

  function setSideUI() {
    const l = $("btnSideL");
    const r = $("btnSideR");
    if (!l || !r) return;
    if (sideRight) {
      r.classList.add("active");
      l.classList.remove("active");
    } else {
      l.classList.add("active");
      r.classList.remove("active");
    }
  }

  function setPkgUI() {
    const t = $("selectedPkgText");
    if (!t) return;
    if (selectedPkg === PKG.SMALL) t.textContent = "Small (100 USDT)";
    else if (selectedPkg === PKG.MEDIUM) t.textContent = "Medium (1,000 USDT)";
    else if (selectedPkg === PKG.LARGE) t.textContent = "Large (10,000 USDT)";
    else t.textContent = "-";
  }

  function updateReferralURL() {
    const el = $("refUrl");
    if (!el) return;
    const ref = isAddr(sponsorAddr) ? sponsorAddr : "0xSponsor";
    const side = sideRight ? "R" : "L";
    const u = `${location.origin}${location.pathname}?ref=${ref}&side=${side}`;
    el.textContent = u;
  }

  // ---------- Connect ----------
  async function connectWallet() {
    try {
      provider = pickProvider();
      if (!provider) {
        setStatus("ไม่พบ Wallet Provider (ใช้ MetaMask/Bitget/Binance Wallet)", false);
        return;
      }

      setStatus("กำลังเชื่อมต่อกระเป๋า...");
      await ensureBSC(provider);

      const accs = await provider.request({ method: "eth_requestAccounts" });
      account = (accs && accs[0]) ? accs[0] : "";
      if (!isAddr(account)) {
        setStatus("เชื่อมต่อไม่สำเร็จ (ไม่พบ address)", false);
        return;
      }

      ethersProv = new ethers.providers.Web3Provider(provider, "any");
      signer = ethersProv.getSigner();

      // Contracts
      usdt = new ethers.Contract(C.USDT, C.ERC20_ABI, signer);
      df = new ethers.Contract(C.DF, C.ERC20_ABI, signer);

      core = new ethers.Contract(C.CORE, C.CORE_ABI, signer);
      vault = new ethers.Contract(C.VAULT, C.VAULT_ABI, signer);
      staking = new ethers.Contract(C.STAKING, C.STAKING_ABI, signer);

      // UI
      if ($("walletAddress")) $("walletAddress").textContent = account;
      if ($("walletNetwork")) $("walletNetwork").textContent = String(C.CHAIN_ID_DEC);

      // auto sponsor from query (or keep existing)
      const q = parseQuery();
      if (q.ref) sponsorAddr = q.ref;
      sideRight = q.sideRight;

      if ($("sponsorAuto")) $("sponsorAuto").textContent = sponsorAddr ? shortAddr(sponsorAddr) : "(ไม่มี)";
      setSideUI();
      updateReferralURL();

      // event listeners
      provider.on?.("accountsChanged", () => location.reload());
      provider.on?.("chainChanged", () => location.reload());

      setStatus("เชื่อมต่อสำเร็จ ✅");
      await refreshDashboard();
    } catch (e) {
      console.error(e);
      setStatus(`เชื่อมต่อผิดพลาด: ${e?.message || e}`, false);
    }
  }

  // ---------- Actions ----------
  async function approveAndBuy() {
    if (!signer || !isAddr(account)) return setStatus("ยังไม่เชื่อมต่อกระเป๋า", false);
    if (![PKG.SMALL, PKG.MEDIUM, PKG.LARGE].includes(selectedPkg)) return setStatus("กรุณาเลือกแพ็คเกจ", false);

    // sponsor required for first-time register (recommend)
    if (!isAddr(sponsorAddr)) return setStatus("กรุณาใส่ Sponsor (ref) ให้ถูกต้อง", false);
    if (sponsorAddr.toLowerCase() === account.toLowerCase()) return setStatus("Sponsor ห้ามเป็น address ตัวเอง", false);

    try {
      setStatus("กำลังตรวจสอบ allowance...");
      const dec = await usdt.decimals(); // USDT ของคุณ = 18
      const usdtNeed = ethers.utils.parseUnits(String(PKG_USDT[selectedPkg]), dec);

      const allowance = await usdt.allowance(account, C.CORE);
      if (allowance.lt(usdtNeed)) {
        setStatus("กำลัง Approve USDT...");
        const txA = await usdt.approve(C.CORE, usdtNeed);
        await txA.wait();
      }

      setStatus("กำลังส่งธุรกรรม Buy/Upgrade...");
      const tx = await core.buyOrUpgrade(selectedPkg, sponsorAddr, sideRight);
      await tx.wait();

      setStatus("สำเร็จ ✅ Buy/Upgrade แล้ว");
      await refreshDashboard();
    } catch (e) {
      console.error(e);
      setStatus(`Buy/Upgrade ล้มเหลว: ${e?.data?.message || e?.message || e}`, false);
    }
  }

  async function claimBonus() {
    if (!vault) return;
    try {
      setStatus("กำลัง Claim Bonus...");
      const tx = await vault.claim();
      await tx.wait();
      setStatus("Claim Bonus สำเร็จ ✅");
      await refreshDashboard();
    } catch (e) {
      console.error(e);
      setStatus(`Claim Bonus ล้มเหลว: ${e?.data?.message || e?.message || e}`, false);
    }
  }

  async function claimStake() {
    if (!staking) return;
    try {
      setStatus("กำลัง Claim Stake/Reward...");
      const tx = await staking.claimStake();
      await tx.wait();
      setStatus("Claim Stake สำเร็จ ✅");
      await refreshDashboard();
    } catch (e) {
      console.error(e);
      setStatus(`Claim Stake ล้มเหลว: ${e?.data?.message || e?.message || e}`, false);
    }
  }

  // ---------- Dashboard ----------
  function pkgName(v) {
    const n = toNum(v);
    if (n === PKG.SMALL) return "Small";
    if (n === PKG.MEDIUM) return "Medium";
    if (n === PKG.LARGE) return "Large";
    return "None";
  }

  function rankName(v) {
    // ถ้าคุณมี mapping rank จริง ส่งให้ผมได้ เดี๋ยวใส่ชื่อให้
    const n = toNum(v);
    return String(n);
  }

  async function refreshDashboard() {
    if (!isAddr(account) || !core || !vault || !staking) return;

    try {
      setStatus("กำลังโหลดข้อมูล...");

      // core user + volumes
      const u = await core.users(account);
      const vols = await core.volumesOf(account);

      // vault earns
      const e = await vault.earns(account);

      // staking
      const st = await staking.stakes(account);
      const pending = await staking.pendingReward(account);

      // render
      if ($("dashPackage")) $("dashPackage").textContent = pkgName(u.pkg);
      if ($("dashRank")) $("dashRank").textContent = rankName(u.rank);

      // claimable (vault)
      const usdtDec = await usdt.decimals();
      const dfDec = await df.decimals();

      if ($("dashClaimUSDT")) $("dashClaimUSDT").textContent = ethers.utils.formatUnits(e.claimUSDT, usdtDec);
      if ($("dashClaimDF")) $("dashClaimDF").textContent = ethers.utils.formatUnits(e.claimDF, dfDec);

      if ($("dashLeftVol")) $("dashLeftVol").textContent = ethers.utils.formatUnits(vols.l, usdtDec);
      if ($("dashRightVol")) $("dashRightVol").textContent = ethers.utils.formatUnits(vols.r, usdtDec);

      // staking principal/reward
      if ($("dashStakePrincipal")) $("dashStakePrincipal").textContent = ethers.utils.formatUnits(st.principal, dfDec);
      if ($("dashPendingReward")) $("dashPendingReward").textContent = ethers.utils.formatUnits(pending, dfDec);

      const end = toNum(st.end);
      if ($("dashStakeEnd")) $("dashStakeEnd").textContent = end ? new Date(end * 1000).toLocaleString() : "-";

      if ($("dashStakeCountdown")) {
        if (!end) $("dashStakeCountdown").textContent = "-";
        else {
          const left = end - nowSec();
          $("dashStakeCountdown").textContent = left > 0 ? `${Math.floor(left / 86400)}d ${Math.floor((left % 86400) / 3600)}h` : "ครบกำหนดแล้ว";
        }
      }

      setStatus("พร้อมใช้งาน ✅");
    } catch (e) {
      console.error(e);
      setStatus(`โหลดข้อมูลล้มเหลว: ${e?.message || e}`, false);
    }
  }

  // ---------- Sponsor input (optional) ----------
  function bindSponsorInput() {
    const inp = $("sponsorInput");
    const btn = $("btnSetSponsor");
    if (!inp || !btn) return;

    btn.addEventListener("click", () => {
      const v = (inp.value || "").trim();
      sponsorAddr = isAddr(v) ? v : "";
      if ($("sponsorAuto")) $("sponsorAuto").textContent = sponsorAddr ? shortAddr(sponsorAddr) : "(ไม่มี)";
      updateReferralURL();
      setStatus("ตั้งค่า Sponsor แล้ว ✅");
    });
  }

  // ---------- Init ----------
  function bindUI() {
    $("btnConnect")?.addEventListener("click", connectWallet);

    $("btnSideL")?.addEventListener("click", () => { sideRight = false; setSideUI(); updateReferralURL(); });
    $("btnSideR")?.addEventListener("click", () => { sideRight = true;  setSideUI(); updateReferralURL(); });

    $("pkgSmall")?.addEventListener("click", () => { selectedPkg = PKG.SMALL; setPkgUI(); });
    $("pkgMedium")?.addEventListener("click", () => { selectedPkg = PKG.MEDIUM; setPkgUI(); });
    $("pkgLarge")?.addEventListener("click", () => { selectedPkg = PKG.LARGE; setPkgUI(); });

    $("btnApproveBuy")?.addEventListener("click", approveAndBuy);

    $("btnClaimBonus")?.addEventListener("click", claimBonus);
    $("btnClaimStake")?.addEventListener("click", claimStake);
    $("btnRefresh")?.addEventListener("click", refreshDashboard);

    bindSponsorInput();

    // preload query
    const q = parseQuery();
    sponsorAddr = q.ref;
    sideRight = q.sideRight;
    setSideUI();
    updateReferralURL();
    setPkgUI();
  }

  window.addEventListener("load", () => {
    bindUI();
    // สำคัญ: อย่า auto-connect บนมือถือบาง wallet จะไม่ยอม ต้องให้ user กดปุ่มเอง
    setStatus("กด Connect Wallet เพื่อเริ่ม");
  });
})();
