import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';


@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({
      log: ['info', 'warn', 'error'],
      adapter 
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Exécute une transaction Prisma avec garantie de rollback en cas d'erreur.
   * 
   * @param callback Fonction transactionnelle typée
   * @returns Résultat typé de la transaction
   * @throws Toute exception provoque un rollback automatique
   */
  async executeTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.$transaction(callback, {
        maxWait: 5000, 
        timeout: 10000, 
      });
    } catch (error) {
      this.logger.error(
        `Transaction failed and rolled back: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error; 
    }
  }
}