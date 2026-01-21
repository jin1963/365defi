// config.js
window.APP_CONFIG = {
  CHAIN_ID_DEC: 56,
  CHAIN_ID_HEX: "0x38",
  CHAIN_NAME: "BSC Mainnet",
  RPC_URL: "https://bsc-dataseed.binance.org/",
  BLOCK_EXPLORER: "https://bscscan.com",

  // Tokens
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  DF:   "0x36579d7eC4b29e875E3eC21A55F71C822E03A992",

  // Contracts
  STAKING:     "0x8083f255ea63e1e4a6ccaa618b1584c7235b72fc",
  VAULT:       "0x1240411B0F8691968a584559E6f22CA699A0e2Be",
  CORE:        "0x6e05bBECA09607b931118238fE6fd273bD63BeD9",
  PAYOUTA:     "0xD4bcaeC784a58462f6D04e1Fe28F7d9fA7Ebff1",
  BINARY:      "0xfE54B17bc476d799fE960328B5dC51c9004980a5",

  // ===== ABIs =====
  ABI: {
    ERC20: [
      {"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"type":"function"},
      {"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"},
      {"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"},
      {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
      {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"}
    ],

    STAKING: [{"inputs":[{"internalType":"address","name":"df","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"mlm","type":"address"}],"name":"MLMSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"principal","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"}],"name":"StakeClaimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"enum Staking365.Package","name":"pkg","type":"uint8"},{"indexed":false,"internalType":"uint256","name":"principal","type":"uint256"},{"indexed":false,"internalType":"uint64","name":"start","type":"uint64"},{"indexed":false,"internalType":"uint64","name":"end","type":"uint64"}],"name":"StakedFor","type":"event"},{"inputs":[],"name":"claimStake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"pendingReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"enum Staking365.Package","name":"pkg","type":"uint8"},{"internalType":"uint256","name":"principal","type":"uint256"}],"name":"stakeFor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"stakes","outputs":[{"internalType":"enum Staking365.Package","name":"pkg","type":"uint8"},{"internalType":"uint256","name":"principal","type":"uint256"},{"internalType":"uint64","name":"start","type":"uint64"},{"internalType":"uint64","name":"end","type":"uint64"},{"internalType":"bool","name":"claimed","type":"bool"}],"stateMutability":"view","type":"function"}],

    CORE: [{"inputs":[{"internalType":"address","name":"usdt","type":"address"},{"internalType":"address","name":"df","type":"address"},{"internalType":"address","name":"staking","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"enum MLMUsersCore.Package","name":"pkg","type":"uint8"},{"indexed":false,"internalType":"uint256","name":"usdtAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dfPrincipal","type":"uint256"}],"name":"Bought","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"sponsor","type":"address"},{"indexed":false,"internalType":"bool","name":"sideRight","type":"bool"}],"name":"Registered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"vault","type":"address"},{"indexed":false,"internalType":"address","name":"payoutA","type":"address"},{"indexed":false,"internalType":"address","name":"binary","type":"address"}],"name":"Wired","type":"event"},{"inputs":[{"internalType":"enum MLMUsersCore.Package","name":"newPkg","type":"uint8"},{"internalType":"address","name":"sponsor","type":"address"},{"internalType":"bool","name":"sideRight","type":"bool"}],"name":"buyOrUpgrade","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"u","type":"address"}],"name":"getUserCore","outputs":[{"internalType":"address","name":"sponsor","type":"address"},{"internalType":"address","name":"parent","type":"address"},{"internalType":"bool","name":"sideRight","type":"bool"},{"internalType":"enum MLMUsersCore.Package","name":"pkg","type":"uint8"},{"internalType":"enum MLMUsersCore.Rank","name":"rank","type":"uint8"},{"internalType":"uint32","name":"directCount","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"USDT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"vault","type":"address"},{"internalType":"address","name":"payoutA","type":"address"},{"internalType":"address","name":"binary","type":"address"}],"name":"wire","outputs":[],"stateMutability":"nonpayable","type":"function"}],

    VAULT: [{"inputs":[{"internalType":"address","name":"usdt","type":"address"},{"internalType":"address","name":"df","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdtAmt","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dfAmt","type":"uint256"}],"name":"Claimed","type":"event"},{"inputs":[],"name":"claim","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"earns","outputs":[{"internalType":"uint256","name":"claimUSDT","type":"uint256"},{"internalType":"uint256","name":"claimDF","type":"uint256"},{"internalType":"uint256","name":"earnedEq","type":"uint256"},{"internalType":"uint256","name":"paidEq","type":"uint256"},{"internalType":"uint256","name":"lockedEq","type":"uint256"},{"internalType":"uint64","name":"lockedExpiry","type":"uint64"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_core","type":"address"},{"internalType":"address","name":"_payoutA","type":"address"},{"internalType":"address","name":"_binary","type":"address"}],"name":"wire","outputs":[],"stateMutability":"nonpayable","type":"function"}],

    PAYOUTA: [{"inputs":[{"internalType":"address","name":"core","type":"address"},{"internalType":"address","name":"vault","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"buyer","type":"address"},{"internalType":"uint256","name":"baseUSDT","type":"uint256"}],"name":"processDirect","outputs":[],"stateMutability":"nonpayable","type":"function"}],

    BINARY: [{"inputs":[{"internalType":"address","name":"core","type":"address"},{"internalType":"address","name":"vault","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"buyer","type":"address"},{"internalType":"uint256","name":"volEq","type":"uint256"}],"name":"processBinary","outputs":[],"stateMutability":"nonpayable","type":"function"}],
  },

  // Packages (UI ใช้)
  PACKAGES: [
    { key: "SMALL",  label: "Small",  usdt: "100",   pkgId: 0 },
    { key: "MEDIUM", label: "Medium", usdt: "1000",  pkgId: 1 },
    { key: "LARGE",  label: "Large",  usdt: "10000", pkgId: 2 },
  ],
};
