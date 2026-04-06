import React, { useState, useMemo, useEffect, useCallback, FC } from 'react';
import { Filter, Download, Trash2, Edit, BarChart2, PieChart as PieChartIcon, AlertCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@core/contexts/AppContext';
import { seedingService } from '@core/services/seedingService';
import { exportSeedingToExcel } from '@core/services/excelSeedingExport';
import { STATUS_COLORS, STATUS_LABEL, STATUS_LIST } from '@core/constants/status';
import { PageHeader, Card } from '../../components/common/Layout';
import StatusBadge from '../../components/StatusBadge';
import { Seeding } from '@core/types/seeding';
import styles from './SeedingList.module.css';
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

const SeedingList: FC = () => {
    const { seedings, deleteSeeding, globalSearch, setGlobalSearch, brands, fetchData, currentUser } = useAppContext();
    const isRequester = currentUser?.role === 'requester';
    const navigate = useNavigate();

    const [filterBrand, setFilterBrand] = useState<string>('전체 브랜드');
    const [filterStatus, setFilterStatus] = useState<string>('전체 상태');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(30);

    const fetchPage = useCallback(async () => {
        await fetchData(); // Fetch all (up to 500 by default)
    }, [fetchData]);

    useEffect(() => {
        fetchPage();
    }, [fetchPage]);

    // Chart Data calculations
    const chartData = useMemo(() => {
        const brandCounts: Record<string, number> = {};
        seedings.forEach(s => {
            const bName = s.brand || '기타';
            brandCounts[bName] = (brandCounts[bName] || 0) + 1;
        });
        const brandChart = Object.keys(brandCounts).map(name => ({
            name,
            count: brandCounts[name]
        })).sort((a, b) => b.count - a.count);

        const statusCounts: Record<string, number> = {};
        seedings.forEach(s => {
            statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
        });
        const statusChart = Object.keys(statusCounts).map(name => ({
            name,
            value: statusCounts[name]
        }));

        return { brandChart, statusChart };
    }, [seedings]);

    const filteredData = useMemo(() => {
        return seedings.filter(item => {
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
    }, [seedings, filterBrand, filterStatus, startDate, endDate, globalSearch]);

    // 로컬 페이징 계산 (filteredData 이후에 선언되어야 함)
    const pagination = useMemo(() => {
        // filteredData가 이미 seedings, filterBrand 등에 의존하고 있으므로
        // filteredData.length가 실제 "전체" 필터링된 데이터 갯수입니다.
        const totalCount = filteredData.length;
        const totalPages = Math.ceil(totalCount / limit) || 1;
        const hasNext = page < totalPages;

        // 실제 렌더링할 데이터 슬라이싱
        const startIndex = (page - 1) * limit;
        const dataToRender = filteredData.slice(startIndex, startIndex + limit);

        return { totalCount, totalPages, hasNext, dataToRender };
    }, [filteredData, page, limit]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredData.map(item => item.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id: string) => {
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
        try {
            const dataToExport = filteredData.filter(item => selectedIds.includes(item.id));
            exportSeedingToExcel(dataToExport);
        } catch (error: any) {
            alert(error.message || '엑셀 다운로드 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        const found = seedings.find(s => s.id === id);
        if (window.confirm('선택한 요청을 정말 삭제하시겠습니까?')) {
            const dbId = found?._dbId ? String(found._dbId) : id;
            await deleteSeeding(dbId);
            setSelectedIds(prev => prev.filter(sid => sid !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return alert('삭제할 항목을 선택해주세요.');

        const selectedSeedings = selectedIds.map(id => seedings.find(s => s.id === id)).filter((s): s is Seeding => !!s);
        const deletable = selectedSeedings;
        let confirmMsg = `선택한 ${selectedIds.length}건을 모두 삭제하시겠습니까?`;

        if (window.confirm(confirmMsg)) {
            try {
                const requestDbIds = [...new Set(deletable.map(s => s._dbId).filter((id): id is number => !!id))];
                await Promise.all(requestDbIds.map(dbId => seedingService.deleteSeeding(String(dbId))));
                setSelectedIds([]);
                await fetchData();
                alert(`${deletable.length}건이 삭제되었습니다.`);
            } catch (err) {
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    };

    return (
        <div>
            <PageHeader title="시딩 요청 관리" />

            <div className="chart-grid">
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}>
                            <BarChart2 size={20} color="var(--primary)" />
                            브랜드별 시딩 요청 비중
                        </div>
                    }
                    style={{ minHeight: '350px' }}
                >
                    <div className="card-content" style={{ minHeight: '250px', position: 'relative' }}>
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
                </Card>

                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}>
                            <PieChartIcon size={20} color="var(--success)" />
                            진행 상태 현황
                        </div>
                    }
                    style={{ minHeight: '350px' }}
                >
                    <div className="card-content" style={{ minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
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
                </Card>
            </div>

            <Card
                title={
                    <div className={styles.cardTitleFlex}>
                        <span className={`card-title ${styles.cardTitleText}`}>시딩 요청 내역</span>
                        <span className={styles.cardTitleCount}>전체 {pagination.totalCount}건</span>
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
                    <select className="form-select" style={{ width: 'auto', minWidth: '140px' }} value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
                        <option>전체 브랜드</option>
                        {brands.map((b, i) => {
                            const brandName = typeof b === 'object' ? (b.name || b.brand_name) : b;
                            return <option key={i} value={brandName}>{brandName}</option>;
                        })}
                    </select>
                    <select className="form-select" style={{ width: 'auto', minWidth: '140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>전체 상태</option>
                        {STATUS_LIST.map((s, i) => <option key={i} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
                    </select>
                    <div className={styles.filterRow}>
                        <input type="date" className={`form-input ${styles.dateInput}`} value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <span style={{ color: '#9CA3AF' }}>~</span>
                        <input type="date" className={`form-input ${styles.dateInput}`} value={endDate} onChange={e => setEndDate(e.target.value)} />
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

                <div className={styles.tableWrapper}>
                    <div className="table-container">
                        <table className={`table ${styles.tableW2500}`}>
                            <thead>
                                <tr className={styles.nowrapCol}>
                                    <th>
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                                        />
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
                                {pagination.dataToRender.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(row.id)}
                                                onChange={() => handleSelect(row.id)}
                                            />
                                        </td>
                                        <td className={styles.minW80Col} style={{ textAlign: 'center' }}>
                                            <div className={styles.flexCenterCol}>
                                                <StatusBadge status={row.status} />
                                                {row.hasStockIssue && (
                                                    <div style={{ position: 'relative', display: 'inline-block' }} className="stock-issue-wrapper">
                                                        <span className={`badge ${styles.actionBadge}`}>
                                                            <AlertCircle size={11} /> 검토필요
                                                        </span>
                                                        <div className="stock-tooltip">
                                                            재고 부족 품목이 포함되어 있습니다.<br />
                                                            승인 전 재고 확인이 필요합니다.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className={styles.idLink}
                                            onClick={() => navigate(`/seeding/detail/${row.id}`)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                {row.id}
                                            </div>
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
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px 14px' }} disabled={page === 1} onClick={() => setPage(1)}>«</button>
                        <button className="btn btn-outline" style={{ padding: '6px 14px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                        <span style={{ padding: '6px 16px', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{page} / {pagination.totalPages}</span>
                        {/* 다음 페이지: 로컬 페이징이므로 hasNext가 확실합니다 */}
                        <button className="btn btn-outline" style={{ padding: '6px 14px' }} disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>›</button>
                        <button className="btn btn-outline" style={{ padding: '6px 14px' }} disabled={page >= pagination.totalPages} onClick={() => setPage(pagination.totalPages)}>»</button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SeedingList;
