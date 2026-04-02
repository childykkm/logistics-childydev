import * as XLSX from 'xlsx';

const ws = XLSX.utils.aoa_to_sheet([
    ["주문일자", "이름"],
    [46085, "김강모"],
    [46080, "테스트"]
]);
ws['A2'].z = 'yyyy.m.d';
ws['A3'].z = 'yyyy.mm.dd';

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

const out = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });
const wb2 = XLSX.read(out, { type: 'binary', cellDates: true });
const ws2 = wb2.Sheets[wb2.SheetNames[0]];

const data = XLSX.utils.sheet_to_json(ws2);
console.log('Result with cellDates: true ->', data);
