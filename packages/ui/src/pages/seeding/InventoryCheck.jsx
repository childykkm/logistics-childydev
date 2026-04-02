import { useState, useContext, useMemo } from 'react';
import { PackageSearch, CheckCircle2, XCircle, ListChecks, Loader2 } from 'lucide-react';
import { AppContext } from '@core/contexts/AppContext';
import { productService } from '@core/services/productService';
import { STATUS_COLORS, STATUS_LABEL } from '@core/constants/status';
import { S_PENDING, S_REVIEWING, S_APPROVED, S_REJECTED } from '@core/constants/status';

export default function InventoryCheck() {
    const { seedings, updateSeeding } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState('대기');
    const [processingId, setProcessingId] = useState(null);

    // filter data with useMemo for stability and performance
    const pendingList = useMemo(() => {
        return seedings.filter(s => s.status === S_PENDING || s.status === S_REVIEWING);
    }, [seedings]);

    const completedList = useMemo(() => {
        return seedings.filter(s => s.status === S_APPROVED || s.status === S_REJECTED);
    }, [seedings]);

    const handleApprove = async (id) => {
        if (window.confirm(`요청 ${id}의 재고 차감을 승인하시겠습니까?`)) {
            try {
                const targetInfo = seedings.find(s => s.id === id);
                const dbId = targetInfo?._dbId || id;
                
                console.log(`[승인 프로세스 시작] 요청 ID: ${id}, 내부 DB 식별자: ${dbId}`);
                setProcessingId(id);
                
                // 1단계: 재고 차감 API 호출
                console.log(`[1/2단계] 재고 차감 API 호출 중... (deductInventory) dbId 전달`);
                const deductResult = await productService.deductInventory(dbId, false);
                console.log(`[1/2단계 완료] 재고 차감 API 정상 응답:`, deductResult);

                // 2단계: 상태 스토어 및 DB 반영
                console.log(`[2/2단계] 상태값 승인(S_APPROVED) 업데이트 중...`);
                await updateSeeding(id, { status: S_APPROVED });
                console.log(`[2/2단계 완료] 상태값 업데이트 성공`);

                console.log(`[승인 프로세스 최종 완료] 모든 과정이 완료되었습니다.`);
                alert('승인 처리 및 재고 차감이 완료되었습니다.');
            } catch (err) {
                console.error("[승인 프로세스 에러 발생] 에러 상세 정보:", err);
                if (err.response) {
                    console.error("[에러 상태 코드]:", err.response.status);
                    console.error("[에러 응답 데이터]:", err.response.data);
                }
                alert('승인 처리 중 오류가 발생했습니다. 콘솔 창의 상세 로그를 확인해주세요.');
            } finally {
                console.log(`[프로세스 종료] UI 스피너 해제`);
                setProcessingId(null);
            }
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt(`요청 ${id} 반려 사유를 입력해주세요.`);
        if (reason) {
            try {
                setProcessingId(id);
                // 상태변경은 request 단위 API 사용
                await updateSeeding(id, { status: S_REJECTED });
                alert('반려 처리가 완료되었습니다.');
            } finally {
                setProcessingId(null);
            }
        }
    };

    const getStatusBadge = (status) => {
        const c = STATUS_COLORS[status];
        if (!c) return <span className="badge">{status}</span>;
        return <span className="badge" style={{ background: c.bg, color: c.text }}>{STATUS_LABEL[status] ?? status}</span>;
    };

    const dataToRender = activeTab === '대기' ? pendingList : completedList;

    return (
        <>
            <div className="card" style={{ background: 'var(--primary)', color: 'white', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>재고 보정 상태</h2>
                        <p style={{ color: '#E0E7FF', fontSize: '0.9375rem' }}>물류 담당자님, Cafe24 재고 자동 차감을 진행하고 처리할 수 있습니다.</p>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, padding: '16px 32px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>
                        대기 {pendingList.length}건
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button
                    className={`btn ${activeTab === '대기' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('대기')}
                >
                    <PackageSearch size={18} /> 승인 대기 건 ({pendingList.length})
                </button>
                <button
                    className={`btn ${activeTab === '완료' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('완료')}
                    style={{ background: activeTab === '완료' ? 'var(--surface-color)' : '', color: activeTab === '완료' ? 'var(--primary)' : '', borderColor: activeTab === '완료' ? 'var(--primary)' : '' }}
                >
                    <ListChecks size={18} /> 처리 완료 내역 ({completedList.length})
                </button>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                <div className="card-title">{activeTab === '대기' ? '승인 대기 목록' : '처리 완료 (승인/반려) 목록'}</div>
                <div className="table-container">
                    <table className="table" style={{ minWidth: '940px' }}>
                        <thead>
                            <tr style={{ whiteSpace: 'nowrap' }}>
                                <th style={{ width: '120px' }}>요청ID</th>
                                <th style={{ width: '100px' }}>브랜드</th>
                                <th style={{ width: '110px' }}>요청일자</th>
                                <th style={{ width: '90px' }}>요청자</th>
                                <th style={{ width: '220px' }}>상품명</th>
                                <th style={{ width: '110px' }}>시딩 수량</th>
                                <th style={{ width: '90px' }}>상태</th>
                                {activeTab === '대기' ? (
                                    <th style={{ width: '180px' }}>승인/반려 처리</th>
                                ) : (
                                    <th style={{ width: '200px' }}>처리 내역</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {dataToRender.map((row) => (
                                <tr key={row.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--info)', whiteSpace: 'nowrap' }}>{row.id}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.brand}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.date}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.orderName || row.requester}</td>
                                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.itemName || row.items}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}><span className="badge badge-warning" style={{ fontSize: '0.875rem' }}>{row.qty}개</span></td>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        {getStatusBadge(row.status)}
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        {activeTab === '대기' ? (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleApprove(row.id)}
                                                    className="btn"
                                                    style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '6px 12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    disabled={processingId === row.id}
                                                >
                                                    {processingId === row.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                    {processingId === row.id ? '처리중' : '승인'}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(row.id)}
                                                    className="btn"
                                                    style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '6px 12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    disabled={processingId === row.id}
                                                >
                                                    <XCircle size={16} /> 반려
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                {row.status === S_REJECTED ? `반려 사유: ${row.memo}` : '승인 완료/재고 차감됨'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {dataToRender.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <PackageSearch size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                                        <p>{activeTab === '대기' ? '승인 대기 중인 시딩 요청이 없습니다.' : '처리 완료된 시딩 요청이 없습니다.'}</p>
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
