import React, { useState, useContext } from 'react';
import { Search, X, Package, Loader2 } from 'lucide-react';
import { productService } from '@core/services/productService';
import { AppContext } from '@core/contexts/AppContext';

export default function ProductSearchModal({ isOpen, onClose, onSelect, selectedBrand }) {
    const { brands } = useContext(AppContext);
    const [keyword, setKeyword] = useState('');
    const [searchType, setSearchType] = useState('name');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [searchError, setSearchError] = useState(null);

    // 선택된 브랜드의 mall_id 추출
    const getMallId = () => {
        if (!selectedBrand || !brands) return undefined;
        const brandObj = brands.find(b => {
            const bName = typeof b === 'object' ? (b.name || b.brand_name) : b;
            return bName === selectedBrand;
        });
        return brandObj ? (brandObj.mall_id || brandObj.cafe24_mall_id) : undefined;
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!keyword.trim()) return;

        setLoading(true);
        setSearchError(null);
        try {
            const mall_id = getMallId();
            const result = await productService.getProducts({ keyword: keyword.trim(), mall_id, search_type: searchType });
            
            // 다중 응답 구조 대응
            let list = [];
            if (Array.isArray(result)) {
                list = result;
            } else if (result) {
                list = result.data?.products || result.products || result.items || (Array.isArray(result.data) ? result.data : []);
            }

            // variants 기준으로 flatten
            const flatList = [];
            list.forEach(product => {
                const code = product.custom_product_code || product.product_code;
                const name = product.product_name;
                const price = Math.floor(Number(product.price || 0));
                const variants = Array.isArray(product.variants) ? product.variants : [];

                if (variants.length === 0) {
                    flatList.push({ ...product, code, name, option1: '', option2: '', stock: 0, price });
                } else {
                    variants.forEach(v => {
                        const opts = Array.isArray(v.options) ? v.options : [];
                        const sizeOpt = opts.find(o => o.name?.toUpperCase() === 'SIZE');
                        const otherOpts = opts.filter(o => o.name?.toUpperCase() !== 'SIZE');
                        // 코러: 응답 옵션 우선, 없으면 custom_product_code의 _ 뒤 부분 사용, 둘 다 없으면 빈값
                        const colorFromCode = code.includes('_') ? code.split('_').slice(1).join('_') : '';
                        flatList.push({
                            ...product,
                            _variantCode: v.variant_code,
                            code,
                            name,
                            option1: otherOpts[0]?.value || colorFromCode || '',
                            option2: sizeOpt?.value || '',
                            stock: Number(v.quantity ?? 0),
                            price,
                        });
                    });
                }
            });
            setSearchResults(flatList);
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || '상품 조회 중 오류가 발생했습니다.';
            setSearchError(msg);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={20} color="var(--primary)" />
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Cafe24 연동 상품 검색</h3>
                        {selectedBrand && (
                            <span style={{ fontSize: '0.8rem', background: 'var(--primary)', color: 'white', padding: '2px 10px', borderRadius: '20px' }}>
                                {selectedBrand}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '20px', backgroundColor: '#F9FAFB' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                        <select
                            className="form-select"
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            style={{ width: '130px', flexShrink: 0 }}
                        >
                            <option value="name">상품명</option>
                            <option value="code">상품코드</option>
                        </select>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder={searchType === 'name' ? "상품명 단어를 입력하세요" : "상품코드를 정확히 입력하세요"}
                                style={{ paddingLeft: '40px' }}
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }} disabled={loading}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : '검색'}
                        </button>
                    </form>
                </div>

                {/* Results */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Cafe24에서 상품 정보를 가져오는 중...</p>
                        </div>
                    ) : searchError ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--danger)' }}>
                            <p style={{ marginBottom: '8px', fontWeight: 600 }}>조회 실패</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{searchError}</p>
                            {searchError.includes('OAuth') && (
                                <p style={{ fontSize: '0.8rem', marginTop: '12px', color: 'var(--text-muted)' }}>
                                    💡 사이드바의 <strong>브랜드 관리</strong> 메뉴에서 해당 브랜드의 OAuth 인증을 먼저 완료해주세요.
                                </p>
                            )}
                        </div>
                    ) : searchResults && searchResults.length > 0 ? (
                        <table className="table">
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                                <tr>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>자사상품코드</th>
                                    <th>상품명</th>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>옵션</th>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>옵션2</th>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>현재재고</th>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>판매가</th>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>선택</th>
                                </tr>
                            </thead>
                            <tbody>
                                {searchResults.map((product, idx) => (
                                        <tr key={product._variantCode || product.product_no || idx}>
                                            <td style={{ textAlign: 'center', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>{product.code}</td>
                                            <td style={{ fontSize: '0.875rem' }}>{product.name}</td>
                                            <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#6B7280' }}>{product.option1 || '-'}</td>
                                            <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#6B7280' }}>{product.option2 || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`badge ${product.stock > 0 ? 'badge-info' : 'badge-danger'}`} style={{ minWidth: '40px' }}>
                                                    {Number(product.stock).toLocaleString()}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                                                {product.price.toLocaleString()}원
                                            </td>
                                            <td style={{ textAlign: 'center', width: '1%' }}>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '6px 14px', fontSize: '0.8125rem', whiteSpace: 'nowrap', minWidth: 'max-content' }}
                                                    onClick={() => onSelect(product)}
                                                >
                                                    선택
                                                </button>
                                            </td>
                                        </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                            {searchResults !== null ? '검색 결과가 없습니다.' : '상품명 또는 코드로 상품을 검색해주세요.'}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', textAlign: 'right', backgroundColor: '#F9FAFB' }}>
                    <button className="btn btn-outline" onClick={onClose}>닫기</button>
                </div>
            </div>
        </div>
    );
}
