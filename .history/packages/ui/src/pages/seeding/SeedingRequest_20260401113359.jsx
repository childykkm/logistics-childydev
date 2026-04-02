import { useState, useContext } from 'react';
import * as XLSX from 'xlsx';
import { Search, Plus, Trash2, X, Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DaumPostcode from 'react-daum-postcode';
import { AppContext } from '@core/contexts/AppContext';
import { productService } from '@core/services/productService';
import { seedingService } from '@core/services/seedingService';
import ProductSearchModal from '@ui/components/ProductSearchModal';

export default function SeedingRequest() {
    const navigate = useNavigate();
    const { addSeeding, brands, fetchData } = useContext(AppContext);

    // UI States
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeRowId, setActiveRowId] = useState(null);
    const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);

    // Data States
    const [items, setItems] = useState([
        { id: 1, name: '', code: '', option1: '', qty: 1, price: 0, stock: '-', expectedStock: '-' }
    ]);
    const [formData, setFormData] = useState({
        brand: '',
        date: new Date().toISOString().split('T')[0],
        orderName: '',
        orderPhone: '',
        recipientName: '',
        recipientPhone: '',
        zipcode: '',
        address1: '',
        address2: '',
        msgSelect: '',
        msgInput: '',
        expectedPrice: '',
        orderNo: '',
        memo: ''
    });

    // 엑셀 일괄 업로드 검토용 상태
    const [excelPreview, setExcelPreview] = useState(null);
    const [excelFile, setExcelFile] = useState(null); // 신방식 업로드용 원본 파일

    // Methods
    const addItem = () => setItems([...items, { id: Date.now(), name: '', code: '', option1: '', qty: 1, price: 0, stock: '-', expectedStock: '-' }]);
    const removeItem = (id) => setItems(items.filter(i => i.id !== id));
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const openSearchModal = (id) => {
        setActiveRowId(id);
        setIsModalOpen(true);
    };

    const handleProductSelect = (product) => {
        setItems(prev => prev.map(item => {
            if (item.id === activeRowId) {
                return {
                    ...item,
                    code: product.code,
                    name: product.name,
                    option1: product.option1,
                    option2: product.option2 || '',
                    stock: product.stock,
                    expectedStock: product.stock - item.qty,
                    price: product.price
                };
            }
            return item;
        }));
        setIsModalOpen(false);
        setActiveRowId(null);
    };

    const handleQtyChange = (id, newQty) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const qtyVal = Number(newQty) || 0;
                return {
                    ...item,
                    qty: qtyVal,
                    expectedStock: item.stock !== '-' ? item.stock - qtyVal : '-'
                };
            }
            return item;
        }));
    };

    // 엑셀 데이터 수정용
    const handleExcelQtyChange = (idx, newQty) => {
        const updated = [...excelPreview];
        const qtyVal = Number(newQty) || 0;
        updated[idx].qty = qtyVal;
        if (updated[idx].stock !== '-') {
            updated[idx].expectedStock = updated[idx].stock - qtyVal;
        }
        setExcelPreview(updated);
    };

    const removeExcelRow = (idx) => {
        if (window.confirm('해당 행을 원장에서 제외하시겠습니까?')) {
            setExcelPreview(excelPreview.filter((_, i) => i !== idx));
        }
    };

    const handlePostcodeComplete = (data) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
            if (data.bname !== '') extraAddress += data.bname;
            if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
        }

        setFormData({ ...formData, zipcode: data.zonecode, address1: fullAddress });
        setIsPostcodeOpen(false);
    };

    const deliveryMessages = [
        "부재 시 경비실에 맡겨주세요",
        "문 앞에 놓아주세요",
        "배송 전 연락 바랍니다",
        "파손 위험이 있으니 조심히 다뤄주세요",
        "직접 입력"
    ];

    const handleSubmit = () => {
        if (!formData.brand) return alert('브랜드를 선택해주세요.');
        if (!formData.orderName) return alert('주문자명을 입력해주세요.');
        if (!formData.recipientName) return alert('수취인명을 입력해주세요.');
        if (!formData.zipcode) return alert('주소를 입력해주세요.');

        // 유효한 상품(코드가 있는 건)만 필터링
        const validItems = items.filter(i => i.code);
        if (validItems.length === 0) return alert('등록할 상품을 검색하여 선택해주세요.');

        const hasStockIssue = validItems.some(item => item.expectedStock < 0);
        if (hasStockIssue) {
            if (!window.confirm('일부 품목의 재고가 부족합니다. 부족한 상태로 시딩 요청을 등록하시겠습니까?\n(입고 예정 상품의 경우 허용될 수 있습니다.)')) {
                return;
            }
        }

        const finalMsg = formData.msgSelect === '직접 입력' ? formData.msgInput : formData.msgSelect;

        // 모든 상품 정보를 하나의 배열로 만들어 일괄 등록 전송
        const seedingEntries = validItems.map(item => {
            const isItemShortage = item.expectedStock !== '-' && item.expectedStock < 0;
            return {
                brand: formData.brand,
                date: formData.date,
                orderName: formData.orderName,
                orderPhone: formData.orderPhone,
                recipientName: formData.recipientName,
                recipientPhone: formData.recipientPhone,
                zipcode: formData.zipcode,
                address: formData.address1 + ' ' + (formData.address2 || ''),
                orderNo: formData.orderNo,
                memo: formData.memo,

                // 개별 상품 정보
                itemCode: item.code,
                itemName: item.name,
                option1: item.option1,
                qty: item.qty,
                price: item.price,
                expectedPrice: formData.expectedPrice || '0',

                status: isItemShortage ? '검토중' : '대기',
                hasStockIssue: isItemShortage,
                fullData: {
                    ...formData,
                    msgFinal: finalMsg,
                    products: [item]
                }
            };
        });

        // 일괄 등록 호출 (한 번의 state 업데이트)
        addSeeding(seedingEntries);

        alert(`총 ${validItems.length}건의 시딩 요청이 성공적으로 등록되었습니다.`);
        navigate('/seeding');
    };

    // 엑셀 벌크 일괄 등록 (구방식 - hide 처리, 추후 사용 가능)
    const handleBulkSubmit = () => {
        if (excelPreview.length === 0) return alert('등록할 데이터가 없습니다.');

        const hasStockIssue = excelPreview.some(item => item.expectedStock < 0);
        const msg = hasStockIssue
            ? `재고가 부족한 품목(${excelPreview.filter(i => i.expectedStock < 0).length}건)이 포함되어 있습니다. 모두 '검토중' 상태로 등록하시겠습니까?`
            : `총 ${excelPreview.length}건의 시딩 요청을 일괄 등록하시겠습니까?`;

        if (!window.confirm(msg)) return;

        excelPreview.forEach(row => {
            addSeeding({
                ...row,
                status: (row.expectedStock !== '-' && row.expectedStock < 0) ? '검토중' : '대기',
                hasStockIssue: (row.expectedStock !== '-' && row.expectedStock < 0),
                fullData: {
                    ...row,
                    products: [{
                        id: row.id,
                        name: row.itemName,
                        code: row.itemCode,
                        option1: row.option1,
                        qty: row.qty,
                        price: row.price,
                        stock: row.stock,
                        expectedStock: row.expectedStock
                    }]
                }
            });
        });

        alert(`총 ${excelPreview.length}건의 시딩 요청이 성공적으로 등록되었습니다.`);
        navigate('/seeding');
    };

    // 엑셀 파일 직접 업로드 (신방식 - 파일을 백엔드로 전송)
    const handleFileUpload = async () => {
        if (!excelFile) return alert('등록할 파일이 없습니다.');
        if (!formData.brand) return alert('브랜드를 먼저 선택해주세요.');

        // 1. 자체상품코드 없는 항목 확인
        const noCodeRows = excelPreview ? excelPreview.filter(r => !r.itemCode) : [];
        const validRows = excelPreview ? excelPreview.filter(r => r.itemCode) : [];

        if (noCodeRows.length > 0) {
            const noCodeNames = noCodeRows.map(r => r.itemName || '상품명 없음').join(', ');
            const proceed = window.confirm(
                `자체상품코드가 없는 ${noCodeRows.length}건이 제외됩니다:\n${noCodeNames}\n\n나머지 ${validRows.length}건을 등록하시겠습니까?`
            );
            if (!proceed) return;
        } else {
            if (!window.confirm('엑셀 파일을 업로드하시겠습니까?')) return;
        }

        // 2. 재고 부족 항목 확인
        const shortageRows = excelPreview ? excelPreview.filter(r => r.itemCode && r.expectedStock !== '-' && r.expectedStock < 0) : [];
        if (shortageRows.length > 0) {
            const proceed = window.confirm(
                `재고가 부족한 품목 ${shortageRows.length}건이 포함되어 있습니다.\n해당 항목은 '검토필요' 상태로 등록됩니다.\n계속 등록하시겠습니까?`
            );
            if (!proceed) return;
        }

        const matchedBrand = brands.find(b => {
            const bName = typeof b === 'object' ? (b.name || b.brand_name) : b;
            return bName === formData.brand;
        });
        const brand_id = matchedBrand?.id || matchedBrand?.brand_id;

        // 3. 재고 부족 정보를 파일과 함께 전송
        const stockIssueIds = shortageRows.map(r => r.itemCode);

        const fd = new FormData();
        fd.append('file', excelFile);
        fd.append('brand_id', brand_id);
        fd.append('notes', formData.memo || '');
        if (stockIssueIds.length > 0) {
            fd.append('stock_issue_codes', JSON.stringify(stockIssueIds));
        }

        try {
            setIsUploading(true);
            await seedingService.uploadSeeding(fd);
            await fetchData();
            alert('엑셀 업로드가 완료되었습니다.');
            navigate('/seeding');
        } catch (err) {
            alert('업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) { setExcelFile(file); processExcel(file); }
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (file) { setExcelFile(file); processExcel(file); }
        e.target.value = null;
    };

    const formatExcelDate = (val) => {
        if (!val) return new Date().toLocaleDateString('ko-KR').replace(/\s/g, '').replace(/\.$/, '');

        let date;
        if (val instanceof Date) {
            date = val;
        } else if (typeof val === 'string') {
            const cleaned = val.replace(/\./g, '/').replace(/-/g, '/');
            const parsed = new Date(cleaned);
            if (!isNaN(parsed.getTime())) {
                date = parsed;
            } else {
                return val.replace(/[-\/]/g, '.');
            }
        } else {
            const num = Number(val);
            if (!isNaN(num) && num > 0) {
                date = new Date(Math.round((num - 25569) * 86400 * 1000));
                const tzOffset = date.getTimezoneOffset() * 60000;
                date = new Date(date.getTime() + tzOffset);
            } else {
                return String(val).replace(/[-\/]/g, '.');
            }
        }

        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        return `${y}.${m}.${d}`;
    };

    const processExcel = async (file) => {
        if (!formData.brand) {
            alert('엑셀 업로드 전 대상을 지정할 브랜드를 "기본 정보"에서 먼저 선택해주세요.');
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const buffer = evt.target.result;
                const wb = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json(ws, { raw: false });
                const range = XLSX.utils.decode_range(ws['!ref']);
                let dateColIndex = -1;
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
                    if (ws[addr] && ws[addr].v === '주문일자') {
                        dateColIndex = C;
                        break;
                    }
                }

                if (rawData.length === 0) {
                    alert('엑셀 파일에 데이터가 없습니다.');
                    setIsUploading(false);
                    return;
                }

                // Fetch stock info for all products once for faster matching
                const targetBrand = brands.find(b => {
                    const bName = typeof b === 'object' ? (b.name || b.brand_name) : b;
                    return bName === formData.brand;
                });
                const mall_id = targetBrand ? (targetBrand.mall_id || targetBrand.cafe24_mall_id) : undefined;
                
                // 1. 엑셀 내의 모든 고유 상품/품목코드 추출
                const uniqueExcelCodes = [...new Set(rawData.map(row => 
                    String(row['자사상품코드'] || row['품목코드'] || row['자사코드'] || row['상품코드'] || row['자사상품코드(옵션)'] || row['품목 코드'] || '').trim()
                ).filter(Boolean))];

                // 2. 추출된 모든 고유 코드에 대해 개별 실시간 재고 조회 (병렬 처리)
                // 100개 랜덤 조회가 아닌, 엑셀에 적힌 상품들만 서버에 직접 물어봅니다.
                const productResRaw = [];
                if (uniqueExcelCodes.length > 0) {
                    const fetchPromises = uniqueExcelCodes.map(code => 
                        productService.getProducts({ mall_id, keyword: code, search_type: 'code', limit: 5 }).catch(err => {
                            console.warn(`Code ${code} fetch failed:`, err);
                            return null;
                        })
                    );
                    const results = await Promise.all(fetchPromises);
                    
                    results.forEach(res => {
                        if (!res) return;
                        // API 응답: { status, data: [...] } 구조
                        const list = Array.isArray(res) ? res
                            : Array.isArray(res.data) ? res.data
                            : [];
                        productResRaw.push(...list);
                    });
                }
                
                // 3. variant 단위로 flatten - 코드 + 옵션으로 매칭
                const allProducts = [];
                productResRaw.forEach(p => {
                    if (!p) return;
                    const customCode = String(p.custom_product_code || p.model_name || '');
                    const variants = Array.isArray(p.variants) ? p.variants : [];

                    if (variants.length > 0) {
                        variants.forEach(v => {
                            const opts = Array.isArray(v.options) ? v.options : [];
                            const sizeOpt = opts.find(o => o.name === '사이즈' || o.name?.toUpperCase() === 'SIZE');
                            const colorOpt = opts.find(o => o.name === '색상' || o.name?.toUpperCase() === 'COLOR');
                            const colorFromCode = customCode.includes('_') ? customCode.split('_').slice(1).join('_') : '';
                            const option1Val = colorOpt?.value || colorFromCode || '';
                            const option2Val = sizeOpt?.value || '';
                            allProducts.push({
                                _matchCode: customCode,
                                _normalizedCode: customCode.toLowerCase().replace(/[^a-z0-9]/g, ''),
                                _option1: option1Val.toUpperCase(),
                                _option2: option2Val.toUpperCase(),
                                _displayCode: customCode || p.product_code,
                                _processedStock: Number(v.quantity ?? 0),
                                product_name: p.product_name,
                                price: p.price,
                            });
                        });
                    } else {
                        allProducts.push({
                            _matchCode: customCode,
                            _normalizedCode: customCode.toLowerCase().replace(/[^a-z0-9]/g, ''),
                            _option1: '',
                            _option2: '',
                            _displayCode: customCode || p.product_code,
                            _processedStock: p.quantity !== undefined ? Number(p.quantity) : null,
                            product_name: p.product_name,
                            price: p.price,
                        });
                    }
                });

                // 코드별 누적 차감을 위한 재고 트래커
                const stockTracker = {};

                const previewItems = rawData.map((row, index) => {
                    let finalDate = formatExcelDate(row['주문일자']);
                    if (dateColIndex !== -1) {
                        const cellAddr = XLSX.utils.encode_cell({ r: range.s.r + 1 + index, c: dateColIndex });
                        const cell = ws[cellAddr];
                        if (cell && cell.f && cell.f.includes('TODAY()')) {
                            const now = new Date();
                            finalDate = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;
                        }
                    }

                    const qty = Number(String(row['주문수량'] || '1').replace(/[^0-9]/g, '')) || 1;
                    const price = Math.floor(Number(String(row['판매가(쇼핑몰)'] || '0').replace(/[^0-9.]/g, '')));
                    const paymentPrice = String(row['결제금액(쇼핑몰)'] || '0').replace(/[^0-9.]/g, '');
                    const expectedPrice = String(row['정산예정금액'] || '0').replace(/[^0-9.]/g, '');
                    
                    // 엑셀 내 다양한 품목코드/상품코드 컬럼명 대응
                    const rawExcelCode = String(
                        row['자사상품코드'] || 
                        row['품목코드'] || 
                        row['자사코드'] || 
                        row['상품코드'] || 
                        row['자사상품코드(옵션)'] || 
                        row['품목 코드'] ||
                        ''
                    ).trim();
                    const normalizedExcelCode = rawExcelCode.toLowerCase().replace(/[^a-z0-9]/g, '');

                    const rawOption1 = String(row['옵션명(쇼핑몰)'] || '').trim().toUpperCase();
                    const rawOption2 = String(row['옵션명2(쇼핑몰)'] || '').trim().toUpperCase();

                    const matchedProduct = allProducts.find(p =>
                        p && p._normalizedCode && normalizedExcelCode &&
                        p._normalizedCode === normalizedExcelCode &&
                        (!rawOption1 || !p._option1 || p._option1.includes(rawOption1)) &&
                        (!rawOption2 || !p._option2 || p._option2.includes(rawOption2))
                    );

                    
                    const stock = matchedProduct && matchedProduct._processedStock !== null
                        ? matchedProduct._processedStock
                        : '-';

                    // 코드+옵션 조합별 누적 차감 처리
                    const trackerKey = `${normalizedExcelCode}_${rawOption1}_${rawOption2}`;
                    let currentStock = stock;
                    let expectedStock;
                    if (stock !== '-') {
                        if (stockTracker[trackerKey] === undefined) {
                            stockTracker[trackerKey] = stock;
                        }
                        expectedStock = stockTracker[trackerKey] - qty;
                        stockTracker[trackerKey] = expectedStock;
                        currentStock = stockTracker[trackerKey] + qty;
                    } else {
                        expectedStock = '-';
                    }

                    return {
                        brand: formData.brand,
                        date: finalDate,
                        itemCode: matchedProduct ? (matchedProduct._displayCode || rawExcelCode) : rawExcelCode,
                        itemName: matchedProduct ? (matchedProduct.product_name || matchedProduct.item_name || row['상품명(쇼핑몰)'] || '엑셀 상품업로드') : (row['상품명(쇼핑몰)'] || '엑셀 상품업로드'),
                        option1: matchedProduct ? (matchedProduct.option_name || matchedProduct.option1 || row['옵션명(쇼핑몰)'] || '') : (row['옵션명(쇼핑몰)'] || ''),
                        option2: row['옵션명2(쇼핑몰)'] || '',
                        option3: row['옵션명3(쇼핑몰)'] || '',
                        qty,
                        price: matchedProduct ? Math.floor(Number(matchedProduct.selling_price || matchedProduct.price || price)) : price,
                        paymentPrice,
                        expectedPrice,
                        stock: currentStock,
                        expectedStock,
                        orderName: row['주문자명'] || '-',
                        orderPhone: row['주문자 휴대폰'] || '',
                        recipientName: row['수취인명'] || '-',
                        zipcode: row['수취인 우편번호'] || '',
                        address: row['수취인 주소'] || '',
                        recipientPhone: row['수취인 휴대폰'] || '',
                        orderNo: row['주문번호(쇼핑몰)'] || '',
                        memo: row['비고'] || '',
                        sellicCode: row['상품코드(셀릭)'] || '',
                        sellicOption: row['옵션코드(셀릭)'] || '',
                        id: Math.random().toString(36).substr(2, 9)
                    };
                });

                setExcelPreview(previewItems);
                // Scroll to preview section
                setTimeout(() => window.scrollTo({ top: 300, behavior: 'smooth' }), 100);
            } catch (error) {
                alert('엑셀 파일을 파싱하는 중 오류가 발생했습니다. OMS 양식이 맞는지 확인해주세요.');
                console.error(error);
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* 0. Basic Info Card (Common for both manual and excel) */}
            <div className="card">
                <div className="card-title">기본 설정</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">브랜드 선택 *</label>
                        <select className="form-select" name="brand" value={formData.brand} onChange={handleChange}>
                            <option value="" disabled>선택하세요</option>
                            {brands.map((b, i) => {
                                const bName = typeof b === 'object' ? (b.name || b.brand_name || '') : b;
                                return <option key={i} value={bName}>{bName}</option>;
                            })}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">기본 주문일자</label>
                        <input type="date" className="form-input" name="date" value={formData.date} onChange={handleChange} />
                    </div>
                </div>
            </div>

            {/* 1. Excel Management Section */}
            <div
                className="card"
                style={{
                    background: isDragging ? '#DCFCE7' : '#F0FDF4',
                    borderColor: isDragging ? '#22C55E' : '#BBF7D0',
                    borderStyle: isDragging ? 'dashed' : 'solid',
                    borderWidth: '2px',
                    transition: 'all 0.2s ease-in-out'
                }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileSpreadsheet color="#166534" />
                        <span style={{ color: '#166534' }}>OMS 엑셀 일괄 업로드 <small style={{ fontWeight: 400, color: '#15803D' }}>(OMS 양식 드래그 앤 드롭 지원)</small></span>
                    </div>
                    <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', background: 'white', borderColor: '#BBF7D0', color: '#166534' }}>
                        <Upload size={16} /> {isUploading ? '데이터 분석 중...' : '엑셀 파일 선택'}
                        <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleExcelUpload} disabled={isUploading} />
                    </label>
                </div>
                <div style={{ padding: '24px', border: '2px dashed #86EFAC', borderRadius: '8px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                    <p style={{ margin: 0, color: '#166534', fontWeight: 500 }}>여기로 엑셀 파일을 드래그하여 놓으세요. (품목별 재고 실시간 대조 지원)</p>
                </div>
            </div>

            {/* 2. Excel Review Section (Visible only after upload) */}
            {excelPreview && (
                <div className="card" style={{ borderColor: 'var(--primary)', borderWidth: '2px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                            <CheckCircle2 />
                            <span>업로드 데이터 검토 및 보정 <small style={{ color: 'var(--text-muted)' }}>(총 {excelPreview.length}건)</small></span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-outline" onClick={() => { if (window.confirm('검토 중인 데이터를 모두 취소하시겠습니까?')) setExcelPreview(null); }}>취소</button>
                            <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '1rem' }} onClick={handleFileUpload} disabled={isUploading}>
                                {isUploading ? '업로드 중...' : `${excelPreview.length}건 일괄 등록 완료`}
                            </button>
                        </div>
                    </div>
                    <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table className="table" style={{ minWidth: '1200px' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                                <tr style={{ background: '#F9FAFB', whiteSpace: 'nowrap' }}>
                                    <th style={{ textAlign: 'center', width: '60px' }}>상태</th>
                                    <th style={{ width: '100px' }}>주문일자</th>
                                    <th style={{ width: '200px' }}>상품명/코드</th>
                                    <th style={{ width: '120px' }}>컬러/사이즈</th>
                                    <th style={{ width: '120px' }}>수령인</th>
                                    <th style={{ width: '100px' }}>수량</th>
                                    <th style={{ textAlign: 'center', width: '160px' }}>재고/예상</th>
                                    <th style={{ width: '60px' }}>관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {excelPreview.map((row, idx) => {
                                    const isShortage = row.expectedStock !== '-' && row.expectedStock < 0;
                                    return (
                                        <tr key={row.id} style={{ backgroundColor: isShortage ? '#FFF5F5' : 'inherit' }}>
                                            <td style={{ textAlign: 'center' }}>
                                                {isShortage ? <AlertCircle size={20} color="var(--danger)" /> : <CheckCircle2 size={20} color="var(--success)" />}
                                            </td>
                                            <td style={{ fontSize: '0.875rem' }}>{row.date}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{row.itemName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.itemCode}</div>
                                            </td>
                                            <td style={{ fontSize: '0.875rem' }}>
                                                {row.option1 && <div>{row.option1}</div>}
                                                {row.option2 && <div style={{ color: 'var(--text-muted)' }}>{row.option2}</div>}
                                                {!row.option1 && !row.option2 && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                            </td>
                                            <td>{row.recipientName}</td>
                                            <td>
                                                <input type="number" className="form-input" style={{ width: '70px', padding: '4px 8px' }} value={row.qty} onChange={(e) => handleExcelQtyChange(idx, e.target.value)} />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ fontWeight: 600, color: isShortage ? 'var(--danger)' : 'inherit' }}>
                                                    {row.stock !== '-' ? (
                                                        <>
                                                            <span>{row.stock}</span>
                                                            {' → '}
                                                            <span style={{ color: isShortage ? 'var(--danger)' : 'var(--success)' }}>{row.expectedStock}</span>
                                                        </>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 400 }}>미연동</span>
                                                    )}
                                                </div>
                                                {isShortage && <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>재고 부족</div>}
                                            </td>
                                            <td>
                                                <button className="btn btn-outline" style={{ color: 'var(--danger)', padding: '4px' }} onClick={() => removeExcelRow(idx)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 3. Manual Entry Section - 우선 화면 hide (엑셀 업로드 방식만 사용) */}
            {false && !excelPreview && (
                <>

                    {/* Recipient Info Card */}
                    <div className="card">
                        <div className="card-title">주문자 및 수취인 정보</div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">주문자명 *</label>
                                <input type="text" className="form-input" placeholder="이름을 입력하세요" name="orderName" value={formData.orderName} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">주문자 휴대폰 *</label>
                                <input type="text" className="form-input" placeholder="010-0000-0000" name="orderPhone" value={formData.orderPhone} onChange={handleChange} />
                            </div>
                            <div className="form-group full" style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0' }} />
                            <div className="form-group">
                                <label className="form-label">수취인명 *</label>
                                <input type="text" className="form-input" placeholder="이름을 입력하세요" name="recipientName" value={formData.recipientName} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">수취인 휴대폰 *</label>
                                <input type="text" className="form-input" placeholder="010-0000-0000" name="recipientPhone" value={formData.recipientPhone} onChange={handleChange} />
                            </div>
                            <div className="form-group full" style={{ position: 'relative' }}>
                                <label className="form-label">수취인 주소 *</label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input type="text" className="form-input" placeholder="우편번호" readOnly style={{ width: '120px', background: '#F9FAFB' }} name="zipcode" value={formData.zipcode} />
                                    <button className="btn btn-outline" style={{ padding: '8px 16px' }} onClick={() => setIsPostcodeOpen(true)}>주소 검색</button>
                                </div>
                                <input type="text" className="form-input" placeholder="기본 주소" readOnly style={{ marginBottom: '8px', background: '#F9FAFB' }} name="address1" value={formData.address1} />
                                <input type="text" className="form-input" placeholder="상세 주소" name="address2" value={formData.address2} onChange={handleChange} />
                                {isPostcodeOpen && (
                                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '12px', overflow: 'hidden', padding: '16px', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>주소 검색</h3>
                                                <button onClick={() => setIsPostcodeOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                                            </div>
                                            <DaumPostcode onComplete={handlePostcodeComplete} autoClose={false} style={{ height: '400px' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="form-group full">
                                <label className="form-label">배송 메시지</label>
                                <select className="form-select" name="msgSelect" value={formData.msgSelect} onChange={handleChange}>
                                    <option value="">배송 메시지를 선택해주세요</option>
                                    {deliveryMessages.map((msg, i) => <option key={i} value={msg}>{msg}</option>)}
                                </select>
                                {formData.msgSelect === '직접 입력' && (
                                    <input type="text" className="form-input" style={{ marginTop: '8px' }} placeholder="배송 메시지를 직접 입력하세요" name="msgInput" value={formData.msgInput} onChange={handleChange} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Product Table Card */}
                    <div className="card">
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                            <span>상품 정보 <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Cafe24 재고 실시간 연동)</small></span>
                            <button className="btn btn-primary" onClick={addItem} style={{ padding: '8px 12px', fontSize: '0.875rem' }}>
                                <Plus size={16} /> 상품 추가
                            </button>
                        </div>
                        <div className="table-container" style={{ margin: '0 -16px', padding: '0 16px' }}>
                            <table className="table" style={{ border: '1px solid var(--border-color)', minWidth: '1000px' }}>
                                <thead>
                                    <tr style={{ background: '#F9FAFB', whiteSpace: 'nowrap' }}>
                                        <th style={{ width: '100px' }}>상품 검색</th>
                                        <th style={{ width: '140px' }}>상품코드</th>
                                        <th style={{ width: '200px' }}>상품명</th>
                                        <th style={{ width: '140px' }}>옵션</th>
                                        <th style={{ width: '100px' }}>주문수량</th>
                                        <th style={{ width: '160px', textAlign: 'center' }}>현재재고 / 예상</th>
                                        <th style={{ width: '120px' }}>판매가</th>
                                        <th style={{ width: '60px' }}>삭제</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        const isShortage = item.expectedStock !== '-' && item.expectedStock < 0;
                                        const isSoldOut = item.stock === 0;

                                        return (
                                            <tr key={item.id} style={{ backgroundColor: isShortage ? '#FFF5F5' : 'inherit' }}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.875rem' }} onClick={() => openSearchModal(item.id)}>
                                                        <Search size={14} /> 검색
                                                    </button>
                                                </td>
                                                <td><input type="text" className="form-input" disabled style={{ background: '#F3F4F6' }} value={item.code} /></td>
                                                <td><input type="text" className="form-input" disabled style={{ background: '#F3F4F6', minWidth: '150px' }} value={item.name} /></td>
                                                <td><input type="text" className="form-input" disabled style={{ background: '#F3F4F6' }} value={item.option1} /></td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={item.qty}
                                                        min={1}
                                                        style={{ width: '80px', borderColor: isShortage ? 'var(--danger)' : '' }}
                                                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                                        <div>
                                                            <span style={{ fontWeight: 600, color: isSoldOut ? 'var(--danger)' : 'inherit' }}>{item.stock}</span> /
                                                            <span style={{ fontWeight: 600, color: isShortage ? 'var(--danger)' : 'var(--success)' }}> {item.expectedStock}</span>
                                                        </div>
                                                        {isShortage && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
                                                                <AlertCircle size={12} /> 재고 부족 ({Math.abs(item.expectedStock)}개 초과)
                                                            </div>
                                                        )}
                                                        {isSoldOut && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}>[품절]</div>}
                                                    </div>
                                                </td>
                                                <td>{item.price.toLocaleString()}원</td>
                                                <td>
                                                    {idx > 0 && (
                                                        <button className="btn btn-outline" style={{ color: 'var(--danger)', padding: '6px' }} onClick={() => removeItem(item.id)}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Form Card */}
                    <div className="card">
                        <div className="card-title">금액 및 기타 정보</div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">정산예정금액 *</label>
                                <input type="number" className="form-input" placeholder="0" name="expectedPrice" value={formData.expectedPrice} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">주문번호(수동 생성) *</label>
                                <input type="text" className="form-input" placeholder="수취인명-비고 조합 자동 생성" name="orderNo" value={formData.orderNo || (formData.recipientName ? `${formData.recipientName}-${formData.memo.slice(0, 5)}` : '')} onChange={handleChange} />
                            </div>
                            <div className="form-group full">
                                <label className="form-label">비고</label>
                                <textarea className="form-textarea" rows={3} placeholder="특이사항을 입력하세요" name="memo" value={formData.memo} onChange={handleChange}></textarea>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
                        <button className="btn btn-outline mobile-full-btn" style={{ padding: '12px 24px', flex: 1 }} onClick={() => alert('임시 저장되었습니다.')}>임시저장</button>
                        <button className="btn btn-primary mobile-full-btn" style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 600, flex: 2 }} onClick={handleSubmit}>시딩 요청 등록 (승인 대기)</button>
                    </div>
                </>
            )}

            {/* Product Search Modal */}
            <ProductSearchModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelect={handleProductSelect}
                selectedBrand={formData.brand}
            />
        </div>
    );
}
