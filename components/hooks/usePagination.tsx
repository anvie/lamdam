import { __debug } from "@/lib/logger";
import { useCallback, useState } from "react";

type Pagination = {
    hasPrev: boolean
    hasNext: boolean
    totalPage: number
    count: number
    firstId?: string | null
    lastId?: string | null
}

const defaultValue = {
    hasPrev: false,
    hasNext: false,
    totalPage: 0,
    count: 0,
}

type ID = { id: string }
type PagingID = {
    collectionId: string
} & Partial<{
    fromId: string
    toId: string
}>

const usePagination = <T extends ID, Q extends PagingID>(
    fetcher: (params: Q) => Promise<{ result: { entries: T[], paging: Pagination } }>,
    defaultParams: Q = {} as Q,
) => {
    const [data, setData] = useState<T[]>([])
    const [pagingData, setPagination] = useState<Pagination>(defaultValue)
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)

    const fetchData = useCallback(async (params: Q, opts?: { blockLoading?: boolean }) => {
        try {
            setIsLoading(!!opts?.blockLoading)
            if (!('fromId' in params || 'toId' in params)) {
                setCurrentPage(1)
            }

            return await fetcher({ ...defaultParams, ...params })
                .then(({ result }) => {
                    setData(result.entries);
                    setPagination(result.paging);

                    return result;
                })
                .catch((err) => {
                    __debug('usePagination: fetchData ~ err:', err)
                    return null
                })
        } catch (error) {
            __debug('usePagination: fetchData ~ error:', error)
        } finally {
            setIsLoading(false)
        }

        return null
    }, [defaultParams, fetcher])

    const prevPage = async () => {
        if (data.length === 0 || !pagingData.firstId) return;

        setCurrentPage((page) => page - 1)
        await fetchData({ toId: pagingData.firstId } as Q, { blockLoading: true })
    }

    const nextPage = async () => {
        const dataLength = data.length
        if (dataLength === 0 || !pagingData.lastId) return;

        setCurrentPage((page) => page + 1)
        await fetchData({ fromId: pagingData.lastId } as Q, { blockLoading: true })
    }

    return {
        ...pagingData,
        isLoading,
        data,
        currentPage: data.length > 0 ? currentPage : 0,
        fetchData,
        prevPage,
        nextPage,
    }
}

export default usePagination;