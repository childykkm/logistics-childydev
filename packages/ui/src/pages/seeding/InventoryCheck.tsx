import React, { useState, useMemo, FC } from 'react';
import { PackageSearch, CheckCircle2, XCircle, ListChecks, Loader2 } from 'lucide-react';
import DateFilterBar from '../../components/common/DateFilterBar';
import { useAppContext } from '@core/contexts/AppContext';
import { S_PENDING, S_REVIEWING, S_APPROVED, S_REJECTED } from '@core/constants/status';
import { PageHeader, Card } from '../../components/common/Layout';
import StatusBadge from '../../components/StatusBadge';
import styles from './InventoryCheck.module.css';

const today = new Date().toISOString().split('T')[0];

const InventoryCheck: FC = () => {
    const { seedings, fetchData, updateSeeding, approveInventory, rejectInventory } = useAppContext();
    const isRequester = useAppContext().currentUser?.role === 'requester';
    const [activeTab, setActiveTab] = useState<'대기' | '완료'>('대기');
    const [processingId, setProcessingId] = useState<string | null>(null);

    // 날짜 필터 상태 — 기본값: 오늘
    const [startDate, setStartDate] = useState<string>(today);
    const [endDate, setEndDate] = useState<string>(today);

    // 컴포넌트 마운트 시 최신 데이터 동기화
    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 날짜 범위 필터 공통 함수
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

    const handleApprove = async (id: string) => {
        const dbId = seedings.find(s => s.id === id)?._dbId;
        if (!dbId) return alert('재고 연동을 위한 데이터 정보가 부족합니다.');

        try {
            setProcessingId(id);
            await approveInventory({
                requestId: id,
                dbId: String(dbId),
                updateSeeding,
                S_APPROVED
            });
        } catch (err) {
            console.error('[승인 오류]', err);
            alert('승인 처리 중 오류가 발생했습니다. 콘솔 창의 상세 로그를 확인해주세요.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        try {
            setProcessingId(id);
            await rejectInventory({
                requestId: id,
                updateSeeding,
                S_REJECTED
            });
        } catch (err) {
            console.error('[반려 오류]', err);
            alert('반려 처리 중 오류가 발생했습니다.');
        } finally {
            setProcessingId(null);
        }
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
                <button
                    className={`btn btn-primary`}
                    onClick={() => setActiveTab('대기')}
                    style={{
                        opacity: activeTab === '대기' ? 1 : 0.45,
                    }}
                >
                    <PackageSearch size={18} /> 승인 대기 건 ({pendingList.length})
                </button>
                <button
                    className={`btn btn-primary`}
                    onClick={() => setActiveTab('완료')}
                    style={{
                        opacity: activeTab === '완료' ? 1 : 0.45,
                    }}
                >
                    <ListChecks size={18} /> 처리 완료 내역 ({completedList.length})
                </button>
            </div>

            <Card title={activeTab === '대기' ? '승인 대기 목록' : '처리 완료 (승인/반려) 목록'}>
                <div className="table-container">
                    <table className={`table ${styles.tableMinWidth940}`}>
                        <thead>
                            <tr className={styles.nowrapCol}>
                                <th style={{ width: '120px' }}>요청ID</th>
                                <th style={{ width: '100px' }}>브랜드</th>
                                <th style={{ width: '110px' }}>요청일자</th>
                                <th style={{ width: '90px' }}>요청자</th>
                                <th style={{ width: '220px' }}>상품명</th>
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
                                    <td className={styles.idColInfo}>{row.id}</td>
                                    <td className={styles.nowrapCol}>{row.brand}</td>
                                    <td className={styles.nowrapCol}>{row.date}</td>
                                    <td className={styles.nowrapCol}>{row.orderName}</td>
                                    <td className={styles.ellipsisCol220}>{row.itemName}</td>
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
                                                    disabled={processingId === row.id}
                                                    style={{ minWidth: '94px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                >
                                                    {processingId === row.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                    {processingId === row.id ? '처리중' : '승인'}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(row.id)}
                                                    className={`btn ${styles.btnReject}`}
                                                    disabled={processingId === row.id}
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
                                    <td colSpan={8} className={styles.emptyStateTable}>
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
