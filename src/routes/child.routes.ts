import { Router } from 'express';
import { childController } from '../controllers/child.controller';
import { authenticate } from '../middleware/authenticate';
import { requireChildOwnership } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get(
  '/:id/balance',
  requireChildOwnership,
  childController.getBalance
);

router.get(
  '/:id/ledger',
  requireChildOwnership,
  childController.getLedger
);

export default router;