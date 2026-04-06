// 상태값 상수
export const S_PENDING   = '대기';
export const S_REVIEWING = '검토중';
export const S_APPROVED  = '승인';
export const S_ORDERED   = '발주완료';
export const S_SHIPPED   = '출고완료';
export const S_REJECTED  = '반려';

export interface StatusStyle {
    bg: string;
    text: string;
    chart: string;
}

export const STATUS_COLORS: Record<string, StatusStyle> = {
    [S_PENDING]:   { bg: '#FFFBEB', text: '#B45309', chart: '#F59E0B' },
    [S_REVIEWING]: { bg: '#FFEDD5', text: '#C2410C', chart: '#F97316' },
    [S_APPROVED]:  { bg: '#DBEAFE', text: '#1D4ED8', chart: '#3B82F6' },
    [S_ORDERED]:   { bg: '#CCFBF1', text: '#0F766E', chart: '#14B8A6' },
    [S_SHIPPED]:   { bg: '#EDE9FE', text: '#6D28D9', chart: '#8B5CF6' },
    [S_REJECTED]:  { bg: '#FEE2E2', text: '#DC2626', chart: '#EF4444' },
};

// 서버 영문 status → 한글 변환
export const STATUS_MAP: Record<string, string> = {
    pending:   S_PENDING,
    reviewing: S_REVIEWING,
    approved:  S_APPROVED,
    ordered:   S_ORDERED,
    shipped:   S_SHIPPED,
    rejected:  S_REJECTED,
};

// 한글 → 서버 영문 역변환
export const STATUS_MAP_TO_ENG: Record<string, string> = {
    [S_PENDING]:   'pending',
    [S_REVIEWING]: 'reviewing',
    [S_APPROVED]:  'approved',
    [S_ORDERED]:   'ordered',
    [S_SHIPPED]:   'shipped',
    [S_REJECTED]:  'rejected',
};

// 화면 표시용 레이블
export const STATUS_LABEL: Record<string, string> = {
    [S_PENDING]:   S_PENDING,
    [S_REVIEWING]: S_REVIEWING,
    [S_APPROVED]:  S_APPROVED,
    [S_ORDERED]:   S_ORDERED,
    [S_SHIPPED]:   S_SHIPPED,
    [S_REJECTED]:  S_REJECTED,
};

export const STATUS_LIST = Object.keys(STATUS_COLORS);
