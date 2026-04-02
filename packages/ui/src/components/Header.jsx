import { useContext, useState } from 'react';
import { Bell, Search, Menu, X, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '@core/contexts/AppContext';
import { authService } from '@core/services/authService';
import { userService } from '@core/services/userService';

export default function Header({ toggleSidebar }) {
    const location = useLocation();
    const { globalSearch, setGlobalSearch, currentUser, setCurrentUser, updateAccount, logout, openEditAccount } = useContext(AppContext);
    const [isMyPageOpen, setIsMyPageOpen] = useState(false);

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/':
            case '/seeding': return '시딩 목록 / 현황';
            case '/seeding/request': return '시딩 요청 등록';
            case '/seeding/inventory': return '재고 보정 확인';
            case '/seeding/shipment': return '시딩 발주 및 출고 관리';
            case '/admin': return '계정 및 권한 관리';
            case '/brands': return '브랜드 관리';
            case '/settings': return '시스템 설정';
            default:
                if (location.pathname.startsWith('/seeding/detail')) return '시딩 상세/수정';
                return '통합 물류 시스템 (OMS)';
        }
    };

    const handleMyPageOpen = async () => {
        try {
            const res = await userService.getUsers();
            const list = Array.isArray(res) ? res : (res?.data || res?.users || []);
            const me = list.find(u => u.id === currentUser?.id || u.id === currentUser?.user_id);
            if (me) openEditAccount(me);
            else openEditAccount(currentUser);
        } catch {
            openEditAccount(currentUser);
        }
    };

    const handleSaveMyPage = () => {}; // 사용 안 함 - EditAccountModal로 대체됨

    return (
        <>
            <header className="header" style={{ padding: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                    <button
                        className="btn btn-outline"
                        onClick={toggleSidebar}
                        style={{ padding: '8px', border: 'none', background: 'transparent', flexShrink: 0 }}
                        id="mobile-menu-btn"
                    >
                        <Menu size={24} color="var(--text-muted)" />
                    </button>
                    <div className="header-title" style={{ fontSize: '1.125rem' }}>
                        {getPageTitle()}
                    </div>
                </div>

                <div className="header-profile" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                {/* 알림 기능 - 백엔드 API 구현 전까지 hide */}
                {false && (
                    <div style={{ position: 'relative', cursor: 'pointer' }} className="desktop-profile-info">
                        <Bell size={24} color="var(--text-muted)" />
                        <span style={{
                            position: 'absolute', top: '-2px', right: '-2px',
                            background: 'var(--danger)', width: '8px', height: '8px', borderRadius: '50%'
                        }}></span>
                    </div>
                )}
                    <div
                        className="avatar"
                        style={{ cursor: 'pointer' }}
                        onClick={handleMyPageOpen}
                    >
                        {currentUser?.name ? currentUser.name.slice(0, 1) : '?'}
                    </div>
                    <div
                        className="desktop-profile-info"
                        style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem', cursor: 'pointer' }}
                        onClick={handleMyPageOpen}
                    >
                        <span style={{ fontWeight: 600 }}>{currentUser?.name || '로그인 필요'}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{currentUser?.role || '-'}</span>
                    </div>
                </div>

                <style>{`
          @media (min-width: 769px) {
            #mobile-menu-btn {
              display: none !important;
            }
          }
          @media (max-width: 768px) {
            .desktop-search, .desktop-profile-info {
              display: none !important;
            }
          }
        `}</style>
            </header>

            {/* 로그아웃 확인 모달 */}
            {isMyPageOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '320px', borderRadius: '12px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={20} />
                                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{currentUser?.name}</h3>
                            </div>
                            <button onClick={() => setIsMyPageOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>{currentUser?.email}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button className="btn" style={{ color: 'var(--danger)', background: '#FEE2E2', border: 'none', padding: '8px 16px' }} onClick={() => { setIsMyPageOpen(false); logout(); }}>
                                로그아웃
                            </button>
                            <button className="btn btn-primary" onClick={() => { setIsMyPageOpen(false); handleMyPageOpen(); }}>
                                정보 수정
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
