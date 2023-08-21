"use client";

import { Input } from "@nextui-org/input";
import { FC, useContext, useEffect, useState } from "react";
import { SearchIcon } from "./icon/SearchIcon";
import { DataRecord } from "@/types";
import { truncate } from "@/lib/stringutil";
import {
  CollectionContext,
  GlobalContext,
  SelectedRecordContext,
} from "@/app/page";
import { get } from "@/lib/FetchWrapper";
import { __debug } from "@/lib/logger";

const RecordsExplorer: FC = () => {
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);

  let { globalState, setGlobalState } = useContext(GlobalContext);
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  const [data, setData] = useState<DataRecord[]>([]);
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    if (!currentCollection) {
      return;
    }
    void refreshData(currentCollection?.id || "0");
  }, [currentCollection]);

  useEffect(() => {
    __debug("in RecordsExplorer globalState effect")
    if (!globalState) {
      return;
    }
    if (globalState.newRecord) {
      __debug("globalState.newRecord changed. New record:", globalState.newRecord)
      setData([globalState.newRecord].concat(data));
      setGlobalState({ ...globalState, newRecord: null });
    }
    if (globalState.deleteRecord) {
      void refreshData(currentCollection?.id || "0", query);
    }
  }, [globalState]);

  useEffect(() => {
    if (!currentRecord){
      return;
    }
    const records = data.map((rec)=> {
      if (!currentRecord){
        return rec;
      }
      if (rec.id === currentRecord.id){
        return currentRecord;
      }else{
        return rec;
      }
    });
    setData(records);
  }, [currentRecord]);

  const doSearch = () => {
    if (!currentCollection){
      return;
    }
    let uri = `/api/records?collectionId=${currentCollection?.id}`
    if (query) {
      uri = `/api/records?collectionId=${currentCollection?.id}&q=${query}`
    }
    void get(uri)
      .then((data) => {
        setData(data.result);
      })
      .catch((err) => {
        __debug("error", err);
      });
  };

  const refreshData = async (id: string, query?: string | undefined) => {
    if (!id){
      return;
    }
    return await get(`/api/records?collectionId=${id}${query ? `&q=${query}`: ''}`).then((data) => {
      setData(data.result);
    });
  };

  return (
    <div className="border min-h-screen w-full">
      <Input
        className="pb-2 border-b-1 p-2"
        type="email"
        placeholder="search records"
        labelPlacement="outside"
        startContent={
          <SearchIcon className="text-2xl text-default-400 pointer-events-none flex-shrink-0" />
        }
        isClearable
        value={query}
        onClear={() => {
          setQuery("");
          void refreshData(currentCollection?.id || "0");
        }}
        onKeyUp={(e) => {
          // setQuery(e.currentTarget.value);
          // if enter pressed then search
          if (e.key === "Enter") {
            void doSearch();
          }
        }}
        onChange={(e) => {
          setQuery(e.currentTarget.value);
        }}
      />

      {data &&
        data.map((data, index) => {
          return <DataRecordRow key={`data-record-${data.id}`} data={data} />;
        })}
    </div>
  );
};

export default RecordsExplorer;

const DataRecordRow: FC<{ data: DataRecord }> = ({ data }) => {
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  const [rec, setRec] = useState<DataRecord | null>(null);

  useEffect(() => {
    if (!currentRecord) {
      setRec(data);
      return;
    }
    if (currentRecord.dirty) {
      setRec({ ...data, dirty: true });
      return;
    }
    if (data.id === currentRecord.id) {
      setRec(currentRecord as DataRecord);
    } else {
      setRec(data);
    }
  }, [currentRecord]);

  const onClick = () => {
    setCurrentRecord!(data);
  };

  return rec ? (
    <div
      className={`border-b-1 pb-1 cursor-pointer hover:bg-slate-50 dark:hover:dark:text-black border-l-8 pl-2 ${
        currentRecord && currentRecord!.id === rec.id
          ? `${
              rec.dirty
                ? "border-l-orange-400"
                : "border-l-green-600 bg-slate-100 dark:text-black"
            }`
          : "border-gray-100 "
      }`}
      onClick={onClick}
    >
      <div>{truncate(rec.prompt, 100)}</div>
      <div className="text-xs">{truncate(rec.response, 100)}</div>
    </div>
  ) : (
    <></>
  );
};
