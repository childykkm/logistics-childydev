import { productService } from './productService';

interface ApproveParams {
    requestId: string;
    dbId: string;
    fetchData: () => Promise<any>;
    S_APPROVED: string;
    skipFetchData?: boolean;
}

interface RejectParams {
    requestId: string;
    updateSeeding: (id: string, patch: any, skipFetchData?: boolean) => Promise<void>;
    S_REJECTED: string;
    memo?: string;
    skipFetchData?: boolean;
}

export async function approveInventory({ dbId, fetchData, skipFetchData }: ApproveParams): Promise<void> {
    await productService.deductInventory(dbId, false);
    await new Promise(r => setTimeout(r, 1000));
    if (!skipFetchData) await fetchData();
}

export async function rejectInventory({ requestId, updateSeeding, S_REJECTED, memo, skipFetchData }: RejectParams): Promise<void> {
    await updateSeeding(requestId, {
        status: S_REJECTED,
        notes: memo || ''
    }, skipFetchData);
}
