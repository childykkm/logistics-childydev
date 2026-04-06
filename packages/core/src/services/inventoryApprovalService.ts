import { productService } from './productService';

interface ApproveParams {
    requestId: string;
    dbId: string;
    fetchData: () => Promise<any>;
    S_APPROVED: string;
}

interface RejectParams {
    requestId: string;
    updateSeeding: (id: string, patch: any) => Promise<void>;
    S_REJECTED: string;
    memo?: string;
}

// 재고 차감 후 백엔드가 상태를 approved로 자동 변경하므로 fetchData로 목록만 갱신
export async function approveInventory({ dbId, fetchData }: ApproveParams): Promise<void> {
    await productService.deductInventory(dbId, false);
    await fetchData();
}

export async function rejectInventory({ requestId, updateSeeding, S_REJECTED, memo }: RejectParams): Promise<void> {
    await updateSeeding(requestId, {
        status: S_REJECTED,
        notes: memo || ''
    });
}
