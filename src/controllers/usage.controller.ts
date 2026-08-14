import { Response } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { usageService } from '../services/usage.service';

export class UsageController {
  async reportUsage(req: AuthenticatedRequest, res: Response) {
    const childId = String(req.params.id);
    const sessions = req.body.sessions;
    const results = await usageService.processBatch(childId, sessions);
    res.json({ results });
  }
}

export const usageController = new UsageController();