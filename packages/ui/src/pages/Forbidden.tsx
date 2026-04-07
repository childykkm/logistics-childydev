import { ShieldOff } from 'lucide-react';

export default function Forbidden() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', color: 'var(--text-muted)' }}>
            <ShieldOff size={56} color="var(--danger)" style={{ opacity: 0.7 }} />
            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem' }}>접근 권한이 없습니다</h2>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>이 페이지는 관리자만 접근할 수 있습니다.</p>
            <button className="btn btn-primary" onClick={() => { window.location.href = '/'; }}>
                대시보드로 돌아가기
            </button>
        </div>
    );
}
