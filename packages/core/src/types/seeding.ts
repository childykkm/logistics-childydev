/**
 * 시딩 요청 데이터 규정 (UI 용 표준 규격)
 */
export interface Seeding {
    id: string;              // 요청번호 (주로 request_no)
    _dbId: number;           // DB 내 고유 식별자 (status 변경 시 필수)
    _itemId?: number;        // 아이템 단위 식별자
    brand: string;           // 브랜드명
    brand_id?: number | string; // 브랜드 DB ID
    status: string;          // 상태값 (한글로 관리: 대기, 리뷰중, 승인, 반려)
    hasStockIssue: boolean;  // 재고 이슈 여부
    date: string;            // 주문일자/요청일자 (YYYY-MM-DD)
    itemCode: string;        // 자사상품코드
    itemName: string;        // 상품명 (몰 노출용)
    option1: string;         // 옵션1 (색상 등)
    option2: string;         // 옵션2 (사이즈 등)
    option3: string;         // 옵션3
    qty: number | string;    // 주문수량
    price: number | string;  // 판매가
    paymentPrice: number | string; // 결제금액
    expectedPrice: number | string; // 정산예정금액
    orderName: string;       // 주문자명
    orderPhone: string;      // 주문자 휴대폰
    recipientName: string;   // 수취인명
    recipientPhone: string;  // 수취인 휴대폰
    zipcode: string;         // 우편번호
    address: string;         // 주소
    orderNo: string;         // 주문번호 (쇼핑몰 기준)
    memo: string;            // 비고/노트
    sellicCode: string;      // 상품코드 (셀릭)
    sellicOption: string;    // 옵션코드 (셀릭)
}

/**
 * 로그인 사용자 타입
 */
export interface User {
    id: number;
    userId: string;
    name: string;
    role: 'admin' | 'user' | string;
    brands?: any[]; // string[] | {id, name}[] 기반
}

/**
 * 브랜드 정보 타입
 */
export interface Brand {
    id: number;
    brand_id?: number | string;
    name: string;
    brand_name?: string;
    mall_id: string;
    description: string;
    is_connected: string | number;
}
