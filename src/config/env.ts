import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  databasePath: process.env.DATABASE_PATH || './rewardbank.db',
  logLevel: process.env.LOG_LEVEL || 'info',
};