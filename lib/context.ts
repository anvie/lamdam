"use client";

import { Collection, DataRecord } from "@/types";
import { Dispatch, SetStateAction, createContext } from "react";


export const SelectedRecordContext = createContext<{
    currentRecord: DataRecord | null;
    setCurrentRecord: Dispatch<DataRecord | null> | null;
}>({ currentRecord: null, setCurrentRecord: null });

export const CollectionContext = createContext<{
    currentCollection: Collection | null;
    setCurrentCollection: Dispatch<SetStateAction<Collection | null>> | null;
}>({ currentCollection: null, setCurrentCollection: null });

export const NeedUpdateContext = createContext<{
    needUpdate: boolean;
    setNeedUpdate: Dispatch<SetStateAction<boolean>>;
}>({ needUpdate: false, setNeedUpdate: () => { } });

export interface GlobalState {
    currentCollection: Collection | null;
    currentRecord: DataRecord | null;
    newRecord: DataRecord | null;
    deleteRecord: DataRecord | null;
    updatedRecord: DataRecord | null;
    addNewRecord: boolean;
    showExplorer: boolean;
}

export const GlobalContext = createContext<{
    globalState: GlobalState;
    setGlobalState: Dispatch<SetStateAction<GlobalState>>;
}>({
    globalState: {
        currentCollection: null,
        currentRecord: null,
        newRecord: null,
        deleteRecord: null,
        updatedRecord: null,
        addNewRecord: false,
        showExplorer: false,
    },
    setGlobalState: () => { },
});

export interface QAPair {
    a: string;
    b: string;
}

export const SelectedHistoryContext = createContext<{
    newHistory: QAPair[],
    setNewHistory: Dispatch<SetStateAction<QAPair[]>>
}>({
    newHistory: [],
    setNewHistory: () => { }
})