import React, { useState, useMemo, FC } from 'react';
import { PackageSearch, CheckCircle2, XCircle, ListChecks, Loader2 } from 'lucide-react';
import DateFilterBar from '../../components/common/DateFilterBar';
import { useAppContext } from '@core/contexts/AppContext';
import { usePermission } from '@core/hooks/usePermission';
import { S_PENDING, S_REVIEWING, S_APPROVED, S_REJECTED } from '@core/constants/status';
import { PageHeader, Card } from '../../components/common/Layout';
import StatusBadge from '../../components/StatusBadge';
import styles from './InventoryCheck.module.css';

const today = new Date().toISOString().split('T')[0];

const InventoryCheck: FC = () => {
    const { seedings, fetchData, updateSeeding, approveInventory, rejectInventory } = useAppContext();
    const { isRequester } = usePermission();
    const [activeTab, setActiveTab] = useState<'대기' | '완료'>('대기');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

    const [startDate, setStartDate] = useState<string>(today);
    const [endDate, setEndDate] = useState<string>(today);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filterByDate = (list: typeof seedings) => {
        return list.filter(s => {
            const d = s.date;
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
        });
    };

    const pendingList = useMemo(() => {
        const base = seedings.filter(s => s.status === S_PENDING || s.status === S_REVIEWING);
        return filterByDate(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seedings, startDate, endDate]);

    const completedList = useMemo(() => {
        const base = seedings.filter(s => s.status === S_APPROVED || s.status === S_REJECTED);
        return filterByDate(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seedings, startDate, endDate]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? pendingList.map(s => s.id) : []);
    };

    const handleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleApprove = async (id: string) => {
        const dbId = seedings.find(s => s.id === id)?._dbId;
        if (!dbId) return alert('재고 연동을 위한 데이터 정보가 부족합니다.');
        if (!window.confirm('재고를 자동 차감합니다.\n승인하시겠습니까?')) return;
        try {
            setProcessingId(id);
            await approveInventory({ requestId: id, dbId: String(dbId), fetchData, S_APPROVED });
            alert('재고 차감이 완료되었습니다.');
        } catch (err) {
            alert('승인 처리 중 오류가 발생했습니다.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        try {
            setProcessingId(id);
            await rejectInventory({ requestId: id, updateSeeding, S_REJECTED });
        } catch (err) {
            alert('반려 처리 중 오류가 발생했습니다.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return alert('승인할 항목을 선택해주세요.');
        if (!window.confirm(`선택한 ${selectedIds.length}건의 재고를 순차적으로 차감합니다.\n진행하시겠습니까?`)) return;

        let success = 0;
        let fail = 0;
        setBulkProgress({ current: 0, total: selectedIds.length });

        for (let i = 0; i < selectedIds.length; i++) {
            const id = selectedIds[i];
            const dbId = seedings.find(s => s.id === id)?._dbId;
            setBulkProgress({ current: i + 1, total: selectedIds.length });
            try {
                if (!dbId) throw new Error('dbId 없음');
                await approveInventory({ requestId: id, dbId: String(dbId), fetchData, S_APPROVED, skipFetchData: true });
                success++;
            } catch {
                fail++;
            }
        }

        setBulkProgress(null);
        setSelectedIds([]);
        await fetchData();
        alert(`일괄 승인 완료\n✅ 성공: ${success}건${fail > 0 ? `\n❌ 실패: ${fail}건` : ''}`);
    };

    const handleBulkReject = async () => {
        if (selectedIds.length === 0) return alert('반려할 항목을 선택해주세요.');
        if (!window.confirm(`선택한 ${selectedIds.length}건을 반려 처리합니다.\n진행하시겠습니까?`)) return;

        let success = 0;
        let fail = 0;
        setBulkProgress({ current: 0, total: selectedIds.length });

        for (let i = 0; i < selectedIds.length; i++) {
            const id = selectedIds[i];
            setBulkProgress({ current: i + 1, total: selectedIds.length });
            try {
                await rejectInventory({ requestId: id, updateSeeding, S_REJECTED, skipFetchData: true });
                success++;
            } catch {
                fail++;
            }
            if (i < selectedIds.length - 1) await new Promise(r => setTimeout(r, 1000));
        }

        setBulkProgress(null);
        setSelectedIds([]);
        await fetchData();
        alert(`일괄 반려 완료\n✅ 성공: ${success}건${fail > 0 ? `\n❌ 실패: ${fail}건` : ''}`);
    };

    const dataToRender = activeTab === '대기' ? pendingList : completedList;

    return (
        <div>
            <PageHeader
                title="재고 보정 상태"
                description="물류 담당자님, Cafe24 재고 자동 차감을 진행하고 처리할 수 있습니다."
            >
                <div className={`stat-item ${styles.statItemLarge}`}>
                    <div className="stat-label">대기 건수</div>
                    <div className={`stat-value ${styles.statValueLarge}`}>{pendingList.length}건</div>
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

            <div className={styles.tabContainer}>
                <button className="btn btn-primary" onClick={() => { setActiveTab('대기'); setSelectedIds([]); }} style={{ opacity: activeTab === '대기' ? 1 : 0.45 }}>
                    <PackageSearch size={18} /> 승인 대기 건 ({pendingList.length})
                </button>
                <button className="btn btn-primary" onClick={() => { setActiveTab('완료'); setSelectedIds([]); }} style={{ opacity: activeTab === '완료' ? 1 : 0.45 }}>
                    <ListChecks size={18} /> 처리 완료 내역 ({completedList.length})
                </button>
            </div>

            <Card
                title={activeTab === '대기' ? '승인 대기 목록' : '처리 완료 (승인/반려) 목록'}
                headerAction={activeTab === '대기' && !isRequester && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {bulkProgress && (
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Loader2 size={14} className="animate-spin" />
                                {bulkProgress.current} / {bulkProgress.total} 처리 중...
                            </span>
                        )}
                        <button className={`btn ${styles.btnApprove}`} onClick={handleBulkApprove} disabled={!!bulkProgress || selectedIds.length === 0}>
                            <CheckCircle2 size={16} /> {selectedIds.length > 0 ? `선택 ${selectedIds.length}건 ` : ''}일괄 승인
                        </button>
                        <button className={`btn ${styles.btnReject}`} onClick={handleBulkReject} disabled={!!bulkProgress || selectedIds.length === 0}>
                            <XCircle size={16} /> {selectedIds.length > 0 ? `선택 ${selectedIds.length}건 ` : ''}일괄 반려
                        </button>
                    </div>
                )}
            >
                <div className="table-container">
                    <table className={`table ${styles.tableMinWidth940}`}>
                        <thead>
                            <tr className={styles.nowrapCol}>
                                {activeTab === '대기' && !isRequester && (
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input type="checkbox" onChange={handleSelectAll} checked={pendingList.length > 0 && selectedIds.length === pendingList.length} />
                                    </th>
                                )}
                                <th style={{ width: '120px' }}>요청ID</th>
                                <th style={{ width: '100px' }}>브랜드</th>
                                <th style={{ width: '110px' }}>요청일자</th>
                                <th style={{ width: '90px' }}>요청자</th>
                                <th style={{ width: '180px' }}>상품명</th>
                                <th style={{ width: '90px', textAlign: 'center' }}>색상</th>
                                <th style={{ width: '90px', textAlign: 'center' }}>사이즈</th>
                                <th style={{ width: '110px', textAlign: 'center' }}>시딩 수량</th>
                                <th style={{ width: '110px', textAlign: 'center' }}>상태</th>
                                {activeTab === '대기' && !isRequester && (
                                    <th style={{ width: '180px', textAlign: 'center' }}>승인/반려 처리</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {dataToRender.map((row) => (
                                <tr key={row.id}>
                                    {activeTab === '대기' && !isRequester && (
                                        <td style={{ textAlign: 'center' }}>
                                            <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => handleSelect(row.id)} />
                                        </td>
                                    )}
                                    <td className={styles.idColInfo}>{row.id}</td>
                                    <td className={styles.nowrapCol}>{row.brand}</td>
                                    <td className={styles.nowrapCol}>{row.date}</td>
                                    <td className={styles.nowrapCol}>{row.orderName}</td>
                                    <td className={styles.ellipsisCol220}>{row.itemName}</td>
                                    <td className={styles.nowrapCol} style={{ textAlign: 'center' }}>{row.option1 || '-'}</td>
                                    <td className={styles.nowrapCol} style={{ textAlign: 'center' }}>{row.option2 || '-'}</td>
                                    <td className={styles.nowrapCol} style={{ textAlign: 'center' }}>
                                        <span className={`badge badge-warning ${styles.badgeWarningSmall}`}>{row.qty}개</span>
                                    </td>
                                    <td className={styles.nowrapCol} style={{ textAlign: 'center' }}>
                                        <StatusBadge status={row.status} />
                                    </td>
                                    {activeTab === '대기' && !isRequester && (
                                        <td className={styles.nowrapCol} style={{ textAlign: 'center' }}>
                                            <div className={styles.actionBtnGroup}>
                                                <button
                                                    onClick={() => handleApprove(row.id)}
                                                    className={`btn ${styles.btnApprove}`}
                                                    disabled={!!processingId || !!bulkProgress}
                                                    style={{ minWidth: '94px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                >
                                                    {processingId === row.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                    {processingId === row.id ? '처리중' : '승인'}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(row.id)}
                                                    className={`btn ${styles.btnReject}`}
                                                    disabled={!!processingId || !!bulkProgress}
                                                    style={{ minWidth: '94px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                >
                                                    <XCircle size={16} /> 반려
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {dataToRender.length === 0 && (
                                <tr>
                                    <td colSpan={activeTab === '대기' && !isRequester ? 11 : 9} className={styles.emptyStateTable}>
                                        <div style={{ padding: '40px 0', textAlign: 'center' }}>
                                            <PackageSearch size={48} className={styles.emptyStateIcon} />
                                            <p>{activeTab === '대기' ? '승인 대기 중인 시딩 요청이 없습니다.' : '처리 완료된 시딩 요청이 없습니다.'}</p>
                                        </div>
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

export default InventoryCheck;
