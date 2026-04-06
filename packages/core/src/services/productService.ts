import client from '@core/api/client';

interface ProductParams {
    mall_id?: string;
    keyword?: string;
    limit?: number;
    search_type?: string;
}

interface Seeding {
    _dbId: number;
    _itemId?: number;
    brand: string;
    brand_id?: number | string;
    status: string;
}

export const productService = {
    // 상품 목록 및 검색 조회 (mall_id 필수)
    getProducts: async ({ mall_id, keyword, limit = 50, search_type }: ProductParams = {}) => {
        // mall_id가 없으면 기본값(예: ondy01)을 사용할 수도 있음
        const mid = mall_id || 'ondy01';
        let url = `/products.php?action=list&mall_id=${mid}&limit=${limit}`;
        if (search_type) {
            url += `&search_type=${search_type}`;
        }
        if (keyword) {
            url += `&keyword=${encodeURIComponent(keyword)}`;
        }
        return await client.get(url);
    },

    // 재고 상태 조회 (request_id 기반)
    checkInventory: async (request_id: string | number) => {
        return await client.post('/inventory.php?action=check', { request_id });
    },

    // 재고 차감 처리
    deductInventory: async (request_id, is_test = false) => {
        return await client.post('/inventory.php?action=deduct', { request_id, is_test });
    }
};
