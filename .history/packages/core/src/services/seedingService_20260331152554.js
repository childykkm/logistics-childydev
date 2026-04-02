import client from '@core/api/client';

export const seedingService = {
    // 시딩 요청 목록 조회
    getSeedings: async (filters = {}) => {
        return await client.get('/requests.php?action=list', { params: filters });
    },

    // 시딩 요청 상세 조회
    getSeedingDetail: async (id) => {
        return await client.get(`/requests.php?action=detail&id=${id}`);
    },

    // 단건 등록
    createSeeding: async (data) => {
        const payload = {
            brand_id: data.brand_id,
            order_date: data.date,
            company_product_code: data.itemCode,
            mall_product_name: data.itemName,
            option_name: data.option1,
            option_name2: data.option2,
            option_name3: data.option3,
            order_qty: data.qty,
            mall_sale_price: data.price,
            mall_payment_amount: data.paymentPrice,
            settlement_amount: data.expectedPrice,
            orderer_name: data.orderName,
            orderer_phone: data.orderPhone,
            recipient_name: data.recipientName,
            recipient_phone: data.recipientPhone,
            recipient_zipcode: data.zipcode,
            recipient_address: data.address,
            mall_order_no: data.orderNo,
            notes: data.memo,
            sellic_product_code: data.sellicCode,
            sellic_option_code: data.sellicOption,
            status: data.status,
        };
        return await client.post('/requests.php?action=add_item', payload);
    },

    // 엑셀 일괄 업로드
    uploadSeeding: async (formData) => {
        return await client.post('/requests.php?action=upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // 아이템 수정
    updateSeeding: async (id, data) => {
        const payload = {
            order_date: data.date,
            company_product_code: data.itemCode,
            mall_product_name: data.itemName,
            option_name: data.option1,
            option_name2: data.option2,
            option_name3: data.option3,
            order_qty: data.qty,
            mall_sale_price: data.price,
            mall_payment_amount: data.paymentPrice,
            settlement_amount: data.expectedPrice,
            orderer_name: data.orderName,
            orderer_phone: data.orderPhone,
            recipient_name: data.recipientName,
            recipient_phone: data.recipientPhone,
            recipient_zipcode: data.zipcode,
            recipient_address: data.address,
            mall_order_no: data.orderNo,
            notes: data.memo,
            sellic_product_code: data.sellicCode,
            sellic_option_code: data.sellicOption,
        };
        return await client.put(`/requests.php?action=update_item&item_id=${id}`, payload);
    },

    // 아이템 상태 변경
    updateSeedingStatus: async (id, status) => {
        return await client.put(`/requests.php?action=update_item_status&item_id=${id}`, { status });
    },

    // 아이템 삭제
    deleteSeeding: async (id) => {
        return await client.post(`/requests.php?action=delete_item&item_id=${id}`);
    }
};

export const exportService = {
    searchExport: async (filters = {}) => {
        return await client.get('/export.php?action=search', { params: filters });
    },
    downloadExport: async (filters = {}) => {
        return await client.get('/export.php?action=download', { params: filters, responseType: 'blob' });
    }
};
