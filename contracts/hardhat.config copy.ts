import * as dotenv from "dotenv";
dotenv.config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import '@typechain/hardhat';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    'hardhat': {
      chainId: 31337,
    },
    'localhost': {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    'base-testnet': {
      url: process.env.BASE_TESTNET_URL || 'https://sepolia.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
      gasPrice: 1000000000, // 1 gwei
    },
    'base-mainnet': {
      url: process.env.BASE_MAINNET_URL || 'https://mainnet.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
      gasPrice: 1000000000, // 1 gwei
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: {
      'base-testnet': process.env.BASESCAN_API_KEY || '',
      'base-mainnet': process.env.BASESCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'base-testnet',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        network: 'base-mainnet',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    ritualSubmitter: {
      default: 1,
    },
    daoMember: {
      default: 2,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
    deploy: './deploy',
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;
