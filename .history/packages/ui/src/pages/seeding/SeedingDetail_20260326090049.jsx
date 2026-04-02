import { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '@core/contexts/AppContext';

export default function SeedingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { seedings, updateSeeding, deleteSeeding, statuses } = useContext(AppContext);
    const [data, setData] = useState(null);

    useEffect(() => {
        const found = seedings.find(s => s.id === id);
        if (!found) {
            alert('존재하지 않는 시딩 요청입니다.');
            navigate('/seeding');
        } else {
            setData(found);
        }
    }, [id, seedings, navigate]);

    if (!data) return <div>Loading...</div>;

    const handleChange = (e) => {
        setData({
            ...data,
            [e.target.name]: e.target.value
        });
    };

    const handleUpdate = () => {
        updateSeeding(data.id, data);
        alert('시딩 요청이 수정되었습니다.');
        navigate('/seeding');
    };

    const handleDelete = () => {
        if (window.confirm('시딩 요청을 정말 삭제하시겠습니까?')) {
            deleteSeeding(data.id);
            alert('삭제되었습니다.');
            navigate('/seeding');
        }
    };

    return (
        <>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>시딩 상세 및 수정: {data.id}</h2>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" onClick={() => navigate(-1)}>뒤로가기</button>
                    <button className="btn btn-primary" onClick={handleUpdate}>저장하기</button>
                    <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDelete}>삭제하기</button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title">기본 정보 및 상태</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">진행 상태</label>
                        <select className="form-select" name="status" value={data.status || ''} onChange={handleChange}>
                            {statuses.map((s, i) => <option key={i} value={s}>{s}</option>)}
                        </select>
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="text" className="form-input" name="zipcode" style={{ width: '120px' }} placeholder="우편번호" value={data.zipcode || ''} onChange={handleChange} />
                            <input type="text" className="form-input" name="address" placeholder="전체 주소" value={data.address || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title">상품 상세 정보</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">자사상품코드</label>
                        <input type="text" className="form-input" name="itemCode" value={data.itemCode || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">상품명(쇼핑몰)</label>
                        <input type="text" className="form-input" name="itemName" value={data.itemName || data.items || ''} onChange={(e) => { handleChange(e); setData({ ...data, itemName: e.target.value, items: e.target.value }); }} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">옵션명(색상)</label>
                        <input type="text" className="form-input" name="option1" value={data.option1 || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">옵션명2(사이즈)</label>
                        <input type="text" className="form-input" name="option2" value={data.option2 || ''} onChange={handleChange} />
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
        </>
    );
}
