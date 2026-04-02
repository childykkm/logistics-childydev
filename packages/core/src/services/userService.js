import client from '@core/api/client';

export const userService = {
    // 사용자 목록 조회
    getUsers: async () => {
        return await client.get('/users.php?action=list');
    },

    // 사용자 생성
    createUser: async (userData) => {
        // userData: username, email, password, name, role
        return await client.post('/users.php?action=create', userData);
    },

    // 사용자 수정
    updateUser: async (id, userData) => {
        return await client.put(`/users.php?id=${id}`, userData);
    },

    // 사용자 삭제
    deleteUser: async (id) => {
        return await client.delete(`/users.php?id=${id}`);
    }
};
