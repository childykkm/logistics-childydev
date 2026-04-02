import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_USE_MOCK === 'true'
        ? import.meta.env.VITE_MOCK_API_URL
        : import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Interceptors for global error handling and loading if needed
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // Authorization header
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

client.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        // Global error handling
        const message = error.response?.data?.message || '알 수 없는 오류가 발생했습니다.';
        console.error('[API Error]:', message);
        return Promise.reject(error);
    }
);

export default client;
