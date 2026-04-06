import client from '@core/api/client';
import { User } from '../types/seeding';

export const userService = {
    // 모든 사용자 조회
    getUsers: async (): Promise<User[]> => {
        return await client.get('/users.php?action=list');
    },

    // 단일 사용자 상세 조회
    getUserDetail: async (id: string | number): Promise<User> => {
        return await client.get(`/users.php?action=detail&id=${id}`);
    },

    // 사용자 생성 (회원가입과 별개로 관리자용)
    createUser: async (data: any): Promise<any> => {
        return await client.post('/users.php?action=create', data);
    },

    // 사용자 정보 수정
    updateUser: async (id: string | number, data: any): Promise<any> => {
        return await client.put(`/users.php?id=${id}`, data);
    },

    // 사용자 삭제
    deleteUser: async (id: string | number): Promise<any> => {
        return await client.delete(`/users.php?id=${id}`);
    }
};
