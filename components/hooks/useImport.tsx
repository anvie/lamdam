import React, { ReactNode } from 'react';

type ImportState<T = any> = {
    data: T[];
    selectedData: T[];
    canImport: boolean;
}

type ImportAction<T = any> = {
    type: 'add' | 'remove' | 'clear' | 'setCanImport' | 'setSelected' | 'clearSelected' | 'clearAll';
    payload: T;
}

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
            return { ...state, data: [], selectedData: [], canImport: false };
        }
        default: {
            throw new Error(`Unhandled action type: ${action.type}`);
        }
    }
}

const ImportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = React.useReducer(importReducer, { data: [], selectedData: [], canImport: false })

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
})

export type ImportConsumerProps<T = any> = {
    dispatch: ReturnType<typeof dispatcher<T>>,
    currentHighlight?: T | null,
    isCurrentHighlightEdited?: boolean,
    canImport: boolean,
    importData: T[],
    selectedData: T[],
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
                    importData: context.state.data as T[]
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
        importData: context.state.data as T[]
    }
}

export default ImportProvider;
