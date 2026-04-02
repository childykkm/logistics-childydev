import client from '@core/api/client';

export const authService = {
    // 로그인
    login: async (userId, password) => {
        // 백엔드 API 명세가 'username'을 요구하므로 매핑
        return await client.post('/auth.php?action=login', { username: userId, password });
    },

    // 회원가입
    register: async (userData) => {
        // userData는 username, email, password, name, role 등 포함
        return await client.post('/auth.php?action=register', userData);
    },

    // 토큰 검증
    verifyToken: async () => {
        return await client.post('/auth.php?action=verify');
    },

    // OAuth URL 생성
    getOAuthUrl: async (mall_id) => {
        return await client.post('/oauth.php', { mall_id });
    }
};
