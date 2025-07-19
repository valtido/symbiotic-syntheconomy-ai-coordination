import { ethers } from 'ethers';
import {
  GRC_RitualSubmission__factory,
  SymbiosisPledge__factory,
} from '../contracts/typechain-types';

export interface RitualSubmissionData {
  ipfsHash: string;
  bioregionId: string;
  author: string;
  esepScore: number;
  cedaScore: number;
  narrativeScore: number;
  isApproved: boolean;
}

export interface PledgeData {
  bioregionId: string;
  pledgeType: string;
  description: string;
  targetAmount: bigint;
  deadline: number;
}

export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  contractAddresses: {
    grcRitualSubmission: string;
    symbiosisPledge: string;
  };
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private grcContract: any;
  private pledgeContract: any;
  private isConnected: boolean = false;

  constructor() {
    const config = this.getConfig();

    try {
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);

      // Initialize contracts
      this.grcContract = GRC_RitualSubmission__factory.connect(
        config.contractAddresses.grcRitualSubmission,
        this.wallet,
      );

      this.pledgeContract = SymbiosisPledge__factory.connect(
        config.contractAddresses.symbiosisPledge,
        this.wallet,
      );

      this.isConnected = true;
      console.log('Blockchain service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      this.isConnected = false;
    }
  }

  private getConfig(): BlockchainConfig {
    return {
      rpcUrl: process.env.BASE_TESTNET_URL || 'https://sepolia.base.org',
      chainId: parseInt(process.env.BASE_TESTNET_CHAIN_ID || '84532'),
      privateKey: process.env.PRIVATE_KEY || '',
      contractAddresses: {
        grcRitualSubmission: process.env.GRC_CONTRACT_ADDRESS || '',
        symbiosisPledge: process.env.PLEDGE_CONTRACT_ADDRESS || '',
      },
    };
  }

  /**
   * Log ritual submission on blockchain
   */
  async logRitualSubmission(data: RitualSubmissionData): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Blockchain service not connected');
    }

    if (!this.grcContract) {
      throw new Error('GRC contract not initialized');
    }

    try {
      // Convert scores to contract format (multiply by 1000 for precision)
      const esepScore = Math.round(data.esepScore * 1000);
      const narrativeScore = Math.round(data.narrativeScore * 1000);

      // Submit transaction
      const tx = await this.grcContract.submitRitual(
        data.ipfsHash,
        data.bioregionId,
        data.author,
        esepScore,
        data.cedaScore,
        narrativeScore,
        data.isApproved,
        {
          gasLimit: 300000,
          gasPrice: await this.provider
            .getFeeData()
            .then((fee) => fee.gasPrice),
        },
      );

      console.log('Ritual submission transaction sent:', {
        hash: tx.hash,
        ipfsHash: data.ipfsHash,
        bioregionId: data.bioregionId,
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt?.status === 0) {
        throw new Error('Transaction failed');
      }

      console.log('Ritual submission confirmed:', {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
      });

      return tx.hash;
    } catch (error) {
      console.error('Failed to log ritual submission:', error);
      throw new Error(
        `Blockchain logging failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Create a new pledge on blockchain
   */
  async createPledge(data: PledgeData): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Blockchain service not connected');
    }

    if (!this.pledgeContract) {
      throw new Error('Pledge contract not initialized');
    }

    try {
      const tx = await this.pledgeContract.createPledge(
        data.bioregionId,
        data.pledgeType,
        data.description,
        data.targetAmount,
        data.deadline,
        {
          gasLimit: 400000,
          gasPrice: await this.provider
            .getFeeData()
            .then((fee) => fee.gasPrice),
        },
      );

      console.log('Pledge creation transaction sent:', {
        hash: tx.hash,
        bioregionId: data.bioregionId,
        pledgeType: data.pledgeType,
      });

      const receipt = await tx.wait();

      if (receipt?.status === 0) {
        throw new Error('Transaction failed');
      }

      console.log('Pledge creation confirmed:', {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
      });

      return tx.hash;
    } catch (error) {
      console.error('Failed to create pledge:', error);
      throw new Error(
        `Pledge creation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Fulfill a pledge on blockchain
   */
  async fulfillPledge(pledgeId: bigint, amount: bigint): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Blockchain service not connected');
    }

    if (!this.pledgeContract) {
      throw new Error('Pledge contract not initialized');
    }

    try {
      const tx = await this.pledgeContract.fulfillPledge(pledgeId, {
        value: amount,
        gasLimit: 200000,
        gasPrice: await this.provider.getFeeData().then((fee) => fee.gasPrice),
      });

      console.log('Pledge fulfillment transaction sent:', {
        hash: tx.hash,
        pledgeId: pledgeId.toString(),
        amount: ethers.formatEther(amount),
      });

      const receipt = await tx.wait();

      if (receipt?.status === 0) {
        throw new Error('Transaction failed');
      }

      console.log('Pledge fulfillment confirmed:', {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
      });

      return tx.hash;
    } catch (error) {
      console.error('Failed to fulfill pledge:', error);
      throw new Error(
        `Pledge fulfillment failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Get ritual submission from blockchain
   */
  async getRitualSubmission(ritualId: bigint): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Blockchain service not connected');
    }

    if (!this.grcContract) {
      throw new Error('GRC contract not initialized');
    }

    try {
      const ritual = await this.grcContract.getRitual(ritualId);
      return {
        ipfsHash: ritual.ipfsHash,
        bioregionId: ritual.bioregionId,
        author: ritual.author,
        esepScore: ritual.esepScore / 1000, // Convert back from contract format
        cedaScore: ritual.cedaScore,
        narrativeScore: ritual.narrativeScore / 1000,
        isApproved: ritual.isApproved,
        timestamp: ritual.timestamp,
      };
    } catch (error) {
      console.error('Failed to get ritual submission:', error);
      throw new Error(
        `Failed to retrieve ritual: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Get pledge from blockchain
   */
  async getPledge(pledgeId: bigint): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Blockchain service not connected');
    }

    if (!this.pledgeContract) {
      throw new Error('Pledge contract not initialized');
    }

    try {
      const pledge = await this.pledgeContract.getPledge(pledgeId);
      return {
        pledger: pledge.pledger,
        bioregionId: pledge.bioregionId,
        pledgeType: pledge.pledgeType,
        description: pledge.description,
        targetAmount: pledge.targetAmount,
        fulfilledAmount: pledge.fulfilledAmount,
        deadline: pledge.deadline,
        isFulfilled: pledge.isFulfilled,
        isVerified: pledge.isVerified,
        verifier: pledge.verifier,
        timestamp: pledge.timestamp,
      };
    } catch (error) {
      console.error('Failed to get pledge:', error);
      throw new Error(
        `Failed to retrieve pledge: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Get blockchain statistics
   */
  async getStatistics(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Blockchain service not connected');
    }

    try {
      const [grcStats, pledgeStats] = await Promise.all([
        this.grcContract ? this.grcContract.getStatistics() : null,
        this.pledgeContract ? this.pledgeContract.getStatistics() : null,
      ]);

      return {
        grc: grcStats
          ? {
              totalSubmissions: grcStats.totalSubmissions,
              approvedSubmissions: grcStats.approvedSubmissions,
              rejectedSubmissions: grcStats.rejectedSubmissions,
              approvalRate: grcStats.approvalRate / 1000, // Convert from contract format
            }
          : null,
        pledges: pledgeStats
          ? {
              totalPledges: pledgeStats.totalPledges,
              fulfilledPledges: pledgeStats.fulfilledPledges,
              partiallyFulfilledPledges: pledgeStats.partiallyFulfilledPledges,
              totalFulfilledAmount: pledgeStats.totalFulfilledAmount,
            }
          : null,
      };
    } catch (error) {
      console.error('Failed to get blockchain statistics:', error);
      throw new Error(
        `Failed to retrieve statistics: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Health check for blockchain connection
   */
  async healthCheck(): Promise<{
    connected: boolean;
    network?: string;
    error?: string;
  }> {
    if (!this.isConnected) {
      return { connected: false, error: 'Blockchain service not initialized' };
    }

    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();

      return {
        connected: true,
        network: network.name,
        blockNumber: blockNumber,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    if (!this.isConnected) {
      throw new Error('Blockchain service not connected');
    }

    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice || ethers.parseUnits('1', 'gwei');
    } catch (error) {
      console.error('Failed to get gas price:', error);
      return ethers.parseUnits('1', 'gwei'); // Fallback gas price
    }
  }

  /**
   * Estimate gas for ritual submission
   */
  async estimateRitualSubmissionGas(
    data: RitualSubmissionData,
  ): Promise<bigint> {
    if (!this.isConnected || !this.grcContract) {
      throw new Error('Blockchain service not connected');
    }

    try {
      const esepScore = Math.round(data.esepScore * 1000);
      const narrativeScore = Math.round(data.narrativeScore * 1000);

      const gasEstimate = await this.grcContract.submitRitual.estimateGas(
        data.ipfsHash,
        data.bioregionId,
        data.author,
        esepScore,
        data.cedaScore,
        narrativeScore,
        data.isApproved,
      );

      return gasEstimate;
    } catch (error) {
      console.error('Failed to estimate gas for ritual submission:', error);
      return ethers.parseUnits('300000', 'wei'); // Fallback gas limit
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Blockchain service not connected');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      console.error('Failed to get transaction receipt:', error);
      throw new Error(
        `Failed to get receipt: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
