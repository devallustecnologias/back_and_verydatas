import { LedgerType, LedgerOrigin } from '../ledger.entity';
export declare class CreateLedgerDto {
    amount: number;
    type: LedgerType;
    description: string;
    origin?: LedgerOrigin;
    referenceId?: string;
    walletId: string;
}
