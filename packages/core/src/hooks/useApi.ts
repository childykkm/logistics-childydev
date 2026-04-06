import { useState, useCallback } from 'react';

export function useApi<T, Args extends any[]>(apiFunc: (...args: Args) => Promise<T>) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (...args: Args) => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiFunc(...args);
            setData(result);
            return result;
        } catch (err: any) {
            const errorMsg = err.message || '오류가 발생했습니다.';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiFunc]);

    return { data, loading, error, execute };
}
