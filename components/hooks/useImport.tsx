import React, { ReactNode } from 'react';

type ImportState<T = any> = {
    data: T[];
    selectedData: T[];
    canImport: boolean;
    filteredData: T[];
    currentFilter?: {
        keyword: string;
        features: Features[];
    }
}

type ImportAction<T = any> = {
    type: 'add' | 'remove' | 'clear' | 'setCanImport' | 'setSelected' | 'clearSelected' | 'clearAll' | 'filterData' | 'clearFilter';
    payload: T;
}

export type Features = 'instruction' | 'input' | 'response'

type Dispatch = (action: ImportAction) => void

const ImportContext = React.createContext<{
    state: ImportState;
    dispatch: Dispatch;
} | undefined>(undefined)

const importReducer = (state: ImportState, action: ImportAction): ImportState => {
    switch (action.type) {
        case 'add': {
            const data = [...state.data];
            data.push(...action.payload);
            return { ...state, data };
        }
        case 'remove': {
            const selectedData = [...state.selectedData].filter(d => d.id !== action.payload);
            return { ...state, selectedData };
        }
        case 'clear': {
            return { ...state, data: [] };
        }
        case 'setCanImport': {
            return { ...state, canImport: action.payload };
        }
        case 'setSelected': {
            const selectedData = [...state.selectedData];
            selectedData.push(action.payload);
            return { ...state, selectedData };
        }
        case 'clearSelected': {
            return { ...state, selectedData: [] };
        }
        case 'clearAll': {
            return { ...state, data: [], selectedData: [], filteredData: [], canImport: false, currentFilter: undefined };
        }
        case 'filterData': {
            let { keyword, features }: { keyword: string; features: Features[] } = action.payload || { keyword: '', features: [] };

            features = features.map(feature => feature.trim() as Features);
            console.log("🚀 ~ file: useImport.tsx:60 ~ importReducer ~ features:", features)
            if (features.length === 0) {
                features = ['instruction', 'input', 'response'];
            }

            keyword = keyword.trim().toLowerCase();

            const data = state.data as Record<Features | string, string>[]
            const filteredData = data.filter(d => features.some(feature => d[feature]?.toLowerCase().includes(keyword)));

            const currentFilter = { keyword, features };

            return { ...state, filteredData, currentFilter };
        }
        case 'clearFilter': {
            return { ...state, filteredData: [], currentFilter: undefined };
        }
        default: {
            throw new Error(`Unhandled action type: ${action.type}`);
        }
    }
}

const ImportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = React.useReducer(importReducer, { data: [], selectedData: [], filteredData: [], canImport: false })

    return (
        <ImportContext.Provider value={{ state, dispatch }}>
            {children}
        </ImportContext.Provider>
    );
};

const dispatcher = <T,>(dispatch: Dispatch) => ({
    addData: (...newData: T[]) => dispatch({ type: 'add', payload: newData }),
    removeData: (index: string) => dispatch({ type: 'remove', payload: index }),
    clearData: () => dispatch({ type: 'clear', payload: null }),
    setCanImport: (canImport: boolean) => dispatch({ type: 'setCanImport', payload: canImport }),
    addSelectedData: (data: T) => dispatch({ type: 'setSelected', payload: data }),
    clearSelectedData: () => dispatch({ type: 'clearSelected', payload: null }),
    clearAll: () => dispatch({ type: 'clearAll', payload: null }),
    filterData: ({ keyword, features }: { keyword?: string; features: Features[] }) => {
        if (keyword) {
            dispatch({ type: 'filterData', payload: { keyword, features } });
        } else {
            dispatch({ type: 'clearFilter', payload: null });
        }
    },
})

export type ImportConsumerProps<T = any> = {
    dispatch: ReturnType<typeof dispatcher<T>>,
    currentHighlight?: T | null,
    isCurrentHighlightEdited?: boolean,
    canImport: boolean,
    importData: T[],
    selectedData: T[],
    filteredData: T[],
    currentFilter?: { keyword: string; features: Features[] }
}

export const ImportConsumer = <T,>({ children }: { children: (context: ImportConsumerProps<T>) => ReactNode }) => {
    return (
        <ImportContext.Consumer>
            {context => {
                if (context === undefined) {
                    throw new Error('ImportConsumer must be used within a ImportProvider')
                }

                return children({
                    dispatch: dispatcher<T>(context.dispatch),
                    selectedData: context.state.selectedData as T[],
                    canImport: context.state.canImport,
                    importData: context.state.data as T[],
                    filteredData: context.state.filteredData as T[],
                    currentFilter: context.state.currentFilter,
                });
            }}
        </ImportContext.Consumer>
    )
}

export const useImport = <T,>() => {
    const context = React.useContext(ImportContext)
    if (context === undefined) {
        throw new Error('useImport must be used within a ImportProvider')
    }

    return {
        dispatch: dispatcher<T>(context.dispatch),
        selectedData: context.state.selectedData as T[],
        canImport: context.state.canImport,
        importData: context.state.data as T[],
        filteredData: context.state.filteredData as T[],
        currentFilter: context.state.currentFilter
    }
}

export default ImportProvider;
