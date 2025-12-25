import { Request, Response, NextFunction } from 'express';
import { logger } from '../../common/utils/logger';

export const globalErrorHandler = (
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  logger.error(err);

  // Erreur de contrainte unique Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      statusCode: 409,
      message: 'Une ressource avec ces données existe déjà.',
    });
  }

  // Erreur par défaut
  res.status(err.status || 500).json({
    statusCode: err.status || 500,
    message: err.message || 'Erreur interne du serveur',
  });
};