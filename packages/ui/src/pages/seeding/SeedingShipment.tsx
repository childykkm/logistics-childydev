import React, { useState, useMemo, FC, ChangeEvent } from 'react';
import { Truck, CheckCircle, PackageCheck, ClipboardCheck } from 'lucide-react';
import DateFilterBar from '../../components/common/DateFilterBar';
import { useAppContext } from '@core/contexts/AppContext';
import { STATUS_LABEL, S_APPROVED, S_ORDERED, S_SHIPPED } from '@core/constants/status';
import { PageHeader, Card } from '../../components/common/Layout';
import StatusBadge from '../../components/StatusBadge';
import styles from './SeedingShipment.module.css';

const today = new Date().toISOString().split('T')[0];

const SeedingShipment: FC = () => {
    const { seedings, updateSeeding } = useAppContext();
    const isRequester = useAppContext().currentUser?.role === 'requester';
    const [activeTab, setActiveTab] = useState<'발주대상' | '출고대상' | '완료내역'>('발주대상');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>(today);
    const [endDate, setEndDate] = useState<string>(today);

    const targetList = useMemo(() => {
        return seedings.filter(s => {
            if (activeTab === '발주대상' && s.status !== S_APPROVED) return false;
            if (activeTab === '출고대상' && s.status !== S_ORDERED) return false;
            if (activeTab === '완료내역' && s.status !== S_SHIPPED) return false;
            if (startDate && s.date < startDate) return false;
            if (endDate && s.date > endDate) return false;
            return true;
        });
    }, [seedings, activeTab, startDate, endDate]);

    const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(targetList.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkUpdate = async (newStatus: string) => {
        if (selectedIds.length === 0) {
            alert('처리할 항목을 먼저 선택해주세요.');
            return;
        }
        const label = STATUS_LABEL[newStatus] || newStatus;
        const msg = `선택한 ${selectedIds.length}건을 [${label}] 상태로 변경하시겠습니까?`;
        
        if (window.confirm(msg)) {
            try {
                await Promise.all(selectedIds.map(id => updateSeeding(id, { status: newStatus })));
                setSelectedIds([]);
                alert('상태 업데이트가 완료되었습니다.');
            } catch (err) {
                alert('업데이트 중 오류가 발생했습니다.');
            }
        }
    };

    return (
        <div>
            <PageHeader 
                title="시딩 발주 및 출고 관리" 
                description="담당자님, 승인된 시딩 건들의 발주 처리와 최종 출고 상태를 업데이트 하세요."
                background="#4F46E5"
            >
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="stat-item">
                        <div className="stat-label">발주대기</div>
                        <div className="stat-value">{seedings.filter(s => s.status === S_APPROVED).length}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">출고대기</div>
                        <div className="stat-value">{seedings.filter(s => s.status === S_ORDERED).length}</div>
                    </div>
                </div>
            </PageHeader>

            <DateFilterBar
                startDate={startDate}
                endDate={endDate}
                onStartDate={setStartDate}
                onEndDate={setEndDate}
                onToday={() => { setStartDate(today); setEndDate(today); }}
                onAll={() => { setStartDate(''); setEndDate(''); }}
            />

            <div className={styles.tabContainerScrollX}>
                <button
                    className={`btn ${activeTab === '발주대상' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setActiveTab('발주대상'); setSelectedIds([]); setStartDate(today); setEndDate(today); }}
                >
                    <ClipboardCheck size={18} /> 발주 대상 ({seedings.filter(s => s.status === S_APPROVED).length})
                </button>
                <button
                    className={`btn ${activeTab === '출고대상' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setActiveTab('출고대상'); setSelectedIds([]); setStartDate(today); setEndDate(today); }}
                >
                    <Truck size={18} /> 출고 대상 ({seedings.filter(s => s.status === S_ORDERED).length})
                </button>
                <button
                    className={`btn ${activeTab === '완료내역' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setActiveTab('완료내역'); setSelectedIds([]); setStartDate(today); setEndDate(today); }}
                >
                    <CheckCircle size={18} /> 최근 완료 내역
                </button>
            </div>

            <Card 
                title={`${activeTab} 목록`} 
                headerAction={activeTab !== '완료내역' && !isRequester && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {activeTab === '발주대상' && (
                            <button className="btn btn-primary" onClick={() => handleBulkUpdate(S_ORDERED)}>
                                {selectedIds.length > 0 && `선택 ${selectedIds.length}건 `}발주완료 처리
                            </button>
                        )}
                        {activeTab === '출고대상' && (
                            <button className={`btn ${styles.btnPrimaryPurple}`} onClick={() => handleBulkUpdate(S_SHIPPED)}>
                                {selectedIds.length > 0 && `선택 ${selectedIds.length}건 `}출고완료 처리
                            </button>
                        )}
                    </div>
                )}
            >
                <div className="table-container">
                    <table className={`table ${styles.tableMinWidth1000}`}>
                        <thead>
                            <tr className={styles.nowrapCol}>
                                <th style={{ width: '50px' }}>
                                    {!isRequester && <input type="checkbox" onChange={handleSelectAll} checked={targetList.length > 0 && selectedIds.length === targetList.length} />}
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
                                        {!isRequester && <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => handleSelect(row.id)} />}
                                    </td>
                                    <td className={styles.idColStrongInfo}>{row.id}</td>
                                    <td className={styles.nowrapCol}>{row.brand}</td>
                                    <td className={styles.nowrapCol}>{row.recipientName}</td>
                                    <td className={styles.ellipsisCol250}>
                                        {row.itemName} ({row.option1}/{row.option2})
                                    </td>
                                    <td className={styles.nowrapCol}>{row.qty}</td>
                                    <td className={styles.nowrapCol}>{row.date}</td>
                                    <td className={styles.nowrapCol}>
                                        <StatusBadge status={row.status} />
                                    </td>
                                    <td className={styles.ellipsisCol150}>{row.memo}</td>
                                </tr>
                            ))}
                            {targetList.length === 0 && (
                                <tr>
                                    <td colSpan={9} className={styles.emptyStateTableLarge}>
                                        <PackageCheck size={48} className={styles.emptyStateIconLight} />
                                        <p>해당 상태의 시딩 요청 건이 없습니다.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default SeedingShipment;
