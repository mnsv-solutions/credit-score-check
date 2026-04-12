import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export class PrismaService extends PrismaClient {
  constructor() {
    const url = PrismaService.getDatabaseUrl();
    const adapter = new PrismaPg(url);
    super({ adapter });
  }

  private static getDatabaseUrl(): string {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    return url;
  }

  public async connect(): Promise<void> {
    await this.$connect();
    console.log("Connected to database...");
  }

  public async disconnect(): Promise<void> {
    await this.$disconnect();
    console.log("Disconnected from database...");
  }
}
