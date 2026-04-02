import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { permissionService } from '@core/services/brandService';
import { userService } from '@core/services/userService';
import { ROLES } from '@core/constants/roles';

const getBrandName = (b) => typeof b === 'object' ? (b.name || b.brand_name || '') : (b || '');
const getBrandId = (b) => typeof b === 'object' ? (b.id || b.brand_id) : null;

export default function EditAccountModal({ user, brands, onClose, onSaved }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [originalUser, setOriginalUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await permissionService.getUserPermissions(user.id);
                const list = Array.isArray(res) ? res : (res?.data || []);
                const brandIds = list
                    .filter(b => b.has_permission === 1 || b.has_permission === true)
                    .map(b => b.id ?? b.brand_id);
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
    }, [user.id]);

    const handleBrandToggle = (brandId) => {
        const ids = currentUser.brandIds || [];
        setCurrentUser({ ...currentUser, brandIds: ids.includes(brandId) ? ids.filter(id => id !== brandId) : [...ids, brandId] });
    };

    const handleSelectAll = () => {
        setCurrentUser({ ...currentUser, brandIds: brands.map(b => getBrandId(b)).filter(Boolean) });
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

            if (hasInfoChanged) {
                await userService.updateUser(currentUser.id, {
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role,
                });
            }

            const added = (currentUser.brandIds || []).filter(id => !(originalUser?.brandIds || []).includes(id));
            const removed = (originalUser?.brandIds || []).filter(id => !(currentUser.brandIds || []).includes(id));
            await Promise.all([
                ...added.map(brand_id => permissionService.grantPermission({ user_id: currentUser.id, brand_id })),
                ...removed.map(brand_id => permissionService.revokePermission(currentUser.id, brand_id)),
            ]);

            alert('계정이 수정되었습니다.');
            onSaved?.();
            onClose();
        } catch {
            alert('수정 중 오류가 발생했습니다.');
        }
    };

    const getRoleLabel = (key) => ROLES.find(r => r.key === key)?.label ?? key;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem' }}>계정 수정</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>불러오는 중...</div>
                ) : (
                    <>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">이름</label>
                            <input type="text" className="form-input" value={currentUser.name || ''} onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">이메일</label>
                            <input type="email" className="form-input" value={currentUser.email || ''} onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">역할</label>
                            <select className="form-select" value={currentUser.role || ''} onChange={e => setCurrentUser({ ...currentUser, role: e.target.value })}>
                                {ROLES.map((r, i) => <option key={i} value={r.key}>{r.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">접근 가능 브랜드</label>
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
}
