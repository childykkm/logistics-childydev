import { useState, useContext, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '@core/contexts/AppContext';
import { seedingService } from '@core/services/seedingService';
import { S_PENDING, S_REVIEWING, STATUS_MAP, STATUS_LABEL, STATUS_COLORS } from '@core/constants/status';
import DaumPostcode from 'react-daum-postcode';
import ProductSearchModal from '@ui/components/ProductSearchModal';

export default function SeedingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { seedings, updateSeeding, deleteSeeding } = useContext(AppContext);
    const [data, setData] = useState(null);
    const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [statusLogs, setStatusLogs] = useState([]);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!data?._dbId) return;
        
        // 상태 이력과 상세 정보를 동시에 조회해서 정확한 생성 시간을 확보
        Promise.all([
            seedingService.getStatusLogs(data._dbId).catch(() => []),
            seedingService.getSeedingDetail(data._dbId).catch(() => ({}))
        ]).then(([resLogs, resDetail]) => {
            let logs = Array.isArray(resLogs) ? resLogs : (resLogs?.data || resLogs?.logs || []);
            const detailInfo = resDetail?.data || resDetail || {};

            // 2단계 중복 제거 로직 (API 데이터 레벨에서 처리)
            logs = logs.filter((log, index, arr) => {
                if (index === 0) return true;
                const prev = arr[index - 1];
                const currStatus = log.new_status || log.status || '';
                const prevStatus = prev.new_status || prev.status || '';
                const currTime = log.created_at || '';
                const prevTime = prev.created_at || '';
                
                // 같은 시간에 동일 상태로 바뀐 것은 필터링
                if (currStatus === prevStatus && currTime === prevTime) return false;
                return true;
            });

            // 초기 '요청 등록(pending)' 상태가 응답에 없으면, 상세 API의 정확한 created_at 시간을 사용해 강제 생성
            const hasPending = logs.some(l => (l.new_status || l.status) === 'pending');
            if (!hasPending) {
                // 상세 API의 created_at을 최우선으로, 없으면 AppContext의 date(주문일자) 참조
                const exactCreatedAt = detailInfo.created_at || detailInfo.order_date || data.date;
                if (exactCreatedAt) {
                    logs.unshift({
                        new_status: 'pending',
                        created_at: exactCreatedAt,
                        changed_by: detailInfo.requester_name || data.requester || data.orderName,
                        memo: '시스템 최초 접수'
                    });
                }
            }
            
            setStatusLogs(logs);
        }).catch(e => console.error("상태 이력 및 상세 조회 실패:", e));
    }, [data]);

    useEffect(() => {
        // 최초 1회만 세팅, 저장 후 fetchData로 seedings가 바뀌어도 덮어쓰지 않음
        if (initializedRef.current) return;
        const found = seedings.find(s => s.id === id);
        if (!found) {
            if (seedings.length > 0) {
                alert('존재하지 않는 시딩 요청입니다.');
                navigate('/seeding');
            }
        } else {
            setData(found);
            initializedRef.current = true;
        }
    }, [id, seedings, navigate]);

    if (!data) return <div>Loading...</div>;

    const handleChange = (e) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handlePostcodeComplete = (postcodeData) => {
        let fullAddress = postcodeData.address;
        let extraAddress = '';
        if (postcodeData.addressType === 'R') {
            if (postcodeData.bname !== '') extraAddress += postcodeData.bname;
            if (postcodeData.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${postcodeData.buildingName}` : postcodeData.buildingName;
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
        }
        setData(prev => ({ ...prev, zipcode: postcodeData.zonecode, address: fullAddress }));
        setIsPostcodeOpen(false);
    };

    const handleProductSelect = (product) => {
        setData(prev => ({
            ...prev,
            itemCode: product.code,
            itemName: product.name,
            option1: product.option1,
            option2: product.option2 || '',
            price: product.price,
        }));
        setIsProductModalOpen(false);
    };

    const handleUpdate = async () => {
        try {
            const payload = {
                ...data,
                address: data.address + (data.addressDetail ? ' ' + data.addressDetail : ''),
            };
            await updateSeeding(data.id, payload);
            alert('시딩 요청이 수정되었습니다.');
            navigate('/seeding');
        } catch (e) {
            alert('수정 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('시딩 요청을 정말 삭제하시겠습니까?')) {
            await deleteSeeding(data._dbId ?? data.id);
            alert('삭제되었습니다.');
            navigate('/seeding');
        }
    };

    const isModifiable = data.status === S_PENDING || data.status === S_REVIEWING;

    return (
        <>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>시딩 상세 및 수정: {data.id}</h2>
                    {!isModifiable && (
                        <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: 'var(--danger)' }}>
                            * '{data.status}' 상태에서는 내용을 수정하거나 삭제할 수 없습니다. (대기, 검토중만 가능)
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" onClick={() => navigate(-1)}>뒤로가기</button>
                    {isModifiable && (
                        <>
                            <button className="btn btn-primary" onClick={handleUpdate}>저장하기</button>
                            <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDelete}>삭제하기</button>
                        </>
                    )}
                </div>
            </div>

            {/* 상태 변경 타임라인 (폼 위쪽으로 이동됨) */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title">상태 변경 이력</div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', overflowX: 'auto', padding: '16px 0', minHeight: '80px' }}>
                    {statusLogs.length > 0 ? statusLogs.map((log, index) => {
                        // 백엔드의 정확한 키인 new_status 를 가장 우선 사용
                        const rawStatus = log.new_status || log.status || log.to_status || log.status_name || log.action_type || '';
                        
                        // mappedStatus: 영문이면 한글 코드로, 한글이면 그대로
                        const mappedStatus = STATUS_MAP[rawStatus] || rawStatus;
                        let statusName = STATUS_LABEL[mappedStatus] || rawStatus;
                        
                        const timeString = log.created_at || log.updated_at || log.date || '';
                        const colorData = STATUS_COLORS[mappedStatus] || { bg: '#F3F4F6', text: '#111827' };

                        return (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', minWidth: '110px' }}>
                                    <span className="badge" style={{ background: colorData.bg, color: colorData.text, padding: '6px 12px', fontSize: '0.9375rem', fontWeight: 600 }}>
                                        {statusName || '알수없음'}
                                    </span>
                                    <span style={{ fontSize: '0.8125rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                                        {timeString}
                                    </span>
                                </div>
                                {index < statusLogs.length - 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', color: '#D1D5DB' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div style={{ color: '#9CA3AF', fontSize: '0.9375rem', textAlign: 'center', width: '100%' }}>
                            상태 변경 이력이 존재하지 않습니다.
                        </div>
                    )}
                </div>
            </div>

            <fieldset disabled={!isModifiable} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, width: '100%' }}>
                <div className="card" style={{ marginBottom: '16px' }}>
                    <div className="card-title">기본 정보 및 상태</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">진행 상태</label>
                            <input type="text" className="form-input" value={data.status || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">브랜드</label>
                            <input type="text" className="form-input" name="brand" value={data.brand || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">주문일자</label>
                            <input type="text" className="form-input" name="date" value={data.date || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">주문번호(쇼핑몰)</label>
                            <input type="text" className="form-input" name="orderNo" value={data.orderNo || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '16px' }}>
                    <div className="card-title">주문자 및 수취인 정보</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">주문자명</label>
                            <input type="text" className="form-input" name="orderName" value={data.orderName || data.requester || ''} onChange={(e) => { handleChange(e); setData(prev => ({ ...prev, requester: e.target.value })); }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">주문자 휴대폰</label>
                            <input type="text" className="form-input" name="orderPhone" value={data.orderPhone || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">수취인명</label>
                            <input type="text" className="form-input" name="recipientName" value={data.recipientName || data.recipient || ''} onChange={(e) => { handleChange(e); setData(prev => ({ ...prev, recipient: e.target.value })); }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">수취인 휴대폰</label>
                            <input type="text" className="form-input" name="recipientPhone" value={data.recipientPhone || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group full">
                            <label className="form-label">수취인 주소</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input type="text" className="form-input" name="zipcode" style={{ width: '120px', background: '#F9FAFB' }} placeholder="우편번호" readOnly value={data.zipcode || ''} />
                                <button className="btn btn-outline" style={{ padding: '8px 16px' }} onClick={() => setIsPostcodeOpen(true)}>주소 검색</button>
                            </div>
                            <input type="text" className="form-input" name="address" placeholder="기본 주소" readOnly style={{ background: '#F9FAFB', marginBottom: '8px' }} value={data.address || ''} />
                            <input type="text" className="form-input" name="addressDetail" placeholder="상세 주소" value={data.addressDetail || ''} onChange={handleChange} />
                            {isPostcodeOpen && (
                                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '12px', overflow: 'hidden', padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>주소 검색</h3>
                                            <button onClick={() => setIsPostcodeOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
                                        </div>
                                        <DaumPostcode onComplete={handlePostcodeComplete} autoClose={false} style={{ height: '400px' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '16px' }}>
                    <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>상품 상세 정보</span>
                        <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.875rem' }} onClick={() => setIsProductModalOpen(true)}>상품 검색으로 변경</button>
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">자사상품코드</label>
                            <input type="text" className="form-input" value={data.itemCode || ''} readOnly style={{ background: '#F3F4F6' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">상품명(쇼핑몰)</label>
                            <input type="text" className="form-input" value={data.itemName || ''} readOnly style={{ background: '#F3F4F6' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">옵션명(쇼핑몰)</label>
                            <input type="text" className="form-input" value={data.option1 || ''} readOnly style={{ background: '#F3F4F6' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">옵션명2(쇼핑몰)</label>
                            <input type="text" className="form-input" value={data.option2 || ''} readOnly style={{ background: '#F3F4F6' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">옵션명3(쇼핑몰)</label>
                            <input type="text" className="form-input" name="option3" value={data.option3 || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">주문수량</label>
                            <input type="number" className="form-input" name="qty" value={data.qty || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">상품코드(셀릭)</label>
                            <input type="text" className="form-input" name="sellicCode" value={data.sellicCode || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">옵션코드(셀릭)</label>
                            <input type="text" className="form-input" name="sellicOption" value={data.sellicOption || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '40px' }}>
                    <div className="card-title">금액 및 기타 (비고)</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">판매가(쇼핑몰)</label>
                            <input type="text" className="form-input" name="price" value={data.price || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">결제금액(쇼핑몰)</label>
                            <input type="text" className="form-input" name="paymentPrice" value={data.paymentPrice || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">정산예정금액</label>
                            <input type="text" className="form-input" name="expectedPrice" value={data.expectedPrice || data.expected || ''} onChange={(e) => { handleChange(e); setData(prev => ({ ...prev, expected: e.target.value })); }} />
                        </div>
                        <div className="form-group full">
                            <label className="form-label">비고</label>
                            <textarea className="form-textarea" name="memo" value={data.memo || ''} onChange={handleChange}></textarea>
                        </div>
                    </div>
                </div>
            </fieldset>

            <ProductSearchModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onSelect={handleProductSelect}
                selectedBrand={data.brand}
            />
        </>
    );
}
