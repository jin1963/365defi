window.APP_CONFIG = {
  /* =========================
     Network
  ========================== */
  CHAIN_ID_DEC: 56,
  CHAIN_ID_HEX: "0x38",
  CHAIN_NAME: "BSC Mainnet",
  EXPLORER: "https://bscscan.com",

  /* =========================
     Token Addresses
  ========================== */
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  DF:   "0x36579d7eC4b29e875E3eC21A55F71C822E03A992",

  /* =========================
     Contract Addresses
  ========================== */
  CORE:    "0x6e05bBECA09607b931118238fE6fd273bD63BeD9",
  VAULT:   "0x1240411B0F8691968a584559E6f22CA699A0e2Be",
  STAKING: "0x8083f255ea63e1e4a6ccaa618b1584c7235b72fc",

  /* =========================
     Packages
     enum: 1=Small, 2=Medium, 3=Large
  ========================== */
  PACKAGES: {
    S: { usdt: "100",   enum: 1 },
    M: { usdt: "1000",  enum: 2 },
    L: { usdt: "10000", enum: 3 },
  },

  /* =========================
     ABI Definitions
  ========================== */
  ABI: {
    /* ---------- ERC20 (USDT / 365df) ---------- */
    ERC20: [
      {
        "inputs":[
          {"internalType":"address","name":"owner","type":"address"},
          {"internalType":"address","name":"spender","type":"address"}
        ],
        "name":"allowance",
        "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
        "stateMutability":"view",
        "type":"function"
      },
      {
        "inputs":[
          {"internalType":"address","name":"spender","type":"address"},
          {"internalType":"uint256","name":"amount","type":"uint256"}
        ],
        "name":"approve",
        "outputs":[{"internalType":"bool","name":"","type":"bool"}],
        "stateMutability":"nonpayable",
        "type":"function"
      },
      {
        "inputs":[{"internalType":"address","name":"account","type":"address"}],
        "name":"balanceOf",
        "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
        "stateMutability":"view",
        "type":"function"
      },
      {
        "inputs":[],
        "name":"decimals",
        "outputs":[{"internalType":"uint8","name":"","type":"uint8"}],
        "stateMutability":"view",
        "type":"function"
      }
    ],

    /* ---------- MLMUsersCore ---------- */
    CORE: [
      {
        "inputs":[
          {"internalType":"address","name":"usdt","type":"address"},
          {"internalType":"address","name":"df","type":"address"},
          {"internalType":"address","name":"staking","type":"address"}
        ],
        "stateMutability":"nonpayable",
        "type":"constructor"
      },
      {
        "inputs":[
          {"internalType":"enum MLMUsersCore.Package","name":"newPkg","type":"uint8"},
          {"internalType":"address","name":"sponsor","type":"address"},
          {"internalType":"bool","name":"sideRight","type":"bool"}
        ],
        "name":"buyOrUpgrade",
        "outputs":[],
        "stateMutability":"nonpayable",
        "type":"function"
      },
      {
        "inputs":[{"internalType":"address","name":"u","type":"address"}],
        "name":"getUserCore",
        "outputs":[
          {"internalType":"address","name":"sponsor","type":"address"},
          {"internalType":"address","name":"parent","type":"address"},
          {"internalType":"bool","name":"sideRight","type":"bool"},
          {"internalType":"enum MLMUsersCore.Package","name":"pkg","type":"uint8"},
          {"internalType":"enum MLMUsersCore.Rank","name":"rank","type":"uint8"},
          {"internalType":"uint32","name":"directCount","type":"uint32"}
        ],
        "stateMutability":"view",
        "type":"function"
      },
      {
        "inputs":[{"internalType":"address","name":"u","type":"address"}],
        "name":"volumesOf",
        "outputs":[
          {"internalType":"uint256","name":"l","type":"uint256"},
          {"internalType":"uint256","name":"r","type":"uint256"},
          {"internalType":"uint256","name":"p","type":"uint256"}
        ],
        "stateMutability":"view",
        "type":"function"
      }
    ],

    /* ---------- MLMVault ---------- */
    VAULT: [
      {
        "inputs":[],
        "name":"claim",
        "outputs":[],
        "stateMutability":"nonpayable",
        "type":"function"
      },
      {
        "inputs":[{"internalType":"address","name":"","type":"address"}],
        "name":"earns",
        "outputs":[
          {"internalType":"uint256","name":"claimUSDT","type":"uint256"},
          {"internalType":"uint256","name":"claimDF","type":"uint256"},
          {"internalType":"uint256","name":"earnedEq","type":"uint256"},
          {"internalType":"uint256","name":"paidEq","type":"uint256"},
          {"internalType":"uint256","name":"lockedEq","type":"uint256"},
          {"internalType":"uint64","name":"lockedExpiry","type":"uint64"}
        ],
        "stateMutability":"view",
        "type":"function"
      }
    ],

    /* ---------- Staking365 ---------- */
    STAKING: [
      {
        "inputs":[{"internalType":"address","name":"user","type":"address"}],
        "name":"stakes",
        "outputs":[
          {"internalType":"enum Staking365.Package","name":"pkg","type":"uint8"},
          {"internalType":"uint256","name":"principal","type":"uint256"},
          {"internalType":"uint64","name":"start","type":"uint64"},
          {"internalType":"uint64","name":"end","type":"uint64"},
          {"internalType":"bool","name":"claimed","type":"bool"}
        ],
        "stateMutability":"view",
        "type":"function"
      },
      {
        "inputs":[{"internalType":"address","name":"user","type":"address"}],
        "name":"pendingReward",
        "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
        "stateMutability":"view",
        "type":"function"
      },
      {
        "inputs":[],
        "name":"claimStake",
        "outputs":[],
        "stateMutability":"nonpayable",
        "type":"function"
      }
    ]
  }
};
