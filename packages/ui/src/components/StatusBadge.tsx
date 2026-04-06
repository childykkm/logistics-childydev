import React from 'react';
import { STATUS_COLORS, STATUS_LABEL, STATUS_MAP } from '@core/constants/status';

interface StatusBadgeProps {
    status: string;
    style?: React.CSSProperties;
}

/**
 * 상태 배지 공통 컴포넌트
 * @param {string} status - 영문 또는 한글 상태값
 * @param {object} style - 추가 스타일
 */
const StatusBadge = ({ status, style = {} }: StatusBadgeProps) => {
    // 영문이면 한글 코드로, 한글이면 그대로 사용
    const mappedStatus = STATUS_MAP[status] || status;
    const colorData = STATUS_COLORS[mappedStatus] || { bg: '#F3F4F6', text: '#111827' };
    const label = STATUS_LABEL[mappedStatus] || status;

    return (
        <span 
            className="badge" 
            style={{ 
                background: colorData.bg, 
                color: colorData.text,
                padding: '6px 12px',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                ...style 
            }}
        >
            {label}
        </span>
    );
};

export default StatusBadge;
