import React, { useState, useEffect, FC } from 'react';
import { X } from 'lucide-react';
import { permissionService } from '@core/services/brandService';
import { userService } from '@core/services/userService';
import { ROLES } from '@core/constants/roles';
import { useAppContext } from '@core/contexts/AppContext';
import { usePermission } from '@core/hooks/usePermission';

const getBrandName = (b: any) => typeof b === 'object' ? (b.name || b.brand_name || '') : (b || '');
const getBrandId = (b: any) => typeof b === 'object' ? (b.id || b.brand_id) : null;

interface EditAccountModalProps {
    user: any;
    brands: any[];
    onClose: () => void;
    onSaved: () => void;
}

const EditAccountModal: FC<EditAccountModalProps> = ({ user, brands, onClose, onSaved }) => {
    const { currentUser: loggedInUser, setCurrentUser: setLoggedInUser } = useAppContext();
    const { isAdmin } = usePermission();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [originalUser, setOriginalUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [password, setPassword] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await permissionService.getUserPermissions(user.id);
                const list = Array.isArray(res) ? res : ((res as any)?.data || []);
                const brandIds = list
                    .filter((b: any) => b.has_permission === 1 || b.has_permission === true)
                    .map((b: any) => b.id ?? b.brand_id);
                
                const data = { ...user, brandIds };
                setCurrentUser(data);
                setOriginalUser({ name: user.name, email: user.email, role: user.role, brandIds: [...brandIds] });
            } catch {
                setCurrentUser({ ...user, brandIds: [] });
                setOriginalUser({ name: user.name, email: user.email, role: user.role, brandIds: [] });
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [user.id, user]);

    const handleBrandToggle = (brandId: number) => {
        const ids = currentUser.brandIds || [];
        setCurrentUser({ ...currentUser, brandIds: ids.includes(brandId) ? ids.filter((id: number) => id !== brandId) : [...ids, brandId] });
    };

    const handleSelectAll = () => {
        setCurrentUser({ ...currentUser, brandIds: brands.map(b => getBrandId(b)).filter((id): id is number => !!id) });
    };

    const handleDeselectAll = () => {
        setCurrentUser({ ...currentUser, brandIds: [] });
    };

    const handleSave = async () => {
        try {
            const hasInfoChanged = originalUser &&
                (currentUser.name !== originalUser.name ||
                 currentUser.email !== originalUser.email ||
                 currentUser.role !== originalUser.role);

            if (hasInfoChanged || password) {
                await userService.updateUser(String(currentUser.id), {
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role,
                    ...(password ? { password } : {}),
                });
                if (loggedInUser?.id === currentUser.id) {
                    try {
                        const res = await userService.getUserDetail(currentUser.id);
                        const fresh = (res as any)?.data || (res as any)?.user || res;
                        if (fresh) setLoggedInUser({ ...loggedInUser, ...fresh, id: fresh.id ?? fresh.user_id });
                    } catch {}
                }
            }

            const added = (currentUser.brandIds || []).filter((id: number) => !(originalUser?.brandIds || []).includes(id));
            const removed = (originalUser?.brandIds || []).filter((id: number) => !(currentUser.brandIds || []).includes(id));
            
            await Promise.all([
                ...added.map((brand_id: number) => permissionService.grantPermission({ user_id: currentUser.id, brand_id })),
                ...removed.map((brand_id: number) => permissionService.revokePermission(String(currentUser.id), brand_id)),
            ]);

            alert('정보가 수정되었습니다.');
            onSaved?.();
            onClose();
        } catch {
            alert('수정 중 오류가 발생했습니다.');
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem' }}>내정보 수정</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>불러오는 중...</div>
                ) : (
                    <>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">아이디</label>
                            <input type="text" className="form-input" value={currentUser.username || ''} readOnly style={{ background: '#F9FAFB', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">이름</label>
                            <input type="text" className="form-input" value={currentUser.name || ''} onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">이메일</label>
                            <input type="email" className="form-input" value={currentUser.email || ''} onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">비밀번호 (변경 시에만 입력)</label>
                            <input type="password" className="form-input" value={password} placeholder="새 비밀번호" onChange={e => setPassword(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">역할</label>
                            {isAdmin ? (
                                <select className="form-select" value={currentUser.role || ''} onChange={e => setCurrentUser({ ...currentUser, role: e.target.value })}>
                                    {ROLES.map((r, i) => <option key={i} value={r.key}>{r.label}</option>)}
                                </select>
                            ) : (
                                <input type="text" className="form-input" value={ROLES.find(r => r.key === currentUser.role)?.label || currentUser.role || ''} readOnly style={{ background: '#F9FAFB', cursor: 'not-allowed' }} />
                            )}
                        </div>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">접근 가능 브랜드</label>
                            {isAdmin ? (
                                <>
                                <div style={{ display: 'flex', gap: '8px', margin: '8px 0' }}>
                                    <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8125rem' }} onClick={handleSelectAll}>전체 선택</button>
                                    <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8125rem' }} onClick={handleDeselectAll}>전체 해제</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {brands.map((b, i) => {
                                        const bName = getBrandName(b);
                                        const bId = getBrandId(b);
                                        return (
                                            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={(currentUser.brandIds || []).includes(bId)} onChange={() => handleBrandToggle(bId)} />
                                                <span style={{ fontSize: '0.875rem' }}>{bName}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                    {(() => {
                                        const assigned = brands.filter(b => (currentUser.brandIds || []).includes(getBrandId(b)));
                                        const display = assigned.length > 0 ? assigned : brands;
                                        return display.length > 0
                                            ? display.map((b, i) => <span key={i} className="badge badge-info">{getBrandName(b)}</span>)
                                            : <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>미할당</span>;
                                    })()}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button className="btn btn-outline" onClick={onClose}>취소</button>
                            <button className="btn btn-primary" onClick={handleSave}>저장</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EditAccountModal;
