// app.js (match your current index.html IDs)
(() => {
  const C = window.APP_CONFIG;
  if (!C) throw new Error("APP_CONFIG missing (config.js not loaded)");

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const qs = (sel) => document.querySelector(sel);

  // Wallet section IDs (from your HTML)
  const EL = {
    btnConnect: $("btnConnect"),
    wallet: $("wallet"),
    network: $("network"),
    sponsor: $("sponsor"),
    btnSideL: $("btnSideL"),
    btnSideR: $("btnSideR"),
    sideText: $("sideText"),
    referralSpan: qs(".hint .mono"), // "Referral URL: <span class='mono'>...</span>"
    selectedPkg: $("selectedPkg"),
    btnBuy: $("btnBuy"),

    // dashboard
    kpiPkg: $("kpiPkg"),
    kpiRank: $("kpiRank"),
    kpiClaimUSDT: $("kpiClaimUSDT"),
    kpiClaimDF: $("kpiClaimDF"),
    kpiVolL: $("kpiVolL"),
    kpiVolR: $("kpiVolR"),
    kpiPrincipal: $("kpiPrincipal"),
    kpiPending: $("kpiPending"),
    kpiCountdown: $("kpiCountdown"),
    kpiStakeEnd: $("kpiStakeEnd"),

    // actions
    btnClaimBonus: $("btnClaimBonus"),
    btnClaimStake: $("btnClaimStake"),
    btnRefresh: $("btnRefresh"),

    // status/footer
    status: $("status"),
    contractsLine: $("contractsLine"),
  };

  // ---------- Helpers ----------
  const isAddr = (s) => /^0x[a-fA-F0-9]{40}$/.test(String(s || ""));
  const shortAddr = (a) => (a ? a.slice(0, 6) + "..." + a.slice(-4) : "-");
  const nowSec = () => Math.floor(Date.now() / 1000);
  const toNum = (v) => (v == null ? 0 : Number(v));

  function setStatus(msg, ok = true) {
    if (!EL.status) return;
    EL.status.textContent = msg;
    EL.status.dataset.ok = ok ? "1" : "0";
  }

  function parseQuery() {
    const q = new URLSearchParams(location.search);
    const ref = q.get("ref");
    const side = (q.get("side") || "").toUpperCase(); // L/R
    return {
      ref: isAddr(ref) ? ref : "",
      sideRight: side === "R",
    };
  }

  // pick correct provider (fix Bitget / multiple providers)
  function pickProvider() {
    // Binance Wallet
    if (window.BinanceChain && window.BinanceChain.request) return window.BinanceChain;

    // Bitget/BitKeep
    if (window.bitkeep && window.bitkeep.ethereum && window.bitkeep.ethereum.request) return window.bitkeep.ethereum;

    const eth = window.ethereum;
    if (eth && Array.isArray(eth.providers) && eth.providers.length) {
      const bg = eth.providers.find((p) => p.isBitKeep || p.isBitgetWallet);
      const mm = eth.providers.find((p) => p.isMetaMask);
      const bn = eth.providers.find((p) => p.isBinance || p.isBinanceWallet);
      return bg || mm || bn || eth.providers[0];
    }
    if (eth && eth.request) return eth;
    return null;
  }

  async function ensureBSC(provider) {
    const chainId = await provider.request({ method: "eth_chainId" });
    if (chainId === C.CHAIN_ID_HEX) return;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: C.CHAIN_ID_HEX }],
      });
    } catch (e) {
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
  let provider;
  let ethersProv;
  let signer;
  let account = "";

  let usdt, df, core, vault, staking;

  // enum mapping (recommended)
  const PKG = { NONE: 0, SMALL: 1, MEDIUM: 2, LARGE: 3 };
  const PKG_USDT = { [PKG.SMALL]: 100, [PKG.MEDIUM]: 1000, [PKG.LARGE]: 10000 };

  let selectedPkg = PKG.NONE;
  let sponsorAddr = "";
  let sideRight = false;

  function pkgName(v) {
    const n = toNum(v);
    if (n === PKG.SMALL) return "Small";
    if (n === PKG.MEDIUM) return "Medium";
    if (n === PKG.LARGE) return "Large";
    return "None";
  }

  function rankName(v) {
    // ถ้าคุณมีชื่อ rank จริง ส่งมา เดี๋ยวใส่ mapping ให้
    return String(toNum(v));
  }

  // ---------- UI ----------
  function setSideUI() {
    if (!EL.btnSideL || !EL.btnSideR) return;

    if (sideRight) {
      EL.btnSideR.classList.add("active");
      EL.btnSideL.classList.remove("active");
      if (EL.sideText) EL.sideText.textContent = "Right";
    } else {
      EL.btnSideL.classList.add("active");
      EL.btnSideR.classList.remove("active");
      if (EL.sideText) EL.sideText.textContent = "Left";
    }
    updateReferralURL();
  }

  function setPkgUI() {
    if (!EL.selectedPkg) return;
    if (selectedPkg === PKG.SMALL) EL.selectedPkg.textContent = "Small";
    else if (selectedPkg === PKG.MEDIUM) EL.selectedPkg.textContent = "Medium";
    else if (selectedPkg === PKG.LARGE) EL.selectedPkg.textContent = "Large";
    else EL.selectedPkg.textContent = "-";

    // enable buy only when connected + selected package
    EL.btnBuy.disabled = !(isAddr(account) && [PKG.SMALL, PKG.MEDIUM, PKG.LARGE].includes(selectedPkg));
  }

  function updateReferralURL() {
    if (!EL.referralSpan) return;
    const ref = isAddr(sponsorAddr) ? sponsorAddr : "0xSponsor";
    const side = sideRight ? "R" : "L";
    const u = `${location.origin}${location.pathname}?ref=${ref}&side=${side}`;
    EL.referralSpan.textContent = u;
  }

  function enableActions(enabled) {
    if (EL.btnClaimBonus) EL.btnClaimBonus.disabled = !enabled;
    if (EL.btnClaimStake) EL.btnClaimStake.disabled = !enabled;
    if (EL.btnRefresh) EL.btnRefresh.disabled = !enabled;
    if (EL.btnBuy) EL.btnBuy.disabled = !(enabled && [PKG.SMALL, PKG.MEDIUM, PKG.LARGE].includes(selectedPkg));
  }

  function renderContractsLine() {
    if (!EL.contractsLine) return;
    EL.contractsLine.textContent =
      `CORE: ${C.CORE} • VAULT: ${C.VAULT} • STAKING: ${C.STAKING} • DF: ${C.DF} • USDT: ${C.USDT}`;
  }

  // ---------- Connect ----------
  async function connectWallet() {
    try {
      setStatus("กำลังเชื่อมต่อกระเป๋า...");
      provider = pickProvider();
      if (!provider) return setStatus("ไม่พบ Wallet Provider (MetaMask/Bitget/Binance Wallet)", false);

      await ensureBSC(provider);

      const accs = await provider.request({ method: "eth_requestAccounts" });
      account = (accs && accs[0]) ? accs[0] : "";
      if (!isAddr(account)) return setStatus("เชื่อมต่อไม่สำเร็จ (ไม่พบ address)", false);

      ethersProv = new ethers.providers.Web3Provider(provider, "any");
      signer = ethersProv.getSigner();

      // contracts
      usdt = new ethers.Contract(C.USDT, C.ERC20_ABI, signer);
      df = new ethers.Contract(C.DF, C.ERC20_ABI, signer);
      core = new ethers.Contract(C.CORE, C.CORE_ABI, signer);
      vault = new ethers.Contract(C.VAULT, C.VAULT_ABI, signer);
      staking = new ethers.Contract(C.STAKING, C.STAKING_ABI, signer);

      // UI (IMPORTANT: match your HTML IDs)
      if (EL.wallet) EL.wallet.textContent = account;
      if (EL.network) EL.network.textContent = String(C.CHAIN_ID_DEC);

      // sponsor/side from URL
      const q = parseQuery();
      sponsorAddr = q.ref || "";
      sideRight = q.sideRight;

      if (EL.sponsor) EL.sponsor.textContent = sponsorAddr ? shortAddr(sponsorAddr) : "(ไม่มี)";
      setSideUI();
      updateReferralURL();
      setPkgUI();
      enableActions(true);

      // wallet events
      provider.on?.("accountsChanged", () => location.reload());
      provider.on?.("chainChanged", () => location.reload());

      setStatus("เชื่อมต่อสำเร็จ ✅");
      await refreshDashboard();
    } catch (e) {
      console.error(e);
      setStatus(`เชื่อมต่อผิดพลาด: ${e?.message || e}`, false);
    }
  }

  // ---------- Buy/Upgrade ----------
  async function approveAndBuy() {
    if (!isAddr(account) || !core || !usdt) return setStatus("ยังไม่เชื่อมต่อกระเป๋า", false);
    if (![PKG.SMALL, PKG.MEDIUM, PKG.LARGE].includes(selectedPkg)) return setStatus("กรุณาเลือกแพ็คเกจ", false);

    // ต้องมี sponsor เพื่อสมัครครั้งแรก (แนะนำให้บังคับ)
    if (!isAddr(sponsorAddr)) return setStatus("กรุณาใช้ลิงก์ referral (?ref=...) หรือใส่ sponsor ให้ถูกต้อง", false);
    if (sponsorAddr.toLowerCase() === account.toLowerCase()) return setStatus("Sponsor ห้ามเป็น address ตัวเอง", false);

    try {
      const dec = await usdt.decimals(); // USDT ของคุณ = 18
      const usdtNeed = ethers.utils.parseUnits(String(PKG_USDT[selectedPkg]), dec);

      setStatus("กำลังตรวจสอบ allowance...");
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

  // ---------- Claim ----------
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
  async function refreshDashboard() {
    if (!isAddr(account) || !core || !vault || !staking) return;

    try {
      setStatus("กำลังโหลดข้อมูล...");

      const u = await core.users(account);
      const vols = await core.volumesOf(account);
      const e = await vault.earns(account);
      const st = await staking.stakes(account);
      const pending = await staking.pendingReward(account);

      const usdtDec = await usdt.decimals();
      const dfDec = await df.decimals();

      if (EL.kpiPkg) EL.kpiPkg.textContent = pkgName(u.pkg);
      if (EL.kpiRank) EL.kpiRank.textContent = rankName(u.rank);

      if (EL.kpiClaimUSDT) EL.kpiClaimUSDT.textContent = ethers.utils.formatUnits(e.claimUSDT, usdtDec);
      if (EL.kpiClaimDF) EL.kpiClaimDF.textContent = ethers.utils.formatUnits(e.claimDF, dfDec);

      if (EL.kpiVolL) EL.kpiVolL.textContent = ethers.utils.formatUnits(vols.l, usdtDec);
      if (EL.kpiVolR) EL.kpiVolR.textContent = ethers.utils.formatUnits(vols.r, usdtDec);

      if (EL.kpiPrincipal) EL.kpiPrincipal.textContent = ethers.utils.formatUnits(st.principal, dfDec);
      if (EL.kpiPending) EL.kpiPending.textContent = ethers.utils.formatUnits(pending, dfDec);

      const end = toNum(st.end);
      if (EL.kpiStakeEnd) EL.kpiStakeEnd.textContent = end ? new Date(end * 1000).toLocaleString() : "-";

      if (EL.kpiCountdown) {
        if (!end) EL.kpiCountdown.textContent = "-";
        else {
          const left = end - nowSec();
          EL.kpiCountdown.textContent =
            left > 0 ? `${Math.floor(left / 86400)}d ${Math.floor((left % 86400) / 3600)}h` : "ครบกำหนดแล้ว";
        }
      }

      setStatus("พร้อมใช้งาน ✅");
    } catch (e) {
      console.error(e);
      setStatus(`โหลดข้อมูลล้มเหลว: ${e?.message || e}`, false);
    }
  }

  // ---------- Bind UI ----------
  function bindPkgButtons() {
    const buttons = document.querySelectorAll("button.pkg[data-pkg]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const v = String(btn.dataset.pkg || "").toUpperCase();
        if (v === "S") selectedPkg = PKG.SMALL;
        else if (v === "M") selectedPkg = PKG.MEDIUM;
        else if (v === "L") selectedPkg = PKG.LARGE;
        else selectedPkg = PKG.NONE;

        setPkgUI();
      });
    });
  }

  function bindUI() {
    renderContractsLine();

    EL.btnConnect?.addEventListener("click", connectWallet);

    EL.btnSideL?.addEventListener("click", () => { sideRight = false; setSideUI(); });
    EL.btnSideR?.addEventListener("click", () => { sideRight = true; setSideUI(); });

    EL.btnBuy?.addEventListener("click", approveAndBuy);

    EL.btnClaimBonus?.addEventListener("click", claimBonus);
    EL.btnClaimStake?.addEventListener("click", claimStake);
    EL.btnRefresh?.addEventListener("click", refreshDashboard);

    bindPkgButtons();

    // preload query (even before connect)
    const q = parseQuery();
    sponsorAddr = q.ref || "";
    sideRight = q.sideRight;

    if (EL.sponsor) EL.sponsor.textContent = sponsorAddr ? shortAddr(sponsorAddr) : "(ไม่มี)";
    setSideUI();
    updateReferralURL();
    setPkgUI();
    enableActions(false);

    setStatus("กด Connect Wallet เพื่อเริ่ม");
  }

  window.addEventListener("load", bindUI);
})();
