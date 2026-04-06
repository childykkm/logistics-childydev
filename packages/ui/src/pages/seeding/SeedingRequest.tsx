import React, { useState, FC, ChangeEvent } from 'react';
import { Trash2, Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@core/contexts/AppContext';
import { seedingService } from '@core/services/seedingService';
import { parseSeedingExcel } from '@core/services/excelSeedingParser';
import { PageHeader, Card } from '../../components/common/Layout';
import styles from './SeedingRequest.module.css';

const SeedingRequest: FC = () => {
    const navigate = useNavigate();
    const { brands, fetchData } = useAppContext();

    // UI States
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Data States
    const [formData, setFormData] = useState({
        brand: '',
        date: new Date().toISOString().split('T')[0],
        memo: ''
    });

    const [excelPreview, setExcelPreview] = useState<any[] | null>(null);
    const [excelFile, setExcelFile] = useState<File | null>(null);

    // Methods
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => 
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleExcelQtyChange = (idx: number, newQty: string) => {
        if (!excelPreview) return;
        const updated = [...excelPreview];
        updated[idx].qty = Number(newQty) || 0;

        // 같은 itemCode 그룹의 첫 번째 row의 원본 재고를 기준으로 순서대로 누적 재계산
        const itemCode = updated[idx].itemCode;
        if (itemCode) {
            let runningStock: number | null = null;
            updated.forEach(row => {
                if (row.itemCode !== itemCode || typeof row.stock !== 'number') return;
                if (runningStock === null) {
                    // 첫 번째 row는 원본 서버 재고 기준
                    runningStock = row.originalStock ?? row.stock;
                    row.originalStock = runningStock; // 원본값 보존
                }
                row.stock = runningStock as number;
                row.expectedStock = (runningStock as number) - (Number(row.qty) || 0);
                runningStock = row.expectedStock;
            });
        }
        setExcelPreview(updated);
    };

    const removeExcelRow = (idx: number) => {
        if (excelPreview && window.confirm('해당 행을 원장에서 제외하시겠습니까?')) {
            setExcelPreview(excelPreview.filter((_, i) => i !== idx));
        }
    };

    const handleFileUpload = async () => {
        if (!excelFile || !excelPreview) return alert('등록할 파일이 없습니다.');
        if (!formData.brand) return alert('브랜드를 먼저 선택해주세요.');

        // 미연동 상품 제외 확인 (상품코드가 없거나 재고 조회가 안된 경우)
        const unlinkedRows = excelPreview.filter(r => !r.itemCode || r.stock === '-');
        const validRows = excelPreview.filter(r => r.itemCode && r.stock !== '-');

        if (unlinkedRows.length > 0) {
            const unlinkedItemNames = unlinkedRows.slice(0, 5).map(r => r.itemName).join(', ') + (unlinkedRows.length > 5 ? ' 등' : '');
            if (!window.confirm(`미연동 상품(${unlinkedItemNames}) ${unlinkedRows.length}건을 제외하고,\n정상 연동된 총 ${validRows.length}건의 데이터만 등록하시겠습니까?`)) return;
        } else {
            if (!window.confirm(`총 ${validRows.length}건의 데이터를 등록하시겠습니까?`)) return;
        }

        // 재고 부족 상품 고지 (컨펌으로 변경)
        const shortageRows = validRows.filter(row => typeof row.expectedStock === 'number' && row.expectedStock < 0);
        if (shortageRows.length > 0) {
            if (!window.confirm(`[주의] 재고 부족 상품 ${shortageRows.length}건이 포함되어 있습니다.\n해당 건은 '검토중' 상태로 등록되며 물류팀의 확인이 필요합니다.\n\n해당 건들을 포함하여 등록을 진행하시겠습니까?`)) return;
        }

        const matchedBrand = brands.find(b => {
            const bName = typeof b === 'object' ? (b.name || (b as any).brand_name) : b;
            return bName === formData.brand;
        });
        const brandId = (matchedBrand as any)?.id || (matchedBrand as any)?.brand_id;

        const payload = validRows.map(row => ({
            brand_id: brandId,
            order_date: row.date,
            company_product_code: row.itemCode,
            mall_product_name: row.itemName,
            option_name: row.option1,
            option_name2: row.option2,
            option_name3: row.option3,
            order_qty: row.qty,
            mall_sale_price: row.price,
            mall_payment_amount: row.paymentPrice,
            settlement_amount: row.expectedPrice,
            orderer_name: row.orderName,
            orderer_phone: row.orderPhone,
            recipient_name: row.recipientName,
            recipient_phone: row.recipientPhone,
            recipient_zipcode: row.zipcode,
            recipient_address: row.address,
            mall_order_no: row.orderNo,
            notes: row.memo || formData.memo || '',
            sellic_product_code: row.sellicCode,
            sellic_option_code: row.sellicOption,
            status: (typeof row.expectedStock === 'number' && row.expectedStock < 0) ? 'reviewing' : 'pending',
        }));

        try {
            setIsUploading(true);
            await seedingService.uploadSeeding(payload);
            await fetchData();
            alert('시딩 일괄 등록이 완료되었습니다.');
            navigate('/seeding');
        } catch (err) {
            alert('업로드 처리 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const processExcel = async (file: File) => {
        if (!formData.brand) return alert('브랜드를 먼저 선택해주세요.');
        setIsUploading(true);
        try {
            const previewItems = await parseSeedingExcel(file, formData.brand, brands);
            setExcelPreview(previewItems);
        } catch (error: any) {
            alert(error.message || '엑셀 데이터 분석 중 오류');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            <PageHeader 
                title="신규 시딩 출고 요청" 
                description="물류 담당자님, OMS 엑셀 파일을 업로드하여 시딩 요청을 등록하세요."
            />

            <div style={{ marginTop: '24px' }}>
                <div style={{ marginBottom: '16px', maxWidth: '400px' }}>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>대상 브랜드 선택 *</label>
                    <select 
                        className="form-select" 
                        name="brand" 
                        value={formData.brand} 
                        onChange={handleChange} 
                        style={{ 
                            fontWeight: 600,
                            fontSize: '1.05rem',
                            padding: '10px 12px'
                        }}
                    >
                        <option value="" disabled>대상 브랜드를 먼저 선택해주세요 (필수)</option>
                        {brands.map((b, i) => {
                            const bName = typeof b === 'object' ? (b.name || (b as any).brand_name || '') : b;
                            return <option key={i} value={bName}>{bName}</option>;
                        })}
                    </select>
                </div>

                <Card
                    style={{
                        background: isDragging ? '#F0FDF4' : 'white',
                        borderColor: isDragging ? '#86EFAC' : 'var(--border-color)',
                        borderStyle: isDragging ? 'dashed' : 'solid',
                        borderWidth: '2px',
                        transition: 'all 0.2s ease-in-out',
                        width: '100%',
                        padding: '48px 24px'
                    }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) { setExcelFile(file); processExcel(file); } }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                        <div style={{ padding: '16px', background: 'white', borderRadius: '50%', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                            <FileSpreadsheet size={48} color="#166534" />
                        </div>
                        
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, color: '#166534', fontSize: '1.5rem' }}>OMS 엑셀 일괄 업로드</div>
                            <div style={{ fontSize: '1rem', color: '#15803D', marginTop: '8px' }}>파일을 이곳에 끌어다 놓거나 아래 버튼을 누르세요</div>
                        </div>

                        <label 
                            className={`btn ${formData.brand ? 'btn-primary' : 'btn-outline'}`} 
                            style={{ 
                                cursor: formData.brand ? 'pointer' : 'not-allowed', 
                                padding: '14px 40px',
                                minWidth: '240px',
                                fontSize: '1rem',
                                opacity: formData.brand ? 1 : 0.6,
                                boxShadow: formData.brand ? '0 10px 15px -3px rgb(0 0 0 / 0.1)' : 'none'
                            }}
                        >
                            <Upload size={20} /> {isUploading ? '데이터 분석 중...' : '엑셀 파일 선택'}
                            <input 
                                type="file" 
                                accept=".xlsx, .xls" 
                                style={{ display: 'none' }} 
                                disabled={!formData.brand || isUploading}
                                onChange={(e) => { const file = e.target.files?.[0]; if (file) { setExcelFile(file); processExcel(file); } }} 
                            />
                        </label>
                    </div>
                </Card>
            </div>

            {excelPreview && (
                <div style={{ marginTop: '32px' }}>
                    <Card 
                        title={`업로드 데이터 미리보기 (${excelPreview.length}건)`}
                        headerAction={
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-outline" onClick={() => { setExcelPreview(null); setExcelFile(null); }}>취소</button>
                                <button className="btn btn-primary" onClick={handleFileUpload} disabled={isUploading}>
                                    {isUploading ? '등록 처리 중...' : '최종 등록 완료'}
                                </button>
                            </div>
                        }
                    >
                        <div className={styles.tableWrapper}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px', textAlign: 'center' }}>상태</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>주문일자</th>
                                        <th style={{ width: '180px', textAlign: 'left' }}>상품명</th>
                                        <th style={{ width: '130px', textAlign: 'center' }}>상품코드</th>
                                        <th style={{ width: '110px', textAlign: 'center' }}>색상</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>사이즈</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>수량</th>
                                        <th style={{ width: '160px', textAlign: 'center' }}>재고 변동 (현재→예상)</th>
                                        <th style={{ width: '50px', textAlign: 'center' }}>삭제</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {excelPreview.map((row, idx) => {
                                        const isUnlinked = !row.itemCode || row.stock === '-';
                                        const isShortage = typeof row.expectedStock === 'number' && row.expectedStock < 0;

                                        return (
                                            <tr key={idx} style={{ 
                                                background: isShortage ? '#FEF2F2' : 'transparent',
                                                verticalAlign: 'middle'
                                            }}>
                                                <td style={{ textAlign: 'center' }}>
                                                    {isUnlinked ? (
                                                        <span title="미연동"><AlertCircle color="#94A3B8" size={20} /></span>
                                                    ) : isShortage ? (
                                                        <span title="재고부족"><AlertCircle color="#DC2626" size={20} /></span>
                                                    ) : (
                                                        <span title="정상"><CheckCircle2 color="#16A34A" size={20} /></span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>{row.date}</td>
                                                <td style={{ textAlign: 'left' }}>
                                                    <div style={{ fontWeight: 600, width: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.itemName}>{row.itemName}</div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.875rem', color: isUnlinked ? '#94A3B8' : '#475569' }}>{row.itemCode || '미기입'}</div>
                                                </td>
                                                <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>{row.option1}</td>
                                                <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>{row.option2}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input 
                                                        type="number" 
                                                        className="form-input" 
                                                        style={{ width: '100%', padding: '4px 8px', textAlign: 'center' }} 
                                                        value={row.qty} 
                                                        onChange={(e) => handleExcelQtyChange(idx, e.target.value)} 
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <span style={{ color: isUnlinked ? '#94A3B8' : 'inherit' }}>{row.stock === '-' ? '미연동' : row.stock}</span>
                                                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                                                        <span style={{ fontWeight: 600, color: isShortage ? '#DC2626' : isUnlinked ? '#94A3B8' : '#16A34A' }}>
                                                            {row.expectedStock === '-' ? '미연동' : row.expectedStock}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="btn btn-outline" onClick={() => removeExcelRow(idx)} style={{ padding: '4px 8px', borderColor: 'transparent' }}>
                                                        <Trash2 size={16} color="#DC2626" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default SeedingRequest;
