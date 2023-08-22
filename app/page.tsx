"use client";

import CollectionOps from "@/components/CollectionOps";
import RecordsExplorer from "@/components/RecordsExplorer";
import PromptEditor from "@/components/PromptEditor";
import RecordOps from "@/components/RecordOps";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DataRecord, Collection } from "@/types";
import { Notify } from "notiflix";

import {
  SelectedRecordContext,
  CollectionContext,
  NeedUpdateContext,
  GlobalState,
  GlobalContext,
} from "@/lib/context";
import { __error } from "@/lib/logger";

export default function Home() {
  const [currentRecord, setCurrentRecord] = useState<DataRecord | null>(null);
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(
    null
  );
  const [needUpdate, setNeedUpdate] = useState<boolean>(false);
  const needUpdateState = { needUpdate, setNeedUpdate };
  const [globalState, setGlobalState] = useState<GlobalState>({
    currentCollection: null,
    currentRecord: null,
    newRecord: null,
    deleteRecord: null,
  });

  useEffect(() => {
    Notify.init({ position: "center-top" });
  }, []);

  const currentRecordSetter: Dispatch<DataRecord | null> | null = (value) => {
    if (currentCollection?.meta?.dataType === "rm") {
      const responses = value?.response.split("\n\n----------\n\n");
      if (responses?.length !== 2) {
        __error(
          "Invalid response format. Must be two paragraphs separated by '----------'."
        );
        __error("value?.response:", value?.response);
      } else {
        const mappedValue: DataRecord = {
          ...value,
          outputPositive: responses[0],
          outputNegative: responses[1],
        } as DataRecord;
        return setCurrentRecord(mappedValue);
      }
    }
    return setCurrentRecord(value);
  };

  return (
    <section className="flex flex-col gap-4 md:py-4">
      <GlobalContext.Provider value={{ globalState, setGlobalState }}>
        <NeedUpdateContext.Provider value={needUpdateState}>
          <SelectedRecordContext.Provider
            value={{ currentRecord, setCurrentRecord: currentRecordSetter }}
          >
            <CollectionContext.Provider
              value={{ currentCollection, setCurrentCollection }}
            >
              <CollectionOps />

              <div className="grid grid-cols-4">
                <RecordsExplorer />

                <div className="col-span-2">
                  <PromptEditor />
                </div>

                <RecordOps />
              </div>
            </CollectionContext.Provider>
          </SelectedRecordContext.Provider>
        </NeedUpdateContext.Provider>
      </GlobalContext.Provider>
    </section>
  );
}
