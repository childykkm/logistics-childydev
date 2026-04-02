import { useState, useContext } from 'react';
import { Truck, CheckCircle, PackageCheck, ListFilter, ClipboardCheck } from 'lucide-react';
import { AppContext } from '@core/contexts/AppContext';
import { STATUS_COLORS, STATUS_LABEL, S_APPROVED, S_ORDERED, S_SHIPPED } from '@core/constants/status';

export default function SeedingShipment() {
    const { seedings, updateSeeding } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState('발주대상');
    const [selectedIds, setSelectedIds] = useState([]);

    // 발주대상: Approved(승인) seedings
    // 출고대상: OrderCompleted(발주완료) seedings
    // 완료내역: Shipped(출고완료) seedings
    const targetList = seedings.filter(s => {
        if (activeTab === '발주대상') return s.status === S_APPROVED;
        if (activeTab === '출고대상') return s.status === S_ORDERED;
        if (activeTab === '완료내역') return s.status === S_SHIPPED;
        return false;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(targetList.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkUpdate = async (newStatus) => {
        if (selectedIds.length === 0) {
            alert('처리할 항목을 먼저 선택해주세요.');
            return;
        }
        const msg = newStatus === S_ORDERED
            ? `선택한 ${selectedIds.length}건을 [${STATUS_LABEL[S_ORDERED]}] 상태로 변경하시겠습니까?`
            : `선택한 ${selectedIds.length}건을 [${STATUS_LABEL[S_SHIPPED]}] 상태로 변경하시겠습니까?`;
        if (window.confirm(msg)) {
            await Promise.all(selectedIds.map(id => updateSeeding(id, { status: newStatus })));
            setSelectedIds([]);
            alert('상태 업데이트가 완료되었습니다.');
        }
    };

    return (
        <>
            <div className="card" style={{ background: '#4F46E5', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>시딩 발주 및 출고 관리</h2>
                        <p style={{ color: '#E0E7FF', fontSize: '0.9375rem' }}>담당자님, 승인된 시딩 건들의 발주 처리와 최종 출고 상태를 업데이트 하세요.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', padding: '10px 20px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>발주대기</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{seedings.filter(s => s.status === S_APPROVED).length}</div>
                        </div>
                        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', padding: '10px 20px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>출고대기</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{seedings.filter(s => s.status === S_ORDERED).length}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                    className={`btn ${activeTab === '발주대상' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setActiveTab('발주대상'); setSelectedIds([]); }}
                >
                    <ClipboardCheck size={18} /> 발주 대상 ({seedings.filter(s => s.status === S_APPROVED).length})
                </button>
                <button
                    className={`btn ${activeTab === '출고대상' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setActiveTab('출고대상'); setSelectedIds([]); }}
                >
                    <Truck size={18} /> 출고 대상 ({seedings.filter(s => s.status === S_ORDERED).length})
                </button>
                <button
                    className={`btn ${activeTab === '완료내역' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setActiveTab('완료내역'); setSelectedIds([]); }}
                >
                    <CheckCircle size={18} /> 최근 완료 내역
                </button>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <span>{activeTab} 목록</span>
                    {activeTab !== '완료내역' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {activeTab === '발주대상' && (
                                <button className="btn btn-primary" onClick={() => handleBulkUpdate(S_ORDERED)}>
                                    {selectedIds.length > 0 && `선택 ${selectedIds.length}건 `}발주완료 처리
                                </button>
                            )}
                            {activeTab === '출고대상' && (
                                <button className="btn btn-primary" style={{ background: '#8B5CF6' }} onClick={() => handleBulkUpdate(S_SHIPPED)}>
                                    {selectedIds.length > 0 && `선택 ${selectedIds.length}건 `}출고완료 처리
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="table-container">
                    <table className="table" style={{ minWidth: '1000px' }}>
                        <thead>
                            <tr style={{ whiteSpace: 'nowrap' }}>
                                <th style={{ width: '50px' }}>
                                    <input type="checkbox" onChange={handleSelectAll} checked={targetList.length > 0 && selectedIds.length === targetList.length} />
                                </th>
                                <th style={{ width: '150px' }}>요청ID</th>
                                <th style={{ width: '100px' }}>브랜드</th>
                                <th style={{ width: '100px' }}>수취인</th>
                                <th style={{ width: '250px' }}>상품정보</th>
                                <th style={{ width: '80px' }}>수량</th>
                                <th style={{ width: '120px' }}>요청일자</th>
                                <th style={{ width: '100px' }}>상태</th>
                                <th style={{ width: '150px' }}>비고</th>
                            </tr>
                        </thead>
                        <tbody>
                            {targetList.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => handleSelect(row.id)} />
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--info)', whiteSpace: 'nowrap' }}>{row.id}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.brand}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.recipientName}</td>
                                    <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
                                        {row.itemName} ({row.option1}/{row.option2})
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.qty}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.date}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        {row.status === S_APPROVED && <span className="badge" style={{ background: STATUS_COLORS[S_APPROVED].bg, color: STATUS_COLORS[S_APPROVED].text }}>{STATUS_LABEL[S_APPROVED]}(발주대기)</span>}
                                        {row.status === S_ORDERED && <span className="badge" style={{ background: STATUS_COLORS[S_ORDERED].bg, color: STATUS_COLORS[S_ORDERED].text }}>{STATUS_LABEL[S_ORDERED]}</span>}
                                        {row.status === S_SHIPPED && <span className="badge" style={{ background: STATUS_COLORS[S_SHIPPED].bg, color: STATUS_COLORS[S_SHIPPED].text }}>{STATUS_LABEL[S_SHIPPED]}</span>}
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.memo}</td>
                                </tr>
                            ))}
                            {targetList.length === 0 && (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                        <PackageCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                        <p>해당 상태의 시딩 요청 건이 없습니다.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
