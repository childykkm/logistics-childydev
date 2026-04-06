import { productService } from './productService';

interface SearchParams {
    keyword: string;
    searchType: string;
    mall_id?: string;
}

interface FlatProduct {
    _variantCode?: string;
    code: string;
    name: string;
    option1: string;
    option2: string;
    stock: number;
    price: number;
    [key: string]: any;
}

/**
 * 브랜드명으로부터 mall_id를 추출합니다.
 */
export function getMallIdFromBrand(selectedBrand: string, brands: any[]): string | undefined {
    if (!selectedBrand || !brands) return undefined;
    const brandObj = brands.find(b => {
        const bName = typeof b === 'object' ? (b.name || b.brand_name) : b;
        return bName === selectedBrand;
    });
    return brandObj ? (brandObj.mall_id || brandObj.cafe24_mall_id) : undefined;
}

/**
 * Cafe24 상품 목록을 검색하고, variant 단위로 flatten하여 반환합니다.
 */
export async function searchProducts({ keyword, searchType, mall_id }: SearchParams): Promise<FlatProduct[]> {
    const result: any = await productService.getProducts({
        keyword: keyword.trim(),
        mall_id,
        search_type: searchType,
    });

    let list: any[] = [];
    if (Array.isArray(result)) {
        list = result;
    } else if (result) {
        list = result.data?.products || result.products || result.items || (Array.isArray(result.data) ? result.data : []);
    }

    const flatList: FlatProduct[] = [];
    list.forEach(product => {
        const code = product.custom_product_code || product.product_code || '';
        const name = product.product_name || '';
        const price = Math.floor(Number(product.price || 0));
        const variants = Array.isArray(product.variants) ? product.variants : [];

        if (variants.length === 0) {
            flatList.push({ ...product, code, name, option1: '', option2: '', stock: 0, price });
        } else {
            variants.forEach(v => {
                const opts = Array.isArray(v.options) ? v.options : [];
                const sizeOpt = opts.find(o => o.name?.toUpperCase() === 'SIZE');
                const otherOpts = opts.filter(o => o.name?.toUpperCase() !== 'SIZE');
                const colorFromCode = code.includes('_') ? code.split('_').slice(1).join('_') : '';
                
                flatList.push({
                    ...product,
                    _variantCode: v.variant_code,
                    code,
                    name,
                    option1: otherOpts[0]?.value || colorFromCode || '',
                    option2: sizeOpt?.value || '',
                    stock: Number(v.quantity ?? 0),
                    price,
                });
            });
        }
    });

    return flatList;
}
