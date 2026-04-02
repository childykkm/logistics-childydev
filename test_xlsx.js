import * as XLSX from 'xlsx';

// Create test dates
const date46080 = new Date(Math.round((46080 - 25569) * 86400 * 1000));
console.log('46080 parsed natively:', date46080.getUTCFullYear(), date46080.getUTCMonth() + 1, date46080.getUTCDate());

// The user said the file had 2026.3.4 but it showed as 2026.2.27
// How many days difference? Feb has 28 days.
// 27th Feb -> 28th Feb (1) -> 1st Mar (2) -> 2nd Mar (3) -> 3rd Mar (4) -> 4th Mar (5)
console.log('Using XLSX native 46080: ', XLSX.SSF.format('yyyy.m.d', 46080));
console.log('Using XLSX native 46085: ', XLSX.SSF.format('yyyy.m.d', 46085));

// What if the user is using the Mac 1904 date system in Excel?
// A date in 1904 system has an offset of 1462 days less than the 1900 system.
console.log('1904 system test for 46080:', XLSX.SSF.format('yyyy.m.d', 46080 + 1462));

console.log('46080 with type cellDates', XLSX.utils.format_cell({ t: 'd', v: 46080, w: '2026.3.4' }));
