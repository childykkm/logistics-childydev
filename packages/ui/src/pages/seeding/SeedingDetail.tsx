import React, { useState, useEffect, useRef, FC, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@core/contexts/AppContext';
import { usePermission } from '@core/hooks/usePermission';
import { seedingService } from '@core/services/seedingService';
import { S_PENDING, S_REVIEWING, STATUS_MAP, STATUS_LABEL, STATUS_COLORS } from '@core/constants/status';
import DaumPostcode from 'react-daum-postcode';
import ProductSearchModal from '../../components/ProductSearchModal';

const SeedingDetail: FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { seedings, updateSeeding, deleteSeeding, fetchData, currentUser } = useAppContext();
    const { isRequester, isAdmin } = usePermission();
    const [data, setData] = useState<any>(null);
    const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [statusLogs, setStatusLogs] = useState<any[]>([]);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!data?._dbId) return;
        
        Promise.all([
            seedingService.getStatusLogs(data._dbId).catch(() => []),
            seedingService.getSeedingDetail(data._dbId).catch(() => ({}))
        ]).then(([resLogs, resDetail]) => {
            let logs = Array.isArray(resLogs) ? resLogs : ((resLogs as any)?.data || (resLogs as any)?.logs || []);
            const detailInfo = (resDetail as any)?.data || resDetail || {};

            logs = logs.filter((log: any, index: number, arr: any[]) => {
                if (index === 0) return true;
                const prev = arr[index - 1];
                const currStatus = log.new_status || log.status || '';
                const prevStatus = prev.new_status || prev.status || '';
                const currTime = log.created_at || '';
                const prevTime = prev.created_at || '';
                if (currStatus === prevStatus && currTime === prevTime) return false;
                return true;
            });

            const hasPending = logs.some((l: any) => (l.new_status || l.status) === 'pending');
            if (!hasPending) {
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
        if (initializedRef.current) return;
        const found = seedings.find(s => String(s.id) === String(id));
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

    if (!data) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        let formatted = raw;
        if (raw.length <= 3) formatted = raw;
        else if (raw.length <= 7) formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
        else formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
        setData({ ...data, [e.target.name]: formatted });
    };

    const handlePostcodeComplete = (postcodeData: any) => {
        let fullAddress = postcodeData.address;
        let extraAddress = '';
        if (postcodeData.addressType === 'R') {
            if (postcodeData.bname !== '') extraAddress += postcodeData.bname;
            if (postcodeData.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${postcodeData.buildingName}` : postcodeData.buildingName;
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
        }
        setData((prev: any) => ({ ...prev, zipcode: postcodeData.zonecode, address: fullAddress }));
        setIsPostcodeOpen(false);
    };

    const handleProductSelect = (product: any) => {
        setData((prev: any) => ({
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
            fetchData();
        } catch (e) {
            alert('수정 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('시딩 요청을 정말 삭제하시겠습니까?')) {
            await deleteSeeding(data._dbId ?? data.id);
            alert('삭제되었습니다.');
            navigate('/seeding');
            fetchData();
        }
    };

    const isModifiable = data.status === S_PENDING || data.status === S_REVIEWING || isAdmin;

    return (
        <div>
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
                    {isModifiable && !isRequester && (
                        <>
                            <button className="btn btn-primary" onClick={handleUpdate}>저장하기</button>
                            <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDelete}>삭제하기</button>
                        </>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title">상태 변경 이력</div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', overflowX: 'auto', padding: '16px 0', minHeight: '80px' }}>
                    {statusLogs.length > 0 ? statusLogs.map((log: any, index: number) => {
                        const rawStatus = log.new_status || log.status || '';
                        const mappedStatus = (STATUS_MAP as any)[rawStatus] || rawStatus;
                        const statusName = (STATUS_LABEL as any)[mappedStatus] || rawStatus;
                        const timeString = log.created_at || '';
                        const colorData = (STATUS_COLORS as any)[mappedStatus] || { bg: '#F3F4F6', text: '#111827' };

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
                        <div style={{ color: '#9CA3AF', fontSize: '0.9375rem', textAlign: 'center', width: '100%' }}>상태 변경 이력이 존재하지 않습니다.</div>
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
                            <input type="text" className="form-input" name="brand" value={data.brand || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} onChange={handleChange} />
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
                            <input type="text" className="form-input" name="orderName" value={data.orderName || data.requester || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">주문자 휴대폰</label>
                            <input type="text" className="form-input" name="orderPhone" value={data.orderPhone || ''} onChange={handlePhoneChange} maxLength={13} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">수취인명</label>
                            <input type="text" className="form-input" name="recipientName" value={data.recipientName || data.recipient || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">수취인 휴대폰</label>
                            <input type="text" className="form-input" name="recipientPhone" value={data.recipientPhone || ''} onChange={handlePhoneChange} maxLength={13} />
                        </div>
                        <div className="form-group full">
                            <label className="form-label">수취인 주소</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input type="text" className="form-input" name="zipcode" style={{ width: '120px', background: '#F9FAFB' }} placeholder="우편번호" readOnly value={data.zipcode || ''} />
                                <button className="btn btn-outline" type="button" onClick={() => setIsPostcodeOpen(true)}>주소 검색</button>
                            </div>
                            <input type="text" className="form-input" name="address" placeholder="기본 주소" readOnly style={{ background: '#F9FAFB', marginBottom: '8px' }} value={data.address || ''} />
                            <input type="text" className="form-input" name="addressDetail" placeholder="상세 주소" value={data.addressDetail || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '16px' }}>
                    <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>상품 상세 정보</span>
                        {false && <button className="btn btn-outline" type="button" style={{ padding: '6px 14px', fontSize: '0.875rem' }} onClick={() => setIsProductModalOpen(true)}>상품 검색으로 변경</button>}
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">자사상품코드</label>
                            <input type="text" className="form-input" value={data.itemCode || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">상품명(쇼핑몰)</label>
                            <input type="text" className="form-input" value={data.itemName || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">옵션명(쇼핑몰)</label>
                            <input type="text" className="form-input" value={data.option1 || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">옵션명2(쇼핑몰)</label>
                            <input type="text" className="form-input" value={data.option2 || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">옵션명3(쇼핑몰)</label>
                            <input type="text" className="form-input" value={data.option3 || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">주문수량</label>
                            <input type="number" className="form-input" value={data.qty || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">상품코드(셀릭)</label>
                            <input type="text" className="form-input" value={data.sellicCode || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">옵션코드(셀릭)</label>
                            <input type="text" className="form-input" value={data.sellicOption || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '40px' }}>
                    <div className="card-title">금액 및 기타 (비고)</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">판매가(쇼핑몰)</label>
                            <input type="text" className="form-input" value={data.price || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">결제금액(쇼핑몰)</label>
                            <input type="text" className="form-input" value={data.paymentPrice || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">정산예정금액</label>
                            <input type="text" className="form-input" value={data.expectedPrice || data.expected || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }} />
                        </div>
                        <div className="form-group full">
                            <label className="form-label">비고</label>
                            <textarea className="form-textarea" name="memo" value={data.memo || ''} readOnly style={{ background: '#F3F4F6', cursor: 'not-allowed' }}></textarea>
                        </div>
                    </div>
                </div>
            </fieldset>

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

            <ProductSearchModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onSelect={handleProductSelect}
                selectedBrand={data.brand}
            />
        </div>
    );
};

export default SeedingDetail;
