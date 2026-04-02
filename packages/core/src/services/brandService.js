import client from '@core/api/client';

export const brandService = {
    // 브랜드 목록 조회
    getBrands: async () => {
        return await client.get('/brands.php?action=list');
    },

    // 브랜드 생성 (name, description, mall_id)
    createBrand: async (data) => {
        return await client.post('/brands.php?action=create', data);
    },

    // 브랜드 수정 (name, mall_id, description)
    updateBrand: async (id, data) => {
        return await client.put(`/brands.php?id=${id}`, data);
    },

    // 브랜드 삭제
    deleteBrand: async (id) => {
        return await client.delete(`/brands.php?id=${id}`);
    },

    // OAuth 연결 해제
    disconnectBrand: async (id) => {
        return await client.get(`/brands.php?action=disconnect&id=${id}`);
    }
};

export const departmentService = {
    // 부서 목록 조회
    getDepartments: async () => {
        return await client.get('/departments.php?action=list');
    },

    // 부서 멤버 조회
    getDeptMembers: async (deptId) => {
        return await client.get(`/departments.php?action=members&dept_id=${deptId}`);
    },

    // 부서 생성
    createDept: async (data) => {
        return await client.post('/departments.php?action=create', data);
    },

    // 사용자 부서 할당
    assignUser: async (data) => {
        return await client.post('/departments.php?action=assign_user', data);
    }
};

export const permissionService = {
    // 내 브랜드 권한 조회
    getMyBrands: async () => {
        return await client.get('/permissions.php?action=my_brands');
    },

    // 사용자 브랜드 권한 조회
    getUserPermissions: async (userId) => {
        return await client.get(`/permissions.php?action=user_permissions&user_id=${userId}`);
    },

    // 브랜드 쇼핑몰 연결 확인
    checkBrandMall: async (brandId) => {
        return await client.get(`/permissions.php?action=check_brand_mall&brand_id=${brandId}`);
    },

    // 브랜드 권한 부여
    grantPermission: async (data) => {
        // data: { user_id, brand_id }
        return await client.post('/permissions.php?action=grant', data);
    },

    // 브랜드 권한 제거
    revokePermission: async (userId, brandId) => {
        return await client.delete(`/permissions.php?user_id=${userId}&brand_id=${brandId}`);
    }
};
