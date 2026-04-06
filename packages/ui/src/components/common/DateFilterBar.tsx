import { Filter } from 'lucide-react';

interface Props {
    startDate: string;
    endDate: string;
    onStartDate: (v: string) => void;
    onEndDate: (v: string) => void;
    onToday: () => void;
    onAll: () => void;
}

const DateFilterBar = ({ startDate, endDate, onStartDate, onEndDate, onToday, onAll }: Props) => (
    <div className="filter-bar">
        <Filter size={15} color="#9CA3AF" />
        <input type="date" className="form-input" style={{ width: 'auto' }} value={startDate} onChange={e => onStartDate(e.target.value)} />
        <span style={{ color: '#9CA3AF' }}>~</span>
        <input type="date" className="form-input" style={{ width: 'auto' }} value={endDate} onChange={e => onEndDate(e.target.value)} />
        <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.875rem' }} onClick={onToday}>오늘</button>
        <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.875rem' }} onClick={onAll}>전체</button>
    </div>
);

export default DateFilterBar;
