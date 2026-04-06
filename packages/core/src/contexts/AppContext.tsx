import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { seedingService } from '@core/services/seedingService';
import client from '@core/api/client';
import { authService } from '@core/services/authService';
import { brandService, departmentService, permissionService } from '@core/services/brandService';
import { userService } from '@core/services/userService';
import { STATUS_MAP } from '@core/constants/status';
import { Seeding, User, Brand } from '../types/seeding';
import { approveInventory, rejectInventory } from '@core/services/inventoryApprovalService';

export interface AppContextType {
    isLoading: boolean;
    error: string | null;
    clearError: () => void;
    fetchData: (params?: any) => Promise<any>;
    seedings: Seeding[];
    addSeeding: (newSeedingData: any) => Promise<void>;
    updateSeeding: (id: string, updatedData: any) => Promise<void>;
    deleteSeeding: (id: string) => Promise<void>;
    accounts: any[];
    addAccount: (account: any) => Promise<void>;
    updateAccount: (id: number, updatedData: any) => Promise<void>;
    deleteAccount: (id: number) => Promise<void>;
    globalSearch: string;
    setGlobalSearch: (s: string) => void;
    brands: Brand[];
    addBrand: (b: any) => Promise<void>;
    removeBrand: (b: any) => Promise<void>;
    currentUser: User | null;
    setCurrentUser: (u: User | null) => void;
    departments: any[];
    login: (userId: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    register: (userData: any) => Promise<any>;
    editAccountTarget: any;
    openEditAccount: (user: any, onSaved?: any) => void;
    closeEditAccount: () => void;
    onEditAccountSaved: any;
    approveInventory: (params: any) => Promise<void>;
    rejectInventory: (params: any) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    // Global Status
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Data State
    const [seedings, setSeedings] = useState<Seeding[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [globalSearch, setGlobalSearch] = useState<string>('');
    const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
    const [editAccountTarget, setEditAccountTarget] = useState<any>(null);
    const [onEditAccountSaved, setOnEditAccountSaved] = useState<any>(null);

    const openEditAccount = (user, onSaved) => {
        setEditAccountTarget(user);
        setOnEditAccountSaved(() => onSaved ?? null);
    };
    const closeEditAccount = () => {
        setEditAccountTarget(null);
        setOnEditAccountSaved(null);
    };

    // Initial Auth Verification
    useEffect(() => {
        const verifySession = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setIsAuthChecking(false);
                    return;
                }
                const res = await authService.verifyToken();
                const tokenUser = Array.isArray(res) ? null : (res?.user || res?.data || res);
                if (tokenUser && (tokenUser.id || tokenUser.user_id)) {
                    const userId = tokenUser.id ?? tokenUser.user_id;
                    try {
                        const detailRes = await userService.getUserDetail(userId);
                        const fresh = (detailRes as any)?.data || (detailRes as any)?.user || detailRes;
                        setCurrentUser({ ...fresh, id: fresh.id ?? fresh.user_id });
                    } catch {
                        setCurrentUser({ ...tokenUser, id: userId });
                    }
                }
            } catch (err) {
                console.warn('Authentication verification failed.', err);
            } finally {
                setIsAuthChecking(false);
            }
        };
        verifySession();
    }, []);

    // Load App Data when currentUser is verified
    const fetchData = useCallback(async (params: any = {}) => {
        if (!currentUser) return;

        try {
            setIsLoading(true);
            setError(null);

            // 1. Fetch Brands & Departments
            let brandRes;
            const isNotAdmin = currentUser.role !== 'admin';
            
            // 일반 사용자일 경우 자신의 브랜드 목록만, 어드민이면 전체 브랜드 조회
            // permissionService.getMyBrands() 로 권한있는 브랜드만 가져오게 백엔드 API 명세 반영
            // 백엔드 오류(권한, 테이블 부재)를 대비하여 catch 구문 추가
            const brandPromise = isNotAdmin 
                ? permissionService.getMyBrands().catch(() => brandService.getBrands().catch(() => []))
                : brandService.getBrands().catch(() => []);
            
            const deptPromise = departmentService.getDepartments().catch(() => []);

            const [fetchedBrands, deptRes] = await Promise.all([brandPromise, deptPromise]);
            
            brandRes = fetchedBrands;
            
            let brandList = Array.isArray(brandRes) ? brandRes : (brandRes?.data || []);
            const deptList = Array.isArray(deptRes) ? deptRes : (deptRes?.data || []);
            
            // 서버 응답이 전체를 주는 구조의 Fallback. (my_brands가 혹시 실패했을 때 대비 프론트 필터링)
            if (isNotAdmin) {
                const userBrands = Array.isArray(currentUser.brands) ? currentUser.brands : [];
                if (userBrands.length > 0 && !userBrands.includes('전체') && brandList.length > userBrands.length) {
                    brandList = brandList.filter(b => {
                        const bName = typeof b === 'object' ? (b.name || b.brand_name) : b;
                        return userBrands.includes(bName);
                    });
                }
            }
            
            setBrands(brandList);
            setDepartments(deptList);

            // SeedingList 등에서 per_page를 명시적으로 넘기면 그것을 우선 사용하고,
            // per_page가 없는 경우(InventoryCheck 등)에만 500으로 설정합니다.
            const apiParams = {
                ...params,
                per_page: params?.per_page ?? 500,
            };
            const seedingRes: any = await seedingService.getSeedings(apiParams).catch(() => ({}));
            const rawList = Array.isArray(seedingRes) ? seedingRes : (seedingRes?.data || []);
            
            // pagination 정보 파싱 — 서버마다 필드명이 다를 수 있어 후보를 넓게 탐색
            const pagination = seedingRes?.pagination || {};
            const perPage = apiParams.per_page;

            // 전체 건수: 서버가 주는 다양한 필드 후보를 순서대로 탐색
            const serverTotal =
                pagination.total ??
                pagination.count ??
                pagination.total_count ??
                pagination.totalCount ??
                seedingRes?.total ??
                seedingRes?.count ??
                seedingRes?.total_count ??
                rawList.length; // 최후 폴백

            // 전체 페이지 수
            const serverTotalPages =
                pagination.total_pages ??
                pagination.totalPages ??
                pagination.page_count ??
                seedingRes?.total_pages ??
                seedingRes?.totalPages ??
                Math.ceil(serverTotal / perPage);

            const currentPage = params?.page ?? pagination.page ?? pagination.current_page ?? 1;

            // rawList가 꽉 찼으면(full page) 다음 페이지가 있다고 항상 간주
            const fullPageReturned = rawList.length >= perPage;
            const serverHasNext =
                pagination.has_next ??
                pagination.hasNext ??
                seedingRes?.has_next ??
                ((currentPage < serverTotalPages) || fullPageReturned);

            // 서버 영문 status → 한글 변환
            const toKorStatus = (s) => STATUS_MAP[s] ?? s;

            const loadedSeedings: Seeding[] = [];
            rawList.forEach((req: any) => {
                // item이 배열 또는 단일 객체로 내려올 수 있음
                const rawItem = req.item;
                const itemList = Array.isArray(rawItem) ? rawItem : (rawItem ? [rawItem] : []);

                if (itemList.length === 0) {
                    loadedSeedings.push({
                        id: req.request_no,
                        _dbId: req.id,
                        brand: req.brand_name ?? '',
                        brand_id: req.brand_id,
                        date: req.created_at?.slice(0, 10) ?? '',
                        orderName: req.requester_name ?? '',
                        memo: req.notes ?? '',
                        status: toKorStatus(req.status),
                        hasStockIssue: false,
                        itemCode: '', itemName: '', option1: '', option2: '', option3: '',
                        qty: '', price: '', paymentPrice: '', expectedPrice: '',
                        orderPhone: '', recipientName: '', recipientPhone: '',
                        zipcode: '', address: '', orderNo: '', sellicCode: '', sellicOption: '',
                    });
                } else {
                    itemList.forEach((item: any) => {
                        loadedSeedings.push({
                            id: req.request_no,
                            _itemId: item.id,
                            _dbId: req.id,
                            brand: req.brand_name ?? '',
                            brand_id: req.brand_id,
                            status: toKorStatus(item.status ?? req.status),
                            hasStockIssue: item.has_stock_issue ?? (item.status === 'reviewing'),
                            date: item.order_date ?? req.created_at?.slice(0, 10) ?? '',
                            itemCode: item.company_product_code ?? '',
                            itemName: item.mall_product_name ?? item.company_product_code ?? '',
                            option1: item.option_name ?? '',
                            option2: item.option_name2 ?? '',
                            option3: item.option_name3 ?? '',
                            qty: item.order_qty ?? '',
                            price: item.mall_sale_price ?? '',
                            paymentPrice: item.mall_payment_amount ?? '',
                            expectedPrice: item.settlement_amount ?? '',
                            orderName: item.orderer_name ?? req.requester_name ?? '',
                            orderPhone: item.orderer_phone ?? '',
                            recipientName: item.recipient_name ?? '',
                            recipientPhone: item.recipient_phone ?? '',
                            zipcode: item.recipient_zipcode ?? '',
                            address: item.recipient_address ?? '',
                            orderNo: item.mall_order_no ?? '',
                            memo: item.notes ?? req.notes ?? '',
                            sellicCode: item.sellic_product_code ?? '',
                            sellicOption: item.sellic_option_code ?? '',
                        });
                    });
                }
            });
            setSeedings(loadedSeedings.sort((a, b) => (b._dbId ?? 0) - (a._dbId ?? 0)));

            // 3. Fetch Accounts (if Admin)
            try {
                if (currentUser.role === 'admin') {
                    const userList: any = await userService.getUsers();
                    const list = Array.isArray(userList) ? userList : (userList?.data || []);
                    
                    // 각 사용자의 브랜드 권한 병렬 조회 (AdminSettings의 로직을 전역으로 이동)
                    const listWithBrands = await Promise.all(
                        list.map(async (user) => {
                            try {
                                const pRes = await permissionService.getUserPermissions(user.id);
                                const perms = Array.isArray(pRes) ? pRes : (pRes?.data || []);
                                const allowedBrands = perms
                                    .filter(b => b.has_permission === 1 || b.has_permission === true)
                                    .map(b => ({ id: b.id, name: b.name }));
                                return { ...user, brands: allowedBrands };
                            } catch {
                                return { ...user, brands: [] };
                            }
                        })
                    );
                    setAccounts(listWithBrands);
                }
            } catch (e) {
                console.warn('사용자 목록을 불러올 수 없습니다.', e);
            }

            return { total: serverTotal, hasNext: serverHasNext, totalPages: serverTotalPages };

        } catch (err) {
            setError('데이터를 불러오는 중 오류가 발생했습니다.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // LocalStorage Setup for UI defaults
    useEffect(() => {

    }, []);

    // Seeding Functions (API points ready)
    const addSeeding = async (newSeedingData) => {
        try {
            const entries = Array.isArray(newSeedingData) ? newSeedingData : [newSeedingData];
            const matchedBrand = brands.find(b => {
                const bName = typeof b === 'object' ? (b.name || b.brand_name) : b;
                return bName === entries[0]?.brand;
            });
            const brand_id = matchedBrand?.id || matchedBrand?.brand_id;

            await Promise.all(entries.map(entry =>
                seedingService.createSeeding({ ...entry, brand_id })
            ));

            // 등록 후 서버에서 다시 fetch해서 정확한 데이터로 갱신
            await fetchData();
        } catch (err) {
            setError('시딩 등록 실패');
            throw err;
        }
    };

    const updateSeeding = async (id, updatedData) => {
        try {
            const keys = Object.keys(updatedData);
            const itemId = updatedData._itemId ?? seedings.find(s => s.id === id)?._itemId;
            const dbId = updatedData._dbId ?? seedings.find(s => s.id === id)?._dbId;
            // 상태값이나 메모(반려사유)만 업데이트하는 부분 업데이트의 경우 전용 API 호출
            const isPartialUpdate = keys.every(k => ['status', 'notes', '_itemId', '_dbId'].includes(k));
            if (isPartialUpdate && (updatedData.status !== undefined || updatedData.notes !== undefined)) {
                await seedingService.updateSeedingStatus(dbId, updatedData.status, updatedData.notes);
            } else {
                await seedingService.updateSeeding(itemId ?? id, updatedData);
            }
            await fetchData();
        } catch (err) {
            setError('시딩 수정 실패');
            throw err;
        }
    };

    const deleteSeeding = async (id) => {
        try {
            await seedingService.deleteSeeding(id);
            await fetchData();
        } catch (err) {
            setError('시딩 삭제 실패');
        }
    };

    // Account & Settings Functions
    const addAccount = async (account) => {
        try {
            await userService.createUser(account);
            const userList = await userService.getUsers();
            setAccounts(userList || []);
        } catch (err) {
            setError('계정 생성 실패');
        }
    };
    const updateAccount = async (id, updatedData) => {
        try {
            await userService.updateUser(id, updatedData);
            const userList = await userService.getUsers();
            setAccounts(userList || []);
            if (currentUser.id === id) setCurrentUser(prev => ({ ...prev, ...updatedData }));
        } catch (err) {
            setError('계정 수정 실패');
        }
    };
    const deleteAccount = async (id) => {
        try {
            setAccounts(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError('계정 삭제 실패');
        }
    };

    const addBrand = async (b) => {
        try {
            await brandService.createBrand(typeof b === 'string' ? { name: b } : b);
            const res = await brandService.getBrands();
            setBrands(Array.isArray(res) ? res : (res?.data || []));
        } catch (err) {
            setError('브랜드 생성 실패');
        }
    };
    const removeBrand = async (b) => {
        try {
            const bId = typeof b === 'object' ? b.id : brands.find(br => (br.name || br.brand_name) === b)?.id;
            if (bId) await brandService.deleteBrand(bId);
            const res = await brandService.getBrands();
            setBrands(Array.isArray(res) ? res : (res?.data || []));
        } catch (err) {
            setError('브랜드 삭제 실패');
        }
    };


    // Auth Integration
    const login = async (userId, password) => {
        setIsLoading(true);
        try {
            const result = await authService.login(userId, password);
            if (result.success || result.userId || result.token) { // fallback handle generic API responses
                if (result.token) localStorage.setItem('token', result.token);
                
                let userObj = result.user || result.data;
                
                // 유저 정보가 응답에 없고 토큰만 왔다면, 곧바로 verifyToken으로 사용자 정보 가져오기
                if (!userObj && result.token) {
                    try {
                        const verifyRes = await authService.verifyToken();
                        userObj = Array.isArray(verifyRes) ? null : (verifyRes?.user || verifyRes?.data || verifyRes);
                    } catch (e) {
                        console.error('로그인 직후 사용자 정보 가져오기 실패', e);
                    }
                }
                
                userObj = userObj || result; // 최후의 fallback
                
                setCurrentUser(userObj);
                return { success: true };
            }
            return { success: false, message: result.message };
        } catch (err) {
            setError('로그인 중 오류가 발생했습니다.');
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (userData) => {
        setIsLoading(true);
        try {
            const result = await authService.register(userData);
            return result;
        } catch (err) {
            setError('회원가입 중 오류가 발생했습니다.');
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('token');
    };

    const value = React.useMemo(() => ({
        isLoading, error, clearError, fetchData,
        seedings, addSeeding, updateSeeding, deleteSeeding,
        accounts, addAccount, updateAccount, deleteAccount,
        globalSearch, setGlobalSearch,
        brands, addBrand, removeBrand,
        currentUser, setCurrentUser,
        departments, login, logout, register,
        editAccountTarget, openEditAccount, closeEditAccount, onEditAccountSaved,
        approveInventory, rejectInventory,
    }), [
        isLoading, error, fetchData, seedings, accounts, 
        globalSearch, brands, currentUser, departments, 
        editAccountTarget, onEditAccountSaved,
        approveInventory, rejectInventory
    ]);

    if (isAuthChecking) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>인증 정보를 확인 중입니다...</div>;
    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// 컨텍스트를 편리하게 사용하기 위한 커스텀 훅
export const useAppContext = () => {
    const context = React.useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
