import React, { useState, FC, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { useAppContext } from '@core/contexts/AppContext';
import { permissionService } from '@core/services/brandService';
import { userService } from '@core/services/userService';
import { ROLES } from '@core/constants/roles';
import styles from './AdminSettings.module.css';

const getBrandName = (b: any) => typeof b === 'object' ? (b.name || b.brand_name || '') : (b || '');
const getBrandId = (b: any) => typeof b === 'object' ? (b.id || b.brand_id) : null;

const AdminSettings: FC = () => {
    const { brands, openEditAccount, accounts, fetchData, deleteAccount, currentUser, isLoading: globalLoading } = useAppContext();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ 
        name: '', 
        username: '',
        email: '', 
        password: '', 
        role: 'requester', 
        brandIds: [] as number[] 
    });

    const isAdmin = currentUser?.role === 'admin';

    const handleCreateAccount = async () => {
        if (!newUser.name || !newUser.username || !newUser.email || !newUser.password) {
            return alert('이름, 아이디, 이메일, 비밀번호는 필수입니다.');
        }
        try {
            const res = await userService.createUser({
                name: newUser.name,
                username: newUser.username,
                email: newUser.email,
                password: newUser.password,
                role: newUser.role,
            });
            const createdUserId = (res as any)?.id ?? (res as any)?.data?.id ?? (res as any)?.user?.id;
            
            if (createdUserId && newUser.brandIds.length > 0) {
                await Promise.all(
                    newUser.brandIds.map(brand_id =>
                        permissionService.grantPermission({ user_id: createdUserId, brand_id })
                    )
                );
            }
            alert('새 계정이 생성되었습니다.');
            setIsCreateModalOpen(false);
            setNewUser({ name: '', username: '', email: '', password: '', role: 'requester', brandIds: [] });
            await fetchData();
        } catch {
            alert('계정 생성 중 오류가 발생했습니다.');
        }
    };

    const handleBrandToggle = (brandId: number) => {
        const ids = newUser.brandIds || [];
        setNewUser({ 
            ...newUser, 
            brandIds: ids.includes(brandId) 
                ? ids.filter(id => id !== brandId) 
                : [...ids, brandId] 
        });
    };

    const handleSelectAllBrands = () => {
        setNewUser({ ...newUser, brandIds: brands.map(b => getBrandId(b)).filter((id): id is number => !!id) });
    };

    const handleDeselectAllBrands = () => {
        setNewUser({ ...newUser, brandIds: [] });
    };

    const handleDelete = async (id: string | number) => {
        if (!window.confirm('정말 이 계정을 삭제하시겠습니까?')) return;
        try {
            await userService.deleteUser(String(id));
            await fetchData();
            alert('계정이 삭제되었습니다.');
        } catch (e) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const getRoleLabel = (key: string) => ROLES.find(r => r.key === key)?.label ?? key;

    const BrandCheckboxes = ({ brandIds, onToggle, onSelectAll, onDeselectAll }: any) => (
        <div>
            <div className={styles.brandBtnWrap}>
                <button type="button" className={`btn btn-outline ${styles.btnTiny}`} onClick={onSelectAll}>전체 선택</button>
                <button type="button" className={`btn btn-outline ${styles.btnTiny}`} onClick={onDeselectAll}>전체 해제</button>
            </div>
            <div className={styles.brandGrid}>
                {brands.map((b, i) => {
                    const bName = getBrandName(b);
                    const bId = getBrandId(b);
                    return (
                        <label key={i} className={styles.brandLabel}>
                            <input type="checkbox" checked={(brandIds || []).includes(bId)} onChange={() => onToggle(bId)} />
                            <span className={styles.brandText}>{bName}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div>
            <div className={`card ${styles.headerCard}`}>
                <h2 className={`card-title ${styles.headerTitle}`}>계정 및 권한 관리</h2>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)} style={{ visibility: isAdmin ? 'visible' : 'hidden' }}>
                    <Plus size={18} /> 새 계정 생성
                </button>
            </div>

            <div className="card">
                <div className="card-title">등록된 계정 목록</div>
                <div className="table-container">
                    <table className={`table ${styles.tableFixed}`}>
                        <thead>
                            <tr>
                                <th className={styles.centeredTh}>이름</th>
                                <th className={styles.centeredTh}>아이디 (ID)</th>
                                <th className={styles.centeredTh}>이메일</th>
                                <th className={styles.centeredTh}>역할</th>
                                <th className={styles.centeredTh}>접근 가능 브랜드</th>
                                <th className={styles.centeredTh}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {globalLoading && accounts.length === 0 ? (
                                <tr><td colSpan={6} className={styles.emptyCell}><Loader2 className={`animate-spin ${styles.loader}`} size={24} /></td></tr>
                            ) : accounts.length === 0 ? (
                                 <tr key="empty"><td colSpan={6} className={styles.emptyText}>등록된 계정이 없습니다. (로그: {accounts.length}개)</td></tr>
                            ) : accounts.map((user) => {
                                const userBrands = Array.isArray(user.brands) ? user.brands : [];
                                return (
                                    <tr key={user.id}>
                                        <td className={styles.nameCell}>{user.name}</td>
                                        <td className={styles.emailCell}>{(user as any).username || (user as any).user_id || '-'}</td>
                                        <td className={styles.emailCell}>{user.email || (user as any).username}</td>
                                        <td style={{ textAlign: 'center' }}><span className="badge badge-info">{getRoleLabel(user.role)}</span></td>
                                        <td>
                                            <div className={styles.brandBadgeWrap}>
                                                {userBrands.length > 0
                                                    ? userBrands.map((b, i) => <span key={i} className={`badge ${styles.brandBadge}`}>{getBrandName(b)}</span>)
                                                    : <span className={styles.unassignedText}>미할당</span>
                                                }
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.actionWrap}>
                                                <button className={`btn btn-outline ${styles.btnSmall}`} onClick={() => openEditAccount(user, fetchData)}>
                                                    <Edit size={14} /> 수정
                                                </button>
                                                <button className={`btn btn-outline ${styles.btnDanger}`} onClick={() => handleDelete(user.id)}>
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
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>새 계정 생성</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className={styles.btnClose}><X size={20} /></button>
                        </div>
                        <div className={`form-group ${styles.formGroupSmall}`}>
                            <label className="form-label">이름 *</label>
                            <input type="text" className="form-input" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                        </div>
                        <div className={`form-group ${styles.formGroupSmall}`}>
                            <label className="form-label">이메일 *</label>
                            <input type="email" className="form-input" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                        </div>
                        <div className={`form-group ${styles.formGroupSmall}`}>
                            <label className="form-label">아이디 (username) *</label>
                            <input type="text" className="form-input" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                        </div>
                        <div className={`form-group ${styles.formGroupSmall}`}>
                            <label className="form-label">비밀번호 *</label>
                            <input type="password" className="form-input" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                        </div>
                        <div className={`form-group ${styles.formGroupSmall}`}>
                            <label className="form-label">역할</label>
                            <select className="form-select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                {ROLES.map((r, i) => <option key={i} value={r.key}>{r.label}</option>)}
                            </select>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className="btn btn-outline" onClick={() => setIsCreateModalOpen(false)}>취소</button>
                            <button className="btn btn-primary" onClick={handleCreateAccount}>생성</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
