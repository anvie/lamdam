"use client";

import { Dispatch, SetStateAction, createContext } from "react";
import { DataRecord, Collection } from "@/types";

export const SelectedRecordContext = createContext<{
    currentRecord: DataRecord | null;
    setCurrentRecord: Dispatch<SetStateAction<DataRecord | null>> | null;
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
}

export const GlobalContext = createContext<{
    globalState: GlobalState;
    setGlobalState: Dispatch<SetStateAction<GlobalState>>;
}>({
    globalState: {
        currentCollection: null,
        currentRecord: null,
        newRecord: null,
        deleteRecord: null
    },
    setGlobalState: () => { },
});
