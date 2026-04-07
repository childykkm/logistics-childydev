/// <reference types="vite/client" />
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Axios의 응답 타입을 실제 데이터 타입으로만 인식하도록 커스텀 인터페이스 정의
interface CustomAxiosInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete' | 'patch'> {
    get<T = any>(url: string, config?: any): Promise<T>;
    post<T = any>(url: string, data?: any, config?: any): Promise<T>;
    put<T = any>(url: string, data?: any, config?: any): Promise<T>;
    delete<T = any>(url: string, config?: any): Promise<T>;
    patch<T = any>(url: string, data?: any, config?: any): Promise<T>;
}

const client = axios.create({
    baseURL: import.meta.env.VITE_USE_MOCK === 'true'
        ? import.meta.env.VITE_MOCK_API_URL
        : import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
}) as CustomAxiosInstance;

// Interceptors for global error handling and loading if needed
client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`; // Authorization header
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

client.interceptors.response.use(
    (response: AxiosResponse) => {
        return response.data;
    },
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || '알 수 없는 오류가 발생했습니다.';
        console.error('[API Error]:', message);
        if (status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default client;
