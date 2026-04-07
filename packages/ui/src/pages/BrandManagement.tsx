import { useState, useContext, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Link, CheckCircle, Loader2, ShieldCheck, Store, Unlink } from 'lucide-react';
import { brandService } from '@core/services/brandService';
import { authService } from '@core/services/authService';
import { AppContext } from '@core/contexts/AppContext';
import { usePermission } from '@core/hooks/usePermission';

const emptyForm = { name: '', mall_id: '', description: '' };

export default function BrandManagement() {
    const { brands, setBrands, fetchData, currentUser } = useContext(AppContext);
    const { isAdmin } = usePermission();
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // null = 신규, object = 수정
    const [form, setForm] = useState(emptyForm);
    const [oauthStatus, setOauthStatus] = useState({}); // { [brandId]: 'loading' | 'done' | 'error' }

    const brandList = Array.isArray(brands) ? brands : (brands?.data || []);

    // 브랜드 목록이 로드되면 is_connected 값으로 초기 OAuth 상태 세팅
    useEffect(() => {
        if (brandList.length > 0) {
            const initialStatus = {};
            brandList.forEach(brand => {
                if (Number(brand.is_connected) === 1) {
                    initialStatus[brand.id] = 'done';
                }
            });
            setOauthStatus(prev => ({ ...initialStatus, ...prev }));
        }
    }, [brands]);

    // 인증 대기 중일 때 자동 갱신 (포커스 복귀 시점 & 3초 간격 폴링)
    useEffect(() => {
        const hasWaiting = Object.values(oauthStatus).some(s => s === 'waiting');
        if (!hasWaiting) return;

        const checkStatus = async () => {
            try {
                // fetchData() 대신 조용히 서버에 최신 브랜드 목록만 질의 (전체 로딩 방지)
                const res = await brandService.getBrands();
                const latestBrands = Array.isArray(res) ? res : (res?.data || []);

                let isCompleted = false;
                latestBrands.forEach(b => {
                    if (oauthStatus[b.id] === 'waiting' && Number(b.is_connected) === 1) {
                        setOauthStatus(prev => ({ ...prev, [b.id]: 'done' }));
                        isCompleted = true;
                    }
                });

                // 인증 성공을 감지했을 때 딱 한 번만 전역 데이터를 동기화
                if (isCompleted) {
                    fetchData();
                }
            } catch (err) {
                // 백그라운드 체크 중 발생한 오류는 무시
            }
        };

        // 1. 새 창 닫고 돌아왔을 때 즉시 반영
        window.addEventListener('focus', checkStatus);

        // 2. 3초마다 백그라운드 체크
        const timer = setInterval(checkStatus, 3000);

        return () => {
            window.removeEventListener('focus', checkStatus);
            clearInterval(timer);
        };
    }, [oauthStatus, fetchData]);

    const openCreate = () => {
        setEditTarget(null);
        setForm(emptyForm);
        setIsModalOpen(true);
    };

    const openEdit = (brand) => {
        setEditTarget(brand);
        setForm({
            name: brand.name || brand.brand_name || '',
            mall_id: brand.mall_id || '',
            description: brand.description || '',
        });
        setIsModalOpen(true);
    };

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        if (!form.name.trim()) return alert('브랜드 이름을 입력해주세요.');
        if (!form.mall_id.trim()) return alert('쇼핑몰 관리자 아이디(mall_id)를 입력해주세요.');

        setLoading(true);
        try {
            if (editTarget) {
                await brandService.updateBrand(editTarget.id, form);
            } else {
                await brandService.createBrand(form);
            }
            alert(editTarget ? '브랜드가 수정되었습니다.' : '브랜드가 생성되었습니다.');
            setIsModalOpen(false);
            fetchData(); // 전역 브랜드 목록 갱신
        } catch (err) {
            alert('저장 실패: ' + (err?.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (brand) => {
        if (!window.confirm(`"${brand.name}" 브랜드를 삭제하시겠습니까?`)) return;
        setLoading(true);
        try {
            await brandService.deleteBrand(brand.id);
            alert('삭제되었습니다.');
            fetchData();
        } catch (err) {
            alert('삭제 실패: ' + (err?.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (brand) => {
        const brandId = brand.id;
        const mall_id = brand.mall_id;

        if (!mall_id) {
            return alert('이 브랜드에 설정된 쇼핑몰 아이디(mall_id)가 없습니다. 브랜드를 수정하여 mall_id를 먼저 입력해주세요.');
        }

        setOauthStatus(prev => ({ ...prev, [brandId]: 'loading' }));
        try {
            const res = await authService.getOAuthUrl(mall_id);
            const oauthUrl = res?.auth_url || res?.url || res?.oauth_url || res?.redirect_url;
            if (oauthUrl) {
                window.open(oauthUrl, '_blank', 'width=640,height=740,noopener');
                // 창만 열린 것 — 실제 인증 완료는 사용자 확인 후 서버 재조회로 판단
                setOauthStatus(prev => ({ ...prev, [brandId]: 'waiting' }));
            } else {
                throw new Error('OAuth URL이 응답에 없습니다.');
            }
        } catch (err) {
            setOauthStatus(prev => ({ ...prev, [brandId]: 'error' }));
            alert('OAuth 연결 실패: ' + (err?.response?.data?.message || err.message));
        }
    };


    const handleDisconnect = async (brand) => {
        if (!window.confirm(`"${brand.name}" 브랜드의 OAuth 연결을 해제하시겠습니까?`)) return;
        const brandId = brand.id;
        setOauthStatus(prev => ({ ...prev, [brandId]: 'loading' }));
        try {
            await brandService.disconnectBrand(brandId);
            setOauthStatus(prev => ({ ...prev, [brandId]: null }));
            fetchData();
        } catch (err) {
            setOauthStatus(prev => ({ ...prev, [brandId]: 'done' }));
            alert('OAuth 해제 실패: ' + (err?.response?.data?.message || err.message));
        }
    };

    return (
        <>
            {/* Header */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 className="card-title" style={{ margin: 0 }}>브랜드 관리</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        브랜드별 Cafe24 쇼핑몰 아이디를 등록하고 OAuth 인증을 연결합니다.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreate} disabled={loading} style={{ visibility: isAdmin ? 'visible' : 'hidden' }}>
                    <Plus size={18} /> 브랜드 추가
                </button>
            </div>

            {/* Brand List */}
            <div className="card">
                <div className="table-container">
                    <table className="table" style={{ minWidth: '700px', tableLayout: 'auto', width: '100%' }}>
                        <thead>
                            <tr>
                                <th>브랜드명</th>
                                <th>쇼핑몰 관리자 아이디 (mall_id)</th>
                                <th>설명</th>
                                <th style={{ textAlign: 'center' }}>OAuth 인증</th>
                                {isAdmin && <th style={{ textAlign: 'center' }}>관리</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {brandList.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                        <Store size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                                        등록된 브랜드가 없습니다. 브랜드를 추가해보세요.
                                    </td>
                                </tr>
                            ) : brandList.map((brand) => {
                                const oStatus = oauthStatus[brand.id];
                                return (
                                    <tr key={brand.id}>
                                        <td style={{ fontWeight: 600 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                                                    {(brand.name || brand.brand_name || '?').slice(0, 1)}
                                                </div>
                                                {brand.name || brand.brand_name}
                                            </div>
                                        </td>
                                        <td>
                                            {brand.mall_id
                                                ? <code style={{ background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.875rem' }}>{brand.mall_id}</code>
                                                : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>미설정</span>
                                            }
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{brand.description || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                {/* OAuth 연결 버튼 */}
                                                <button
                                                    className="btn"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8125rem',
                                                        background: oStatus === 'done' ? '#ECFDF5' : oStatus === 'error' ? '#FEF2F2' : '#EEF2FF',
                                                        color: oStatus === 'done' ? '#047857' : oStatus === 'error' ? '#DC2626' : '#4F46E5',
                                                        border: `1px solid ${oStatus === 'done' ? '#A7F3D0' : oStatus === 'error' ? '#FECACA' : '#C7D2FE'}`,
                                                        cursor: (oStatus === 'loading' || oStatus === 'done' || oStatus === 'waiting' || oStatus === 'checking') ? 'not-allowed' : 'pointer',
                                                        opacity: (oStatus === 'waiting' || oStatus === 'checking') ? 0.6 : 1,
                                                    }}
                                                    onClick={() => handleOAuth(brand)}
                                                    disabled={oStatus === 'loading' || oStatus === 'done' || oStatus === 'waiting' || oStatus === 'checking'}
                                                >
                                                    {(oStatus === 'loading' || oStatus === 'checking') && <Loader2 size={14} className="animate-spin" />}
                                                    {oStatus === 'done' && <CheckCircle size={14} />}
                                                    {(oStatus === 'error' || !oStatus) && <Link size={14} />}
                                                    {oStatus === 'waiting' && <Loader2 size={14} />}
                                                    {oStatus === 'done' ? '인증됨'
                                                        : oStatus === 'waiting' ? '인증 대기 중'
                                                            : oStatus === 'checking' ? '확인 중...'
                                                                : oStatus === 'error' ? '재시도'
                                                                    : oStatus === 'loading' ? '연결 중...'
                                                                        : 'OAuth 연결'}
                                                </button>


                                                {/* 연결 해제 버튼 (서버 확인 후 인증된 경우만) */}
                                                {oStatus === 'done' && (
                                                    <button
                                                        className="btn"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.8125rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                                                        onClick={() => handleDisconnect(brand)}
                                                        title="OAuth 연결 해제"
                                                    >
                                                        <Unlink size={13} /> 해제
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        {isAdmin && (
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8125rem' }} onClick={() => openEdit(brand)}>
                                                    <Edit size={14} /> 수정
                                                </button>
                                                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8125rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(brand)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* OAuth 안내 */}
            <div className="card" style={{ marginTop: '16px', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <ShieldCheck size={20} color="#4F46E5" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <strong style={{ color: '#3730A3', fontSize: '0.9rem' }}>OAuth 인증이란?</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#4338CA', lineHeight: 1.6 }}>
                            브랜드별 Cafe24 쇼핑몰 관리자 아이디(<code>mall_id</code>)를 등록한 후 "OAuth 연결" 버튼을 클릭하면 해당 쇼핑몰의 Cafe24 관리자 계정으로 인증을 되며 해당 브랜드의 상품 조회 및 재고 연동이 활성화됩니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* 브랜드 생성/수정 모달 */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '440px', borderRadius: '12px', padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{editTarget ? '브랜드 수정' : '새 브랜드 추가'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">브랜드명 *</label>
                            <input type="text" className="form-input" name="name" placeholder="예: 브랜드A" value={form.name} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">쇼핑몰 관리자 아이디 (mall_id) *</label>
                            <input type="text" className="form-input" name="mall_id" placeholder="예: ondy01" value={form.mall_id} onChange={handleChange} />
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cafe24 쇼핑몰 관리자 페이지 → 쇼핑몰 ID를 입력하세요.</p>
                        </div>
                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label className="form-label">설명</label>
                            <input type="text" className="form-input" name="description" placeholder="브랜드에 대한 간단한 설명" value={form.description} onChange={handleChange} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>취소</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : (editTarget ? '수정' : '추가')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
