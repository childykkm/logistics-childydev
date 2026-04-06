import { productService } from './productService';

interface ApproveParams {
    requestId: string;
    dbId: string;
    updateSeeding: (id: string, patch: any) => Promise<void>;
    S_APPROVED: string;
}

interface RejectParams {
    requestId: string;
    updateSeeding: (id: string, patch: any) => Promise<void>;
    S_REJECTED: string;
    memo?: string; // 반려 사유 추가
}

/**
 * 시딩 요청건을 승인합니다.
 * 1단계: 재고 차감 API 호출 (deductInventory)
 * 2단계: 상태값 S_APPROVED 업데이트
 */
export async function approveInventory({ requestId, dbId, updateSeeding, S_APPROVED }: ApproveParams): Promise<void> {
    console.log(`[승인 프로세스 시작] 요청 ID: ${requestId}, DB ID: ${dbId}`);

    // 1단계: 재고 차감
    console.log('[1/2단계] 재고 차감 API 호출 중...');
    const deductResult = await productService.deductInventory(dbId, false);
    console.log('[1/2단계 완료] 재고 차감 API 응답:', deductResult);

    // 2단계: 상태값 업데이트
    console.log('[2/2단계] 상태값 승인(S_APPROVED) 업데이트 중...');
    await updateSeeding(requestId, { status: S_APPROVED });
    console.log('[2/2단계 완료] 상태 업데이트 성공');

    console.log('[승인 프로세스 최종 완료]');
}

/**
 * 시딩 요청건을 반려합니다.
 * 반려 사유(memo)가 있는 경우 notes 필드에 함께 반영합니다.
 */
export async function rejectInventory({ requestId, updateSeeding, S_REJECTED, memo }: RejectParams): Promise<void> {
    await updateSeeding(requestId, { 
        status: S_REJECTED,
        notes: memo || '' // 반려 사유가 있으면 notes에 저장
    });
}
