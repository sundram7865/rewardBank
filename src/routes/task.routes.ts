import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { validate } from '../middleware/validate';
import { createTaskSchema, taskIdParamSchema } from '../validators/task.validator';
import {
  requireParent,
  requireChild,
  requireParentOwnsChild,
  requireParentOwnsTask,
} from '../middleware/authorize';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requireParent,
  validate(createTaskSchema),
  requireParentOwnsChild,
  (req, res) => taskController.createTask(req, res)
);

router.post(
  '/:id/done',
  requireChild,
  validate(taskIdParamSchema),
  (req, res) => taskController.markDone(req, res)
);

router.post(
  '/:id/approve',
  requireParent,
  requireParentOwnsTask,          // <-- added
  validate(taskIdParamSchema),
  asyncHandler((req, res) => taskController.approve(req, res))
);

router.post(
  '/:id/reject',
  requireParent,
  requireParentOwnsTask,          // <-- added
  validate(taskIdParamSchema),
  asyncHandler((req, res) => taskController.reject(req, res))
);

router.post(
  '/:id/undo',
  requireParent,
  requireParentOwnsTask,          // <-- added
  validate(taskIdParamSchema),
  asyncHandler((req, res) => taskController.undo(req, res))
);

export default router;