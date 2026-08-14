import { Response } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { childService } from '../services/child.service';

export class ChildController {
  getBalance(req: AuthenticatedRequest, res: Response) {
    const childId = String(req.params.id);
    const balance = childService.getBalance(childId);
    res.json({ balance });
  }

  getLedger(req: AuthenticatedRequest, res: Response) {
    const childId = String(req.params.id);
    const entries = childService.getLedger(childId);
    res.json({ entries });
  }
}

export const childController = new ChildController();