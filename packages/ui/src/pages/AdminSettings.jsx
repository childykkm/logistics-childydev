import { useState, useContext, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { AppContext } from '@core/contexts/AppContext';
import { permissionService } from '@core/services/brandService';
import { userService } from '@core/services/userService';
import { ROLES } from '@core/constants/roles';

const getBrandName = (b) => typeof b === 'object' ? (b.name || b.brand_name || '') : (b || '');
const getBrandId = (b) => typeof b === 'object' ? (b.id || b.brand_id) : null;

export default function AdminSettings() {
    const { brands, openEditAccount, accounts, fetchData, isLoading: globalLoading } = useContext(AppContext);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'requester', brandIds: [] });

    const handleCreateAccount = async () => {
        if (!newUser.name || !newUser.email || !newUser.password) {
            return alert('이름, 이메일, 비밀번호는 필수입니다.');
        }
        try {
            const res = await userService.createUser({
                name: newUser.name,
                email: newUser.email,
                password: newUser.password,
                role: newUser.role,
            });
            const createdUserId = res?.id ?? res?.data?.id ?? res?.user?.id;
            if (createdUserId && newUser.brandIds.length > 0) {
                await Promise.all(
                    newUser.brandIds.map(brand_id =>
                        permissionService.grantPermission({ user_id: createdUserId, brand_id })
                    )
                );
            }
            alert('새 계정이 생성되었습니다.');
            setIsCreateModalOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'requester', brandIds: [] });
            await fetchData();
        } catch {
            alert('계정 생성 중 오류가 발생했습니다.');
        }
    };

    const handleBrandToggle = (brandId) => {
        const ids = newUser.brandIds || [];
        setNewUser({ ...newUser, brandIds: ids.includes(brandId) ? ids.filter(id => id !== brandId) : [...ids, brandId] });
    };

    const handleSelectAllBrands = () => {
        setNewUser({ ...newUser, brandIds: brands.map(b => getBrandId(b)).filter(Boolean) });
    };

    const handleDeselectAllBrands = () => {
        setNewUser({ ...newUser, brandIds: [] });
    };


    const handleDelete = async (id) => {
        if (!window.confirm('정말 이 계정을 삭제하시겠습니까?')) return;
        try {
            await userService.deleteUser(id);
            await fetchData();
            alert('계정 삭제되었습니다.');
        } catch {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };


    const getRoleLabel = (key) => ROLES.find(r => r.key === key)?.label ?? key;

    const BrandCheckboxes = ({ brandIds, onToggle, onSelectAll, onDeselectAll }) => (
        <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8125rem' }} onClick={onSelectAll}>전체 선택</button>
                <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8125rem' }} onClick={onDeselectAll}>전체 해제</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {brands.map((b, i) => {
                    const bName = getBrandName(b);
                    const bId = getBrandId(b);
                    return (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={(brandIds || []).includes(bId)} onChange={() => onToggle(bId)} />
                            <span style={{ fontSize: '0.875rem' }}>{bName}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );

    return (
        <>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 className="card-title" style={{ margin: 0 }}>계정 및 권한 관리</h2>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={18} /> 새 계정 생성
                </button>
            </div>

            <div className="card">
                <div className="card-title">등록된 계정 목록</div>
                <div className="table-container">
                    <table className="table" style={{ minWidth: '800px' }}>
                        <thead>
                            <tr>
                                <th>이름</th>
                                <th>이메일 (ID)</th>
                                <th>역할</th>
                                <th>접근 가능 브랜드</th>
                                <th>최근 로그인</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {globalLoading && accounts.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}><Loader2 className="animate-spin" size={24} style={{ margin: '0 auto', color: 'var(--primary)' }} /></td></tr>
                            ) : accounts.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>등록된 계정이 없습니다.</td></tr>
                            ) : accounts.map((user) => {
                                const userBrands = Array.isArray(user.brands) ? user.brands : [];
                                return (
                                    <tr key={user.id}>
                                        <td style={{ fontWeight: 600, textAlign: 'left' }}>{user.name}</td>
                                        <td style={{ color: 'var(--text-muted)', textAlign: 'left' }}>{user.email || user.username}</td>
                                        <td><span className="badge badge-info">{getRoleLabel(user.role)}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                {userBrands.length > 0
                                                    ? userBrands.map((b, i) => <span key={i} className="badge" style={{ background: '#F3F4F6', color: '#374151' }}>{getBrandName(b)}</span>)
                                                    : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>미할당</span>
                                                }
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>{user.last_login || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8125rem' }} onClick={() => openEditAccount(user, fetchData)}>
                                                    <Edit size={14} /> 수정
                                                </button>
                                                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8125rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(user.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 계정 생성 모달 */}
            {isCreateModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>새 계정 생성</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">이름 *</label>
                            <input type="text" className="form-input" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">이메일 *</label>
                            <input type="email" className="form-input" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">비밀번호 *</label>
                            <input type="password" className="form-input" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">역할</label>
                            <select className="form-select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                {ROLES.map((r, i) => <option key={i} value={r.key}>{r.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">접근 가능 브랜드</label>
                            <BrandCheckboxes
                                brandIds={newUser.brandIds}
                                onToggle={handleBrandToggle}
                                onSelectAll={handleSelectAllBrands}
                                onDeselectAll={handleDeselectAllBrands}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button className="btn btn-outline" onClick={() => setIsCreateModalOpen(false)}>취소</button>
                            <button className="btn btn-primary" onClick={handleCreateAccount}>생성</button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}
