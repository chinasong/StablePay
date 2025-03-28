require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    ethf: {
      url: "https://rpc.etherfair.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 513100,
    },
  },
}; 