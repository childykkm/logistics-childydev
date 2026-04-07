import { useState, useContext } from 'react';
import { AppContext } from '@core/contexts/AppContext';

export default function Login() {
    const { login, isLoading, error, clearError } = useContext(AppContext);
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId || !password) return alert('아이디와 비밀번호를 입력해주세요.');
        
        const res = await login(userId, password);
        if (!res.success) {
            alert(res.message || '로그인에 실패했습니다. 관리자에게 문의하세요.');
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--primary)' }}>Logistics Seeding</h2>
                
                {error && (
                    <div className="alert badge-danger" style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px' }}>
                        <span>{error}</span>
                        <button onClick={clearError} style={{ float: 'right', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>&times;</button>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label">아이디</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="아이디를 입력하세요" 
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label className="form-label">비밀번호</label>
                        <input 
                            type="password" 
                            className="form-input" 
                            placeholder="비밀번호를 입력하세요" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                        disabled={isLoading}
                    >
                        {isLoading ? '로그인 중...' : '로그인'}
                    </button>
                    
                    {/* 실 데이터 연동을 위한 안내 메시지 */}
                    <div style={{ marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                        등록된 계정으로 로그인해주세요.<br/>
                        계정이 없다면 관리자에게 문의해주세요.
                    </div>
                </form>
            </div>
        </div>
    );
}
