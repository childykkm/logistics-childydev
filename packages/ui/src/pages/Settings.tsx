import { useContext, useState } from 'react';
import { Plus, Lock } from 'lucide-react';
import { AppContext } from '@core/contexts/AppContext';
import { STATUS_LIST, STATUS_COLORS, STATUS_LABEL } from '@core/constants/status';
import { ROLES } from '@core/constants/roles';

export default function Settings() {
    const { brands, addBrand, removeBrand } = useContext(AppContext);
    const [newBrand, setNewBrand] = useState('');

    const handleAddBrand = () => {
        if (newBrand.trim()) {
            addBrand(newBrand.trim());
            setNewBrand('');
        }
    };

    return (
        <>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 className="card-title" style={{ margin: 0 }}>시스템 통합 설정</h2>
            </div>

            <div className="form-grid">
                {/* Statuses Setting - 읽기 전용 */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        상태값 목록
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            <Lock size={12} /> 서버 기준 고정값
                        </span>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <tbody>
                                {STATUS_LIST.map((s, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'left' }}>
                                            <span className="badge" style={{ background: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].text }}>
                                                {STATUS_LABEL[s] ?? s}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>수정 불가</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Roles Setting - 읽기 전용 */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        역할(접근 권한) 목록
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            <Lock size={12} /> 서버 기준 고정값
                        </span>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Role</th>
                                    <th style={{ textAlign: 'left' }}>명칭</th>
                                    <th style={{ textAlign: 'left' }}>대상</th>
                                    <th style={{ textAlign: 'right' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {ROLES.map((r, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'left' }}>
                                            <span className="badge" style={{ background: '#F3F4F6', color: '#374151', fontFamily: 'monospace' }}>{r.key}</span>
                                        </td>
                                        <td style={{ textAlign: 'left', fontWeight: 500 }}>{r.label}</td>
                                        <td style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{r.desc}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>수정 불가</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
