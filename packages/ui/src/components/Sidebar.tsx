import React, { FC, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FilePlus, PackageSearch, Users, Settings, X, Truck, Store, LogOut } from 'lucide-react';
import { AppContext } from '@core/contexts/AppContext';
import { usePermission } from '@core/hooks/usePermission';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  const { logout, currentUser } = useContext(AppContext);
  const { isAdmin } = usePermission();

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) logout();
  };
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={closeSidebar} />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ justifyContent: 'space-between' }}>
          <span>📦 통합 물류 시스템</span>
          <button
            onClick={closeSidebar}
            className="btn btn-outline"
            style={{ padding: '4px', border: 'none', display: 'none' }}
            id="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="nav-links">
          <div style={{ padding: '16px 16px 8px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>[ 카테고리: 시딩 관리 ]</div>
          <NavLink end to="/seeding" onClick={closeSidebar} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>시딩 대시보드 및 목록</span>
          </NavLink>
          <NavLink to="/seeding/request" onClick={closeSidebar} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FilePlus size={20} />
            <span>신규 시딩 출고 요청</span>
          </NavLink>
          <NavLink to="/seeding/inventory" onClick={closeSidebar} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <PackageSearch size={20} />
            <span>쇼핑몰 재고 보정 확인</span>
          </NavLink>
          <NavLink to="/seeding/shipment" onClick={closeSidebar} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Truck size={20} />
            <span>시딩 발주 및 출고 관리</span>
          </NavLink>

          {isAdmin && <div style={{ padding: '16px 16px 8px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>[ 시스템 환경 설정 ]</div>}
          {isAdmin && (
            <NavLink to="/brands" onClick={closeSidebar} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Store size={20} />
              <span>브랜드 관리</span>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" onClick={closeSidebar} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              <span>계정 및 권한 관리</span>
            </NavLink>
          )}

          <div style={{ marginTop: 'auto' }}>
            <button className="nav-link" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }} onClick={handleLogout}>
              <LogOut size={20} />
              <span>로그아웃</span>
            </button>
            <NavLink to="/settings" onClick={closeSidebar} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Settings size={20} />
              <span>시스템 공통값 안내</span>
            </NavLink>
          </div>
        </nav>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          #mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
