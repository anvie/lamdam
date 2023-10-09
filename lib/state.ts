import { useEffect, useState } from 'react'

export const useLocalStorage = <T>(key: string, initialValue: T) => {
    const state = useState<T>(() => {
        try {
            const item = localStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
        } catch {
            return initialValue
        }
    })


    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state[0]))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state[0], key])

    return state
}


export const getLocalStorage = <Props>(key: string, initialValue: Props): Props => {
    try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : initialValue
    } catch {
        return initialValue
    }
}