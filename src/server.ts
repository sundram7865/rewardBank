import app from './app';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate';
import logger from './utils/logger';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

// Run migrations before starting
runMigrations();

app.listen(PORT, () => {
  logger.info(`RewardBank server listening on port ${PORT}`);
});