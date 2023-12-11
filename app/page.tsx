"use client";

import CollectionOps from "@/components/CollectionOps";
import PromptEditor from "@/components/PromptEditor";
import RecordOps from "@/components/RecordOps";
import RecordsExplorer from "@/components/RecordsExplorer";
import { Collection, DataRecord } from "@/types";
import { Notify } from "notiflix";
import { Dispatch, useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import {
  CollectionContext,
  GlobalContext,
  GlobalState,
  NeedUpdateContext,
  SelectedRecordContext,
} from "@/lib/context";
import { __error } from "@/lib/logger";
import { cn, useDisclosure } from "@nextui-org/react";

export default function Home() {
  const [currentRecord, setCurrentRecord] = useState<DataRecord | null>(null);
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(
    null
  );
  const [needUpdate, setNeedUpdate] = useState<boolean>(false);
  const [showExplorer, setShowExplorer] = useState<boolean>(false);
  const needUpdateState = { needUpdate, setNeedUpdate };
  const [globalState, setGlobalState] = useState<GlobalState>({
    currentCollection: null,
    currentRecord: null,
    newRecord: null,
    deleteRecord: null,
    updatedRecord: null,
    addNewRecord: false,
    showExplorer: false,
    useEmbedding: false,
  });

  const llmResponseViewDisclosure = useDisclosure();
  const gptResponseViewDisclosure = useDisclosure();

  useEffect(() => {
    Notify.init({ position: "center-top" });
  }, []);

  useEffect(() => {
    if (globalState.showExplorer) {
      setShowExplorer(!showExplorer);
      setTimeout(() => {
        setGlobalState({ ...globalState, showExplorer: false });
      }, 1000);
    }
  }, [globalState.showExplorer]);

  useEffect(() => {
    if (currentRecord) {
      if (currentRecord) {
        if (showExplorer) {
          setShowExplorer(false);
        }
      }
    }
  }, [currentRecord]);

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
    <section className="flex flex-col h-full">
      <GlobalContext.Provider value={{ globalState, setGlobalState }}>
        <NeedUpdateContext.Provider value={needUpdateState}>
          <SelectedRecordContext.Provider
            value={{
              currentRecord,
              setCurrentRecord: currentRecordSetter,
            }}
          >
            <CollectionContext.Provider
              value={{ currentCollection, setCurrentCollection }}
            >
              <CollectionOps />

              <div className="grid grid-cols-5 relative divide-x-1 divide-divider h-full">
                <div className="col-span-5 md:col-span-4 h-full">
                  <div className="grid grid-cols-3 divide-x-1 divide-divider h-full">
                    <RecordsExplorer
                      className={cn(
                        "w-full md:block bg-background md:bg-transparent absolute md:relative z-10 top-[4em] md:top-0",
                        showExplorer ? "" : "hidden",
                        {
                          "min-h-[calc(100vh-300px)] max-h-[calc(100vh-100px)]": siteConfig.approvalMode,
                          "min-h-[calc(100vh-138px)] max-h-[calc(100vh-138px)]": !siteConfig.approvalMode,
                        }
                      )}
                    />
                    <div className="col-span-2">
                      <PromptEditor
                        llmResponseViewDisclosure={llmResponseViewDisclosure}
                        gptResponseViewDisclosure={gptResponseViewDisclosure}
                      />
                    </div>
                  </div>
                </div>

                <RecordOps
                  className="hidden md:block"
                  llmResponseViewDisclosure={llmResponseViewDisclosure}
                  gptResponseViewDisclosure={gptResponseViewDisclosure}
                />
              </div>
            </CollectionContext.Provider>
          </SelectedRecordContext.Provider>
        </NeedUpdateContext.Provider>
      </GlobalContext.Provider>
    </section>
  );
}
