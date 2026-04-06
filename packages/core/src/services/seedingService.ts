import client from '@core/api/client';
import { STATUS_MAP_TO_ENG } from '@core/constants/status';
import { Seeding } from '../types/seeding';
import { AxiosResponse } from 'axios';

export const seedingService = {
    // 시딩 목록 조회 (페이징 지원)
    getSeedings: async (filters = {}): Promise<any> => {
        const res = await client.get('/requests.php?action=list', { params: filters });
        return res.data || res;
    },

    // 시딩 요청 상세 조회
    getSeedingDetail: async (id: string | number) => {
        const res = await client.get(`/requests.php?action=detail&id=${id}`);
        return res.data || res;
    },

    // 단건 등록
    createSeeding: async (data: any) => {
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

    // 엑셀 일괄 업로드 (JSON 배열 전송)
    uploadSeeding: async (payload: any[]) => {
        return await client.post('/requests.php?action=add_items', payload);
    },

    // 아이템 수정
    updateSeeding: async (id: string | number, data: any) => {
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
        return await client.put(`/requests.php?action=update_item&item_id=${id}`, { item_id: Number(id), ...payload });
    },

    // 요청 상태 변경 (request 단위)
    updateSeedingStatus: async (id: number | undefined, status: string, notes?: string) => {
        return await client.put(`/requests.php?id=${id}`, {
            status: STATUS_MAP_TO_ENG[status] ?? status,
            ...(notes !== undefined ? { notes } : {})
        });
    },

    // 시딩 요청건 삭제
    deleteSeeding: async (id: string | number) => {
        return await client.delete(`/requests.php?id=${id}`);
    },

    // 상태 변경 이력 조회
    getStatusLogs: async (targetId: string | number) => {
        return await client.get(`/requests.php?action=status_logs&target_type=request&target_id=${targetId}`);
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

