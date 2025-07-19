import { create } from 'ipfs-http-client';

export interface IPFSMetadata {
  name: string;
  bioregionId: string;
  description: string;
  culturalContext: string;
  content: string;
  author: string;
  culturalReferences: string[];
  permissions: {
    culturalConsultation: boolean;
    communityApproval: boolean;
    expertReview: boolean;
  };
  validation: {
    esepScore: number;
    cedaScore: number;
    narrativeScore: number;
    isApproved: boolean;
    feedback: string[];
    culturalReferences: string[];
    validationTimestamp: string;
  };
  submittedAt: string;
  version: string;
}

export interface IPFSResult {
  hash: string;
  size: number;
  timestamp: string;
}

export class IPFSService {
  private ipfs: any;
  private isConnected: boolean = false;

  constructor() {
    // Initialize IPFS client
    const ipfsConfig = {
      host: process.env.IPFS_HOST || 'ipfs.infura.io',
      port: parseInt(process.env.IPFS_PORT || '5001'),
      protocol: process.env.IPFS_PROTOCOL || 'https',
      headers: {
        authorization: process.env.IPFS_AUTH_TOKEN
          ? `Basic ${process.env.IPFS_AUTH_TOKEN}`
          : undefined,
      },
    };

    try {
      this.ipfs = create(ipfsConfig);
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to initialize IPFS client:', error);
      this.isConnected = false;
    }
  }

  /**
   * Store ritual metadata on IPFS
   */
  async storeMetadata(metadata: IPFSMetadata): Promise<string> {
    if (!this.isConnected) {
      throw new Error('IPFS client not connected');
    }

    try {
      // Convert metadata to JSON string
      const jsonData = JSON.stringify(metadata, null, 2);

      // Add to IPFS
      const result = await this.ipfs.add(jsonData, {
        pin: true,
        cidVersion: 1,
      });

      console.log('Metadata stored on IPFS:', {
        hash: result.cid.toString(),
        size: result.size,
        timestamp: new Date().toISOString(),
      });

      return result.cid.toString();
    } catch (error) {
      console.error('Failed to store metadata on IPFS:', error);
      throw new Error(
        `IPFS storage failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Retrieve metadata from IPFS
   */
  async retrieveMetadata(hash: string): Promise<IPFSMetadata> {
    if (!this.isConnected) {
      throw new Error('IPFS client not connected');
    }

    try {
      // Get data from IPFS
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.ipfs.cat(hash)) {
        chunks.push(chunk);
      }

      // Combine chunks and parse JSON
      const data = Buffer.concat(chunks).toString('utf-8');
      const metadata = JSON.parse(data) as IPFSMetadata;

      return metadata;
    } catch (error) {
      console.error('Failed to retrieve metadata from IPFS:', error);
      throw new Error(
        `IPFS retrieval failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Store ritual content file on IPFS
   */
  async storeContent(content: string, filename: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('IPFS client not connected');
    }

    try {
      // Create file object
      const file = {
        path: filename,
        content: Buffer.from(content, 'utf-8'),
      };

      // Add to IPFS
      const result = await this.ipfs.add(file, {
        pin: true,
        cidVersion: 1,
      });

      console.log('Content stored on IPFS:', {
        hash: result.cid.toString(),
        filename,
        size: result.size,
      });

      return result.cid.toString();
    } catch (error) {
      console.error('Failed to store content on IPFS:', error);
      throw new Error(
        `IPFS content storage failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Pin content on IPFS to ensure persistence
   */
  async pinContent(hash: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('IPFS client not connected');
    }

    try {
      await this.ipfs.pin.add(hash);
      console.log('Content pinned on IPFS:', hash);
    } catch (error) {
      console.error('Failed to pin content on IPFS:', error);
      // Don't throw error for pinning failures as content might already be pinned
    }
  }

  /**
   * Check if content exists on IPFS
   */
  async contentExists(hash: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      // Try to get file stats
      const stats = await this.ipfs.files.stat(`/ipfs/${hash}`);
      return stats && stats.cid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get IPFS gateway URL for content
   */
  getGatewayUrl(hash: string): string {
    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';
    return `${gateway}/${hash}`;
  }

  /**
   * Health check for IPFS connection
   */
  async healthCheck(): Promise<{ connected: boolean; error?: string }> {
    if (!this.isConnected) {
      return { connected: false, error: 'IPFS client not initialized' };
    }

    try {
      // Try to get IPFS version as a simple health check
      const version = await this.ipfs.version();
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Store multiple files in a directory structure
   */
  async storeDirectory(
    files: Array<{ path: string; content: string }>,
  ): Promise<string> {
    if (!this.isConnected) {
      throw new Error('IPFS client not connected');
    }

    try {
      const fileObjects = files.map((file) => ({
        path: file.path,
        content: Buffer.from(file.content, 'utf-8'),
      }));

      let lastResult;
      for await (const result of this.ipfs.addAll(fileObjects, {
        pin: true,
        cidVersion: 1,
      })) {
        lastResult = result;
      }

      console.log('Directory stored on IPFS:', {
        hash: lastResult?.cid.toString(),
        fileCount: files.length,
      });

      return lastResult?.cid.toString() || '';
    } catch (error) {
      console.error('Failed to store directory on IPFS:', error);
      throw new Error(
        `IPFS directory storage failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Get file size from IPFS
   */
  async getFileSize(hash: string): Promise<number> {
    if (!this.isConnected) {
      throw new Error('IPFS client not connected');
    }

    try {
      const stats = await this.ipfs.files.stat(`/ipfs/${hash}`);
      return stats.size || 0;
    } catch (error) {
      console.error('Failed to get file size from IPFS:', error);
      return 0;
    }
  }

  /**
   * Validate IPFS hash format
   */
  static isValidHash(hash: string): boolean {
    // Basic CID validation (CIDv0 or CIDv1)
    const cidRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^bafy[a-z2-7]{55}$/;
    return cidRegex.test(hash);
  }

  /**
   * Generate IPFS hash for content (without storing)
   */
  async generateHash(content: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('IPFS client not connected');
    }

    try {
      const result = await this.ipfs.util.cid(Buffer.from(content, 'utf-8'));
      return result.toString();
    } catch (error) {
      console.error('Failed to generate IPFS hash:', error);
      throw new Error(
        `Hash generation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
