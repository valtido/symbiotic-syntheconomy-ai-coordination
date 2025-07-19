import { MongoClient, Db, Collection } from 'mongodb';

export interface RitualDocument {
  _id?: string;
  ritualId: string;
  name: string;
  bioregionId: string;
  ipfsHash: string;
  transactionHash: string;
  validation: {
    esepScore: number;
    cedaScore: number;
    isApproved: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BioregionDocument {
  _id?: string;
  bioregionId: string;
  name: string;
  description: string;
  registrar: string;
  registrationTimestamp: Date;
  ritualCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private ritualsCollection: Collection<RitualDocument> | null = null;
  private bioregionsCollection: Collection<BioregionDocument> | null = null;

  async connect(): Promise<void> {
    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MONGODB_URI environment variable is required');
      }

      this.client = new MongoClient(uri);
      await this.client.connect();

      this.db = this.client.db(process.env.MONGODB_DATABASE || 'grc');
      this.ritualsCollection = this.db.collection<RitualDocument>('rituals');
      this.bioregionsCollection =
        this.db.collection<BioregionDocument>('bioregions');

      // Create indexes
      await this.createIndexes();

      console.log('Connected to MongoDB Atlas');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.ritualsCollection || !this.bioregionsCollection) {
      throw new Error('Collections not initialized');
    }

    // Rituals collection indexes
    await this.ritualsCollection.createIndex({ ritualId: 1 }, { unique: true });
    await this.ritualsCollection.createIndex({ bioregionId: 1 });
    await this.ritualsCollection.createIndex({ createdAt: -1 });
    await this.ritualsCollection.createIndex({ 'validation.isApproved': 1 });

    // Bioregions collection indexes
    await this.bioregionsCollection.createIndex(
      { bioregionId: 1 },
      { unique: true },
    );
    await this.bioregionsCollection.createIndex({ isActive: 1 });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.ritualsCollection = null;
      this.bioregionsCollection = null;
    }
  }

  // Ritual operations
  async createRitual(
    ritualData: Omit<RitualDocument, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    if (!this.ritualsCollection) {
      throw new Error('Database not connected');
    }

    const now = new Date();
    const ritual: RitualDocument = {
      ...ritualData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.ritualsCollection.insertOne(ritual);
    return result.insertedId.toString();
  }

  async getRitualById(ritualId: string): Promise<RitualDocument | null> {
    if (!this.ritualsCollection) {
      throw new Error('Database not connected');
    }

    return await this.ritualsCollection.findOne({ ritualId });
  }

  async getRitualsByBioregion(bioregionId: string): Promise<RitualDocument[]> {
    if (!this.ritualsCollection) {
      throw new Error('Database not connected');
    }

    return await this.ritualsCollection
      .find({ bioregionId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async updateRitual(
    ritualId: string,
    updates: Partial<RitualDocument>,
  ): Promise<boolean> {
    if (!this.ritualsCollection) {
      throw new Error('Database not connected');
    }

    const result = await this.ritualsCollection.updateOne(
      { ritualId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  async getRitualStatistics(): Promise<{
    totalRituals: number;
    approvedRituals: number;
    bioregionCounts: Record<string, number>;
  }> {
    if (!this.ritualsCollection) {
      throw new Error('Database not connected');
    }

    const totalRituals = await this.ritualsCollection.countDocuments();
    const approvedRituals = await this.ritualsCollection.countDocuments({
      'validation.isApproved': true,
    });

    const bioregionCounts = await this.ritualsCollection
      .aggregate([
        {
          $group: {
            _id: '$bioregionId',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const bioregionCountsMap: Record<string, number> = {};
    bioregionCounts.forEach((item) => {
      bioregionCountsMap[item._id] = item.count;
    });

    return {
      totalRituals,
      approvedRituals,
      bioregionCounts: bioregionCountsMap,
    };
  }

  // Bioregion operations
  async createBioregion(
    bioregionData: Omit<BioregionDocument, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    if (!this.bioregionsCollection) {
      throw new Error('Database not connected');
    }

    const now = new Date();
    const bioregion: BioregionDocument = {
      ...bioregionData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.bioregionsCollection.insertOne(bioregion);
    return result.insertedId.toString();
  }

  async getBioregionById(
    bioregionId: string,
  ): Promise<BioregionDocument | null> {
    if (!this.bioregionsCollection) {
      throw new Error('Database not connected');
    }

    return await this.bioregionsCollection.findOne({ bioregionId });
  }

  async getAllBioregions(): Promise<BioregionDocument[]> {
    if (!this.bioregionsCollection) {
      throw new Error('Database not connected');
    }

    return await this.bioregionsCollection
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();
  }

  async updateBioregion(
    bioregionId: string,
    updates: Partial<BioregionDocument>,
  ): Promise<boolean> {
    if (!this.bioregionsCollection) {
      throw new Error('Database not connected');
    }

    const result = await this.bioregionsCollection.updateOne(
      { bioregionId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  async incrementBioregionRitualCount(bioregionId: string): Promise<boolean> {
    if (!this.bioregionsCollection) {
      throw new Error('Database not connected');
    }

    const result = await this.bioregionsCollection.updateOne(
      { bioregionId },
      {
        $inc: { ritualCount: 1 },
        $set: { updatedAt: new Date() },
      },
    );

    return result.modifiedCount > 0;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }

      await this.db.admin().ping();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Backup and maintenance
  async backup(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // This would implement actual backup logic
    // For now, just log the backup request
    console.log('Backup requested for database:', this.db.databaseName);
  }

  async cleanup(): Promise<void> {
    if (!this.ritualsCollection || !this.bioregionsCollection) {
      throw new Error('Database not connected');
    }

    // Clean up old data (example: rituals older than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await this.ritualsCollection.deleteMany({
      createdAt: { $lt: oneYearAgo },
    });

    console.log(`Cleaned up ${result.deletedCount} old rituals`);
  }
}
