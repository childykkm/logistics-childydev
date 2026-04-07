import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useContext, Component } from 'react';
import Sidebar from '@ui/components/Sidebar';
import Header from '@ui/components/Header';
import SeedingList from '@ui/pages/seeding/SeedingList';
import SeedingRequest from '@ui/pages/seeding/SeedingRequest';
import InventoryCheck from '@ui/pages/seeding/InventoryCheck';
import SeedingShipment from '@ui/pages/seeding/SeedingShipment';
import AdminSettings from '@ui/pages/AdminSettings';
import SeedingDetail from '@ui/pages/seeding/SeedingDetail';
import Settings from '@ui/pages/Settings';
import BrandManagement from '@ui/pages/BrandManagement';
import EditAccountModal from '@ui/components/EditAccountModal';
import { AppProvider, AppContext } from '@core/contexts/AppContext';
import { usePermission } from '@core/hooks/usePermission';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import Login from '@ui/pages/Login';
import Forbidden from '@ui/pages/Forbidden';
import NotFound from '@ui/pages/NotFound';
import { Navigate } from 'react-router-dom';

// ─── Route Guard ───
function AdminRoute({ children }) {
  const { isAdmin } = usePermission();
  return isAdmin ? children : <Forbidden />;
}

// ─── Error Boundary: 페이지 단위 에러 방지 ───
class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[PageError]', error, info);
  }

  componentDidUpdate(prevProps) {
    // 경로(key)가 바뀌면 에러 상태 초기화 → 뒤로가기 시 복구
    if (prevProps.routeKey !== this.props.routeKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', gap: '16px', color: 'var(--text-muted)'
        }}>
          <AlertTriangle size={48} color="var(--danger)" style={{ opacity: 0.7 }} />
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>페이지를 표시할 수 없습니다</h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}</p>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCw size={16} /> 다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Layout({ children, routeKey }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, error, clearError, editAccountTarget, closeEditAccount, onEditAccountSaved, brands, fetchData } = useContext(AppContext);

  return (
    <div className="app-container">
      <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
      <main className="main-content">
        <Header toggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <div className="page-container">
          {error && (
            <div className="alert badge-danger" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderRadius: '8px' }}>
              <span>{error}</span>
              <button onClick={clearError} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.25rem' }}>&times;</button>
            </div>
          )}
          {isLoading && !error && (
            <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 className="animate-spin" size={16} />
              <span style={{ fontSize: '0.875rem' }}>데이터 갱신 중...</span>
            </div>
          )}
          <PageErrorBoundary routeKey={routeKey}>
            {children}
          </PageErrorBoundary>
        </div>
      </main>
      {/* 전역 계정 수정 모달 */}
      {editAccountTarget && (
        <EditAccountModal
          user={editAccountTarget}
          brands={brands}
          onClose={closeEditAccount}
          onSaved={() => { onEditAccountSaved?.(); closeEditAccount(); fetchData(); }}
        />
      )}
    </div>
  );
}

function MainRouter() {
  const { currentUser } = useContext(AppContext);
  const [routeKey, setRouteKey] = useState(window.location.pathname);

  if (!currentUser) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <RoutesWithBoundary />
    </BrowserRouter>
  );
}

function RoutesWithBoundary() {
  const [location, setLocation] = useState(window.location.pathname);

  // location 변화 감지를 위해 useNavigate 기반이 아닌 Routes의 key prop 활용
  return (
    <Routes>
      {[
        { path: '/', el: <SeedingList /> },
        { path: '/seeding', el: <SeedingList /> },
        { path: '/seeding/request', el: <SeedingRequest /> },
        { path: '/seeding/detail/:id', el: <SeedingDetail /> },
        { path: '/seeding/inventory', el: <InventoryCheck /> },
        { path: '/seeding/shipment', el: <SeedingShipment /> },
        { path: '/brands', el: <AdminRoute><BrandManagement /></AdminRoute> },
        { path: '/admin', el: <AdminRoute><AdminSettings /></AdminRoute> },
        { path: '/settings', el: <Settings /> },
        { path: '*', el: <NotFound /> },
      ].map(({ path, el }) => (
        <Route
          key={path}
          path={path}
          element={
            <Layout routeKey={path}>
              {el}
            </Layout>
          }
        />
      ))}
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}

export default App;
