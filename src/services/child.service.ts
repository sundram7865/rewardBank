import { ledgerService } from './ledger.service';

export class ChildService {
  getBalance(childId: string): number {
    return ledgerService.getBalance(childId);
  }

  getLedger(childId: string) {
    return ledgerService.getLedger(childId);
  }
}

export const childService = new ChildService();