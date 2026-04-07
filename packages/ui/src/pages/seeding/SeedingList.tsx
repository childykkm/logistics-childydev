import React, { useState, useMemo, useEffect, useCallback, FC } from 'react';
import { Filter, Download, Trash2, Edit, BarChart2, PieChart as PieChartIcon, AlertCircle, Search, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@core/contexts/AppContext';
import { usePermission } from '@core/hooks/usePermission';
import { seedingService } from '@core/services/seedingService';
import { exportSeedingToExcel } from '@core/services/excelSeedingExport';
import { STATUS_COLORS, STATUS_LABEL, STATUS_LIST, STATUS_MAP_TO_ENG, STATUS_MAP } from '@core/constants/status';
import { PageHeader, Card } from '../../components/common/Layout';
import StatusBadge from '../../components/StatusBadge';
import { Seeding } from '@core/types/seeding';
import styles from './SeedingList.module.css';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart2 as BarChart2Icon } from 'lucide-react';

const SeedingList: FC = () => {
    const { deleteSeeding, brands } = useAppContext();
    const { isRequester } = usePermission();
    const navigate = useNavigate();

    const [rows, setRows] = useState<Seeding[]>([]);
    const [filterBrand, setFilterBrand] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(30);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [localSearch, setLocalSearch] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(localSearch), 500);
        return () => clearTimeout(timer);
    }, [localSearch]);

    useEffect(() => {
        const load = async () => {
            const matchedBrand = brands.find(b => {
                const bName = typeof b === 'object' ? (b.name || (b as any).brand_name) : b;
                return bName === filterBrand;
            });
            const brandId = (matchedBrand as any)?.id || (matchedBrand as any)?.brand_id;
            const params: any = { page, per_page: limit };
            if (brandId) params.brand_id = brandId;
            if (filterStatus) params.status = STATUS_MAP_TO_ENG[filterStatus] ?? filterStatus;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (debouncedSearch) params.keyword = debouncedSearch;

            const res: any = await seedingService.getSeedings(params).catch(() => ({}));
            const rawList = Array.isArray(res) ? res : (res?.data || []);
            const pagination = res?.pagination || {};
            const total = pagination.total ?? res?.total ?? rawList.length;
            const pages = (pagination.total_pages ?? res?.total_pages ?? Math.ceil(total / limit)) || 1;
            setTotalCount(total);
            setTotalPages(pages);

            const toKorStatus = (s: string) => STATUS_MAP[s] ?? s;
            const loaded: Seeding[] = [];
            rawList.forEach((req: any) => {
                const rawItem = req.item;
                const itemList = Array.isArray(rawItem) ? rawItem : (rawItem ? [rawItem] : []);
                if (itemList.length === 0) {
                    loaded.push({ id: req.request_no, _dbId: req.id, brand: req.brand_name ?? '', brand_id: req.brand_id, date: req.created_at?.slice(0, 10) ?? '', orderName: req.requester_name ?? '', memo: req.notes ?? '', status: toKorStatus(req.status), hasStockIssue: false, itemCode: '', itemName: '', option1: '', option2: '', option3: '', qty: '', price: '', paymentPrice: '', expectedPrice: '', orderPhone: '', recipientName: '', recipientPhone: '', zipcode: '', address: '', orderNo: '', sellicCode: '', sellicOption: '' });
                } else {
                    itemList.forEach((item: any) => {
                        loaded.push({ id: req.request_no, _itemId: item.id, _dbId: req.id, brand: req.brand_name ?? '', brand_id: req.brand_id, status: toKorStatus(item.status ?? req.status), hasStockIssue: item.has_stock_issue ?? (item.status === 'reviewing'), date: item.order_date ?? req.created_at?.slice(0, 10) ?? '', itemCode: item.company_product_code ?? '', itemName: item.mall_product_name ?? item.company_product_code ?? '', option1: item.option_name ?? '', option2: item.option_name2 ?? '', option3: item.option_name3 ?? '', qty: item.order_qty ?? '', price: item.mall_sale_price ?? '', paymentPrice: item.mall_payment_amount ?? '', expectedPrice: item.settlement_amount ?? '', orderName: item.orderer_name ?? req.requester_name ?? '', orderPhone: item.orderer_phone ?? '', recipientName: item.recipient_name ?? '', recipientPhone: item.recipient_phone ?? '', zipcode: item.recipient_zipcode ?? '', address: item.recipient_address ?? '', orderNo: item.mall_order_no ?? '', memo: item.notes ?? req.notes ?? '', sellicCode: item.sellic_product_code ?? '', sellicOption: item.sellic_option_code ?? '' });
                    });
                }
            });
            setRows(loaded);
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, filterBrand, filterStatus, startDate, endDate, debouncedSearch]);

    const handleSearch = () => { setPage(1); };

    const chartData = useMemo(() => {
        const brandCounts: Record<string, number> = {};
        rows.forEach(s => {
            const bName = s.brand || '기타';
            brandCounts[bName] = (brandCounts[bName] || 0) + 1;
        });
        const brandChart = Object.keys(brandCounts).map(name => ({ name, count: brandCounts[name] })).sort((a, b) => b.count - a.count);
        const statusCounts: Record<string, number> = {};
        rows.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
        const statusChart = Object.keys(statusCounts).map(name => ({ name, value: statusCounts[name] }));
        return { brandChart, statusChart };
    }, [rows]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? rows.map(item => item.id) : []);
    };

    const handleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
    };

    const handleDownload = () => {
        if (selectedIds.length === 0) return alert('엑셀 다운로드할 요청 내역을 먼저 선택해주세요.');
        try {
            const dataToExport = rows.filter(item => selectedIds.includes(item.id));
            exportSeedingToExcel(dataToExport);
        } catch (error: any) {
            alert(error.message || '엑셀 다운로드 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        const found = rows.find(s => s.id === id);
        if (window.confirm('선택한 요청을 정말 삭제하시겠습니까?')) {
            const dbId = found?._dbId ? String(found._dbId) : id;
            await deleteSeeding(dbId);
            setSelectedIds(prev => prev.filter(sid => sid !== id));
            setPage(1);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return alert('삭제할 항목을 선택해주세요.');
        if (window.confirm(`선택한 ${selectedIds.length}건을 모두 삭제하시겠습니까?`)) {
            try {
                const deletable = selectedIds.map(id => rows.find(s => s.id === id)).filter((s): s is Seeding => !!s);
                const requestDbIds = [...new Set(deletable.map(s => s._dbId).filter((id): id is number => !!id))];
                await Promise.all(requestDbIds.map(dbId => seedingService.deleteSeeding(String(dbId))));
                setSelectedIds([]);
                setPage(1);
                alert(`${deletable.length}건이 삭제되었습니다.`);
            } catch {
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    };

    return (
        <div>
            <PageHeader title="시딩 요청 관리" />

            <div className="chart-grid">
                <Card
                    title={<div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}><BarChart2 size={20} color="var(--primary)" />브랜드별 시딩 요청 비중</div>}
                    style={{ minHeight: '350px' }}
                >
                    <div className="card-content" style={{ minHeight: '250px', position: 'relative' }}>
                        {chartData.brandChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={chartData.brandChart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: '#F3F4F6' }} />
                                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>통계 데이터가 없습니다.</div>
                        )}
                    </div>
                </Card>

                <Card
                    title={<div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}><PieChartIcon size={20} color="var(--success)" />진행 상태 현황</div>}
                    style={{ minHeight: '350px' }}
                >
                    <div className="card-content" style={{ minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {chartData.statusChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={chartData.statusChart} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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
                </Card>
            </div>

            <Card
                title={
                    <div className={styles.cardTitleFlex}>
                        <span className={`card-title ${styles.cardTitleText}`}>시딩 요청 내역</span>
                        <span className={styles.cardTitleCount}>전체 {totalCount}건</span>
                    </div>
                }
                headerAction={
                    <div className={styles.headerActionFlex}>
                        {!isRequester && (
                            <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '8px 16px' }} onClick={handleBulkDelete}>
                                <Trash2 size={16} /> 선택 삭제
                            </button>
                        )}
                        <button className={`btn btn-outline ${styles.cardTitleFlex}`} onClick={handleDownload} style={{ padding: '8px 16px' }}>
                            <Download size={16} /> OMS 엑셀 다운로드
                        </button>
                    </div>
                }
            >
                <div className="filter-bar">
                    <Filter size={15} color="#9CA3AF" />
                    <select className="form-select" style={{ width: 'auto', minWidth: '140px' }} value={filterBrand} onChange={e => { setFilterBrand(e.target.value); setPage(1); }}>
                        <option value="">전체 브랜드</option>
                        {brands.map((b, i) => {
                            const brandName = typeof b === 'object' ? (b.name || (b as any).brand_name) : b;
                            return <option key={i} value={brandName}>{brandName}</option>;
                        })}
                    </select>
                    <select className="form-select" style={{ width: 'auto', minWidth: '140px' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                        <option value="">전체 상태</option>
                        {STATUS_LIST.map((s, i) => <option key={i} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
                    </select>
                    <div className={styles.filterRow}>
                        <input type="date" className={`form-input ${styles.dateInput}`} value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
                        <span style={{ color: '#9CA3AF' }}>~</span>
                        <input type="date" className={`form-input ${styles.dateInput}`} value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                        <Search size={15} style={{ position: 'absolute', left: '10px', color: '#9CA3AF' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="주문자명, 연락처 검색"
                            value={localSearch}
                            onChange={e => { setLocalSearch(e.target.value); setPage(1); }}
                            style={{ paddingLeft: '32px', width: '200px' }}
                        />
                    </div>
                    <button
                        className="btn btn-outline"
                        style={{
                            padding: '8px 14px',
                            fontSize: '0.875rem',
                            ...(filterBrand || filterStatus || startDate || endDate || localSearch
                                ? { color: 'var(--primary)', borderColor: 'var(--primary)', background: '#EEF2FF' }
                                : { color: 'var(--text-muted)', borderColor: 'var(--border-color)' }
                            )
                        }}
                        onClick={() => { setFilterBrand(''); setFilterStatus(''); setStartDate(''); setEndDate(''); setLocalSearch(''); setPage(1); }}
                    >
                        <RotateCcw size={14} /> 필터 초기화
                    </button>
                </div>

                <div className={styles.tableWrapper}>
                    <div className="table-container">
                        <table className={`table ${styles.tableW2500}`}>
                            <thead>
                                <tr className={styles.nowrapCol}>
                                    <th>
                                        <input type="checkbox" onChange={handleSelectAll} checked={rows.length > 0 && selectedIds.length === rows.length} />
                                    </th>
                                    <th className={styles.minW80Col} style={{ textAlign: 'center' }}>상태</th>
                                    <th style={{ textAlign: 'center' }}>요청ID</th>
                                    <th>브랜드</th>
                                    <th>주문일자</th>
                                    <th>자사상품코드</th>
                                    <th>옵션명(쇼핑몰)</th>
                                    <th>옵션명2(쇼핑몰)</th>
                                    <th style={{ textAlign: 'center' }}>주문수량</th>
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
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => handleSelect(row.id)} />
                                        </td>
                                        <td className={styles.minW80Col} style={{ textAlign: 'center' }}>
                                            <div className={styles.flexCenterCol}>
                                                <StatusBadge status={row.status} />
                                                {row.hasStockIssue && (
                                                    <div style={{ position: 'relative', display: 'inline-block' }} className="stock-issue-wrapper">
                                                        <span className={`badge ${styles.actionBadge}`}><AlertCircle size={11} /> 검토필요</span>
                                                        <div className="stock-tooltip">재고 부족 품목이 포함되어 있습니다.<br />승인 전 재고 확인이 필요합니다.</div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className={styles.idLink} onClick={() => navigate(`/seeding/detail/${row.id}`)}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>{row.id}</div>
                                        </td>
                                        <td className={styles.nowrapCol}>{row.brand}</td>
                                        <td className={styles.nowrapCol}>{row.date}</td>
                                        <td className={styles.nowrapCol}>{row.itemCode}</td>
                                        <td className={styles.nowrapCol}>{row.option1}</td>
                                        <td className={styles.nowrapCol}>{row.option2}</td>
                                        <td className={styles.nowrapCol} style={{ textAlign: 'center' }}>{row.qty}</td>
                                        <td className={styles.nowrapCol}>{row.orderName}</td>
                                        <td className={styles.nowrapCol}>{row.orderPhone}</td>
                                        <td className={styles.nowrapCol}>{row.recipientName}</td>
                                        <td className={styles.nowrapCol}>{row.zipcode}</td>
                                        <td className={styles.ellipsis200} title={row.address}>{row.address}</td>
                                        <td className={styles.nowrapCol}>{row.recipientPhone}</td>
                                        <td className={styles.nowrapCol}>{row.orderNo}</td>
                                        <td className={styles.nowrapCol}>{row.price ? Math.floor(Number(row.price)).toLocaleString() : ''}</td>
                                        <td className={styles.nowrapCol}>{row.paymentPrice ? Math.floor(Number(row.paymentPrice)).toLocaleString() : '0'}</td>
                                        <td className={styles.ellipsis150} title={row.itemName}>{row.itemName}</td>
                                        <td className={styles.ellipsis150} title={row.memo}>{row.memo}</td>
                                        <td className={styles.nowrapCol}>{row.expectedPrice ? Math.floor(Number(row.expectedPrice)).toLocaleString() : ''}</td>
                                        <td className={styles.nowrapCol}>{row.sellicCode}</td>
                                        <td className={styles.nowrapCol}>{row.sellicOption}</td>
                                        <td className={styles.nowrapCol}>{row.option3}</td>
                                        <td>
                                            <div className={styles.headerActionFlex}>
                                                <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => navigate(`/seeding/detail/${row.id}`)}>
                                                    <Edit size={16} />
                                                </button>
                                                {!isRequester && (
                                                    <button className="btn btn-outline" style={{ padding: '4px 8px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(row.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 4px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
                        <span>페이지당</span>
                        <select
                            className="form-select"
                            style={{ width: 'auto', minWidth: 'fit-content', paddingRight: '40px' }}
                            value={limit}
                            onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                        >
                            <option value={30}>30건</option>
                            <option value={50}>50건</option>
                            <option value={100}>100건</option>
                            <option value={300}>300건</option>
                            <option value={500}>500건</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px 14px' }} disabled={page === 1} onClick={() => setPage(1)}>«</button>
                        <button className="btn btn-outline" style={{ padding: '6px 14px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                        <span style={{ padding: '6px 16px', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{page} / {totalPages}</span>
                        <button className="btn btn-outline" style={{ padding: '6px 14px' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                        <button className="btn btn-outline" style={{ padding: '6px 14px' }} disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SeedingList;
