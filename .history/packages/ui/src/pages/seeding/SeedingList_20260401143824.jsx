import { useState, useContext, useMemo, useEffect, useCallback } from 'react';
import { Filter, Download, Trash2, Edit, TrendingUp, BarChart2, PieChart as PieChartIcon, AlertCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { AppContext } from '@core/contexts/AppContext';
import { seedingService } from '@core/services/seedingService';
import { STATUS_COLORS, STATUS_LABEL } from '@core/constants/status';
import { S_PENDING, S_REVIEWING } from '@core/constants/status';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

export default function SeedingList() {
    const { seedings, deleteSeeding, globalSearch, setGlobalSearch, brands, statuses, fetchData } = useContext(AppContext);
    const navigate = useNavigate();

    const [filterBrand, setFilterBrand] = useState('전체 브랜드');
    const [filterStatus, setFilterStatus] = useState('전체 상태');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(30);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [hasNext, setHasNext] = useState(false);

    const fetchPage = useCallback(async (p = page, l = limit) => {
        const result = await fetchData({ page: p, per_page: l });
        if (result) {
            setTotalCount(result.total);
            setHasNext(result.hasNext);
            setTotalPages(result.totalPages ?? 1);
        }
    }, [fetchData, page, limit]);

    useEffect(() => {
        fetchPage(page, limit);
    }, [page, limit]); // eslint-disable-line

    // Chart Data calculations
    const chartData = useMemo(() => {
        // Brand Data
        const brandCounts = {};
        seedings.forEach(s => {
            brandCounts[s.brand] = (brandCounts[s.brand] || 0) + 1;
        });
        const brandChart = Object.keys(brandCounts).map(name => ({
            name,
            count: brandCounts[name]
        })).sort((a, b) => b.count - a.count);

        // Status Data
        const statusCounts = {};
        seedings.forEach(s => {
            statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
        });
        const statusChart = Object.keys(statusCounts).map(name => ({
            name,
            value: statusCounts[name]
        }));

        return { brandChart, statusChart };
    }, [seedings]);

    const filteredData = seedings.filter(item => {
        const matchBrand = filterBrand === '전체 브랜드' || item.brand === filterBrand;
        const matchStatus = filterStatus === '전체 상태' || item.status === filterStatus;
        const matchStartDate = startDate ? new Date(item.date) >= new Date(startDate) : true;
        const matchEndDate = endDate ? new Date(item.date) <= new Date(endDate) : true;
        const matchSearch = globalSearch ? (
            (item.orderName || '').includes(globalSearch) ||
            (item.orderPhone || '').includes(globalSearch) ||
            (item.id || '').includes(globalSearch) ||
            (item.recipientName || '').includes(globalSearch)
        ) : true;
        return matchBrand && matchStatus && matchStartDate && matchEndDate && matchSearch;
    });

    const getStatusBadge = (status) => {
        const c = STATUS_COLORS[status];
        if (!c) return <span className="badge">{status}</span>;
        return <span className="badge" style={{ background: c.bg, color: c.text }}>{STATUS_LABEL[status] ?? status}</span>;
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredData.map(item => item.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleDownload = () => {
        if (selectedIds.length === 0) {
            return alert('엑셀 다운로드할 요청 내역을 먼저 선택해주세요.');
        }

        const dataToExport = filteredData.filter(item => selectedIds.includes(item.id));

        // Exact requested 20 columns layout
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
        XLSX.utils.book_append_sheet(workbook, worksheet, "시딩요청");

        XLSX.writeFile(workbook, `시딩요청목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const DELETABLE_STATUSES = [S_PENDING, S_REVIEWING];

    const handleDelete = async (id) => {
        const found = seedings.find(s => s.id === id);
        if (!DELETABLE_STATUSES.includes(found?.status)) {
            return alert(`'${found?.status}' 상태의 요청건은 삭제할 수 없습니다.\n(대기, 검토중 상태만 삭제 가능)`);
        }
        if (window.confirm('선택한 요청을 정말 삭제하시겠습니까?')) {
            const dbId = found?._dbId ?? id;
            await deleteSeeding(dbId);
            setSelectedIds(prev => prev.filter(sid => sid !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return alert('삭제할 항목을 선택해주세요.');

        const selectedSeedings = selectedIds.map(id => seedings.find(s => s.id === id)).filter(Boolean);
        const deletable = selectedSeedings.filter(s => DELETABLE_STATUSES.includes(s.status));
        const nonDeletable = selectedSeedings.filter(s => !DELETABLE_STATUSES.includes(s.status));

        if (deletable.length === 0) {
            return alert(`선택한 항목은 모두 삭제할 수 없는 상태입니다.\n(대기, 검토중 상태만 삭제 가능)`);
        }

        let confirmMsg = `선택한 ${selectedIds.length}건 중 ${deletable.length}건을 삭제합니다.`;
        if (nonDeletable.length > 0) {
            const nonDeletableStatuses = [...new Set(nonDeletable.map(s => s.status))].join(', ');
            confirmMsg += `\n\n삭제 불가 ${nonDeletable.length}건 (${nonDeletableStatuses} 상태)은 제외됩니다.\n계속 진행하시겠습니까?`;
        } else {
            confirmMsg += '\n정말 삭제하시겠습니까?';
        }

        if (window.confirm(confirmMsg)) {
            try {
                const requestDbIds = [...new Set(deletable.map(s => s._dbId).filter(Boolean))];
                await Promise.all(requestDbIds.map(dbId => seedingService.deleteSeeding(dbId)));
                setSelectedIds([]);
                await fetchData();
                alert(`${deletable.length}건이 삭제되었습니다.`);
            } catch (err) {
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    };

    return (
        <>
            {/* Dashboard Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <BarChart2 size={20} color="var(--primary)" />
                        브랜드별 시딩 요청 비중
                    </div>
                    <div style={{ flex: 1, width: '100%', minHeight: '250px', minWidth: 0, position: 'relative' }}>
                        {chartData.brandChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={chartData.brandChart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        cursor={{ fill: '#F3F4F6' }}
                                    />
                                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>통계 데이터가 없습니다.</div>
                        )}
                    </div>
                </div>

                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <PieChartIcon size={20} color="var(--success)" />
                        진행 상태 현황
                    </div>
                    <div style={{ flex: 1, width: '100%', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, position: 'relative' }}>
                        {chartData.statusChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={chartData.statusChart}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.statusChart.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]?.chart ?? '#9CA3AF'} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ color: 'var(--text-muted)' }}>진행 데이터가 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="card-title" style={{ margin: 0 }}>시딩 요청 내역</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}>총 {filteredData.length}건</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '8px 16px' }} onClick={handleBulkDelete}>
                            <Trash2 size={16} /> 선택 삭제
                        </button>
                        <button className="btn btn-outline" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                            <Download size={16} /> OMS 엑셀 다운로드
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ background: '#F9FAFB', padding: '12px 16px', borderRadius: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                    <Filter size={15} color="#9CA3AF" />
                    <select className="form-select" style={{ width: 'auto', minWidth: '140px' }} value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
                        <option>전체 브랜드</option>
                        {brands.map((b, i) => {
                            const brandName = typeof b === 'object' ? (b.name || b.brand_name) : b;
                            return <option key={i} value={brandName}>{brandName}</option>;
                        })}
                    </select>
                    <select className="form-select" style={{ width: 'auto', minWidth: '140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>전체 상태</option>
                        {statuses.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="date" className="form-input" style={{ width: '150px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <span style={{ color: '#9CA3AF' }}>~</span>
                        <input type="date" className="form-input" style={{ width: '150px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                        <Search size={15} style={{ position: 'absolute', left: '10px', color: '#9CA3AF' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="요청자, 연락처, ID 검색"
                            value={globalSearch}
                            onChange={e => setGlobalSearch(e.target.value)}
                            style={{ paddingLeft: '32px', width: '200px' }}
                        />
                    </div>
                    <button className="btn btn-primary" style={{ padding: '8px 20px' }}>조회하기</button>
                </div>

                {/* Table */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="table" style={{ minWidth: '2500px' }}>
                        <thead>
                            <tr style={{ whiteSpace: 'nowrap' }}>
                                <th>
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                                    />
                                </th>
                                <th style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>상태</th>
                                <th>요청ID</th>
                                <th>브랜드</th>

                                {/* 20 Requested Columns */}
                                <th>주문일자</th>
                                <th>자사상품코드</th>
                                <th>옵션명(쇼핑몰)</th>
                                <th>옵션명2(쇼핑몰)</th>
                                <th>주문수량</th>
                                <th>주문자명</th>
                                <th>주문자 휴대폰</th>
                                <th>수취인명</th>
                                <th>수취인 우편번호</th>
                                <th>수취인 주소</th>
                                <th>수취인 휴대폰</th>
                                <th>주문번호(쇼핑몰)</th>
                                <th>판매가(쇼핑몰)</th>
                                <th>결제금액(쇼핑몰)</th>
                                <th>상품명(쇼핑몰)</th>
                                <th>비고</th>
                                <th>정산예정금액</th>
                                <th>상품코드(셀릭)</th>
                                <th>옵션코드(셀릭)</th>
                                <th>옵션명3(쇼핑몰)</th>

                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(row.id)}
                                            onChange={() => handleSelect(row.id)}
                                        />
                                    </td>
                                    <td style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                            {getStatusBadge(row.status)}
                                            {row.hasStockIssue && (
                                                <div style={{ position: 'relative', display: 'inline-block' }} className="stock-issue-wrapper">
                                                    <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                        <AlertCircle size={11} /> 검토필요
                                                    </span>
                                                    <div className="stock-tooltip">
                                                        재고 부족 품목이 포함되어 있습니다.<br/>
                                                        승인 전 재고 확인이 필요합니다.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td
                                        style={{ fontWeight: 500, color: 'var(--info)', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                                        onClick={() => navigate(`/seeding/detail/${row.id}`)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {row.id}
                                        </div>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.brand}</td>

                                    {/* Data fields matching the 20 columns */}
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.date}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.itemCode}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.option1}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.option2}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.qty}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.orderName}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.orderPhone}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.recipientName}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.zipcode}</td>
                                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }} title={row.address}>{row.address}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.recipientPhone}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.orderNo}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.price ? Math.floor(Number(row.price)).toLocaleString() : ''}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.paymentPrice ? Math.floor(Number(row.paymentPrice)).toLocaleString() : '0'}</td>
                                    <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }} title={row.itemName}>{row.itemName}</td>
                                    <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }} title={row.memo}>{row.memo}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.expectedPrice ? Math.floor(Number(row.expectedPrice)).toLocaleString() : ''}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.sellicCode}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.sellicOption}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.option3}</td>

                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => navigate(`/seeding/detail/${row.id}`)}>
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn btn-outline" style={{ padding: '4px 8px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(row.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan="25">
                                        <div style={{
                                            position: 'sticky',
                                            left: 0,
                                            width: 'calc(100vw - 320px)', 
                                            display: 'flex',
                                            justifyContent: 'center',
                                            padding: '60px 0',
                                            color: 'var(--text-muted)'
                                        }}>
                                            조건에 맞는 결과가 없습니다.
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                </div>

                {/* 페이징 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 4px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <span>페이지당</span>
                        <select
                            className="form-select"
                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.875rem' }}
                            value={limit}
                            onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                        >
                            <option value={30}>30건</option>
                            <option value={50}>50건</option>
                            <option value={100}>100건</option>
                        </select>
                        <span>시시 표시 | 전체 {totalCount}건</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.875rem' }} disabled={page === 1} onClick={() => setPage(1)}>«</button>
                        <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.875rem' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                        <span style={{ padding: '4px 12px', fontSize: '0.875rem', fontWeight: 600 }}>{page} / {totalPages}</span>
                        <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.875rem' }} disabled={!hasNext} onClick={() => setPage(p => p + 1)}>›</button>
                        <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.875rem' }} disabled={!hasNext} onClick={() => setPage(totalPages)}>»</button>
                    </div>
                </div>
            </div>
        </>
    );
}
