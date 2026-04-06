import React, { useState, FC, FormEvent } from 'react';
import { Search, X, Package, Loader2 } from 'lucide-react';
import { useAppContext } from '@core/contexts/AppContext';
import { searchProducts, getMallIdFromBrand } from '@core/services/productSearchService';

interface ProductSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (product: any) => void;
    selectedBrand: string;
}

const ProductSearchModal: FC<ProductSearchModalProps> = ({ isOpen, onClose, onSelect, selectedBrand }) => {
    const { brands } = useAppContext();
    const [keyword, setKeyword] = useState('');
    const [searchType, setSearchType] = useState('name');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[] | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    const handleSearch = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!keyword.trim()) return;

        setLoading(true);
        setSearchError(null);
        try {
            const mall_id = getMallIdFromBrand(selectedBrand, brands);
            const flatList = await searchProducts({ keyword, searchType, mall_id });
            setSearchResults(flatList || []);
        } catch (err: any) {
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
                        </div>
                    ) : searchResults && searchResults.length > 0 ? (
                        <table className="table">
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                                <tr>
                                    <th style={{ textAlign: 'center' }}>자사상품코드</th>
                                    <th>상품명</th>
                                    <th style={{ textAlign: 'center' }}>옵션</th>
                                    <th style={{ textAlign: 'center' }}>현재재고</th>
                                    <th style={{ textAlign: 'center' }}>판매가</th>
                                    <th style={{ textAlign: 'center' }}>선택</th>
                                </tr>
                            </thead>
                            <tbody>
                                {searchResults.map((product, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{product.code}</td>
                                        <td style={{ fontSize: '0.875rem' }}>{product.name}</td>
                                        <td style={{ textAlign: 'center', fontSize: '0.8125rem' }}>{product.option1 || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${product.stock > 0 ? 'badge-info' : 'badge-danger'}`}>
                                                {Number(product.stock).toLocaleString()}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{product.price.toLocaleString()}원</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn btn-outline" onClick={() => onSelect(product)}>선택</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                            {searchResults !== null ? '검색 결과가 없습니다.' : '상품명이나 코드로 검색해주세요.'}
                        </div>
                    )}
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
                    <button className="btn btn-outline" onClick={onClose}>닫기</button>
                </div>
            </div>
        </div>
    );
};

export default ProductSearchModal;
