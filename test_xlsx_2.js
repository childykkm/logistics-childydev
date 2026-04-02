import * as XLSX from 'xlsx';

// create a dummy workbook
const ws = XLSX.utils.aoa_to_sheet([
    ["주문일자", "이름"],
    [46085, "김강모"],
    [46080, "테스트"]
]);
ws['A2'].z = 'yyyy.m.d';
ws['A3'].z = 'yyyy.mm.dd';

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

const dataRaw = XLSX.utils.sheet_to_json(ws);
console.log('raw:', dataRaw);

const dataFormatted = XLSX.utils.sheet_to_json(ws, { raw: false });
console.log('formatted:', dataFormatted);
