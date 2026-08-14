import { Router } from 'express';
import taskRoutes from './task.routes';
import usageRoutes from './usage.routes';
import childRoutes from './child.routes';

const router = Router();

router.use('/tasks', taskRoutes);
router.use('/children', usageRoutes);
router.use('/children', childRoutes);

export default router;