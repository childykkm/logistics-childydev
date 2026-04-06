import React, { ReactNode, FC, CSSProperties } from 'react';

/**
 * 전역 카드 컴포넌트 속성 정의
 */
export interface CardProps {
    title?: string | ReactNode;
    children: ReactNode;
    headerAction?: ReactNode;
    style?: CSSProperties;
    className?: string;
    [key: string]: any; 
}

/**
 * 공통 카드 컴포넌트 (FC 타입 명시)
 */
export const Card: FC<CardProps> = ({ 
    title, 
    children, 
    style = {}, 
    className = '', 
    headerAction, 
    ...props 
}) => {
    return (
        <div className={`card ${className}`} style={{ padding: '24px', marginBottom: '16px', ...style }} {...props}>
            {(title || headerAction) && (
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    {title && (typeof title === 'string' ? <h3 style={{ margin: 0 }}>{title}</h3> : title)}
                    {headerAction && <div>{headerAction}</div>}
                </div>
            )}
            {children}
        </div>
    );
};

/**
 * 페이지 헤더 컴포넌트 속성 정의
 */
export interface PageHeaderProps {
    title: string | ReactNode;
    description?: string | ReactNode;
    children?: ReactNode;
    background?: string;
    color?: string;
}

/**
 * 페이지 최상단 헤더 컴포넌트 (FC 타입 명시)
 */
export const PageHeader: FC<PageHeaderProps> = ({ 
    title, 
    description, 
    children, 
    background, 
    color = 'white' 
}) => {
    return (
        <div className="card" style={{ 
            background: background || 'var(--primary)', 
            color: color, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '16px', 
            marginBottom: '24px',
            padding: '24px'
        }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, marginBottom: description ? '8px' : 0 }}>{title}</h2>
                {description && <p style={{ opacity: 0.9, fontSize: '0.9375rem', margin: 0 }}>{description}</p>}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {children}
            </div>
        </div>
    );
};
