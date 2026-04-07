import * as XLSX from 'xlsx';
import { productService } from './productService';

interface ExcelRow {
    [key: string]: any;
}

export interface PreviewItem {
    brand: string;
    date: string;
    itemCode: string;
    itemName: string;
    option1: string;
    option2: string;
    option3: string;
    qty: number;
    price: number;
    paymentPrice: string;
    expectedPrice: string;
    stock: number | string;
    expectedStock: number | string;
    orderName: string;
    orderPhone: string;
    recipientName: string;
    zipcode: string;
    address: string;
    recipientPhone: string;
    orderNo: string;
    memo: string;
    sellicCode: string;
    sellicOption: string;
    id: string;
}

function formatExcelDate(val: any): string {
    if (!val) return new Date().toLocaleDateString('ko-KR').replace(/\s/g, '').replace(/\.$/, '');

    let date: Date;
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
}

/**
 * 엑셀 파일을 파싱하고, 서버와 연동하여 실시간 재고를 매핑합니다.
 */
export async function parseSeedingExcel(file: File, selectedBrandName: string, brands: any[]): Promise<PreviewItem[]> {
    if (!selectedBrandName) {
        throw new Error('엑셀 업로드 전 대상을 지정할 브랜드를 "기본 정보"에서 먼저 선택해주세요.');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (evt: any) => {
            try {
                const buffer = evt.target.result;
                const wb = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json<ExcelRow>(ws, { raw: false });
                const ref = ws['!ref'];
                const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
                
                let dateColIndex = -1;
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
                    if (ws[addr] && ws[addr].v === '주문일자') {
                        dateColIndex = C;
                        break;
                    }
                }

                if (rawData.length === 0) {
                    throw new Error('엑셀 파일에 데이터가 없습니다.');
                }

                const targetBrand = brands.find(b => {
                    const bName = typeof b === 'object' ? (b.name || b.brand_name) : b;
                    return bName === selectedBrandName;
                });
                const mall_id = targetBrand ? (targetBrand.mall_id || targetBrand.cafe24_mall_id) : undefined;
                
                const uniqueExcelCodes = [...new Set(rawData.map(row => 
                    String(row['자사상품코드'] || row['품목코드'] || row['자사코드'] || row['상품코드'] || row['자사상품코드(옵션)'] || row['품목 코드'] || '').trim()
                ).filter(Boolean))];

                const productResRaw: any[] = [];
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
                        const list = Array.isArray(res) ? res
                            : Array.isArray((res as any).data) ? (res as any).data
                            : [];
                        productResRaw.push(...list);
                    });
                }
                
                const allProducts: any[] = [];
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
                                _customVariantCode: v.custom_variant_code || '',
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
                            _customVariantCode: '',
                            product_name: p.product_name,
                            price: p.price,
                        });
                    }
                });

                const stockTracker: Record<string, number> = {};

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

                    const trackerKey = `${normalizedExcelCode}_${rawOption1}_${rawOption2}`;
                    let currentStock: number | string = stock;
                    let expectedStock: number | string;
                    
                    if (typeof stock === 'number') {
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
                        brand: selectedBrandName,
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
                        sellicOption: matchedProduct?._customVariantCode || row['옵션코드(셀릭)'] || '',
                        id: Math.random().toString(36).substr(2, 9)
                    } as PreviewItem;
                });

                resolve(previewItems);
            } catch (error) {
                console.error(error);
                reject(new Error('엑셀 파싱 및 처리 중 오류가 발생했습니다.'));
            }
        };

        reader.onerror = () => reject(new Error('파일을 읽는 중 문제가 발생했습니다.'));
        reader.readAsArrayBuffer(file);
    });
}
