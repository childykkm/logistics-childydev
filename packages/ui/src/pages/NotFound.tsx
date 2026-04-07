import { ShieldOff } from 'lucide-react';

export default function NotFound() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', color: 'var(--text-muted)' }}>
            <ShieldOff size={56} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem' }}>페이지를 찾을 수 없습니다</h2>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>존재하지 않는 주소입니다.</p>
            <button className="btn btn-primary" onClick={() => { window.location.href = '/'; }}>
                대시보드로 돌아가기
            </button>
        </div>
    );
}
