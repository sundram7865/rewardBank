import { Router } from 'express';
import { usageController } from '../controllers/usage.controller';
import { validate } from '../middleware/validate';
import { usageBatchSchema } from '../validators/usage.validator';
import { authenticate } from '../middleware/authenticate';
import { requireChildOwnership } from '../middleware/authorize';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.post(
  '/:id/usage',
  requireChildOwnership,
  validate(usageBatchSchema),
  asyncHandler((req, res) => usageController.reportUsage(req, res))
);

export default router;