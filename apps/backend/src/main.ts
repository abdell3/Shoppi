import "reflect-metadata";
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './common/utils/logger';
import { globalErrorHandler } from './core/filters/error.filter';

async function bootstrap() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // Healthcheck
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Gestionnaire d'erreurs global
  app.use(globalErrorHandler);

  app.listen(env.PORT, () => {
    logger.info(`🚀 Shoppi Backend tournant sur http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error("Échec du démarrage du serveur");
  logger.error(err);
  process.exit(1);
});