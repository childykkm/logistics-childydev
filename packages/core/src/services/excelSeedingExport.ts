import * as XLSX from 'xlsx';
import { Seeding } from '../types/seeding';

/**
 * 필터링된 시딩 리스트 배열을 받아 OMS 양식의 엑셀 파일로 다운로드합니다.
 * @param {Seeding[]} dataToExport 엑셀로 내보낼 시딩 배열
 */
export function exportSeedingToExcel(dataToExport: Seeding[]) {
    if (!dataToExport || dataToExport.length === 0) {
        throw new Error('엑셀 다운로드할 데이터가 없습니다.');
    }

    const excelData = dataToExport.map((item) => ({
        '주문일자': item.date || '',
        '자사상품코드': item.itemCode || '',
        '옵션명(쇼핑몰)': item.option1 || '',
        '옵션명2(쇼핑몰)': item.option2 || '',
        '주문수량': item.qty || '',
        '주문자명': item.orderName || '',
        '주문자 휴대폰': item.orderPhone || '',
        '수취인명': item.recipientName || '',
        '수취인 우편번호': item.zipcode || '',
        '수취인 주소': item.address || '',
        '수취인 휴대폰': item.recipientPhone || '',
        '주문번호(쇼핑몰)': item.orderNo || '',
        '판매가(쇼핑몰)': item.price || '',
        '결제금액(쇼핑몰)': item.paymentPrice || '0',
        '상품명(쇼핑몰)': item.itemName || '',
        '비고': item.memo || '',
        '정산예정금액': item.expectedPrice || '',
        '상품코드(셀릭)': item.sellicCode || '',
        '옵션코드(셀릭)': item.sellicOption || '',
        '옵션명3(쇼핑몰)': item.option3 || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '시딩요청');
    XLSX.writeFile(workbook, `시딩요청목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
