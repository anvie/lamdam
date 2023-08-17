"use client";

import { Input } from "@nextui-org/input";
import { FC, useContext, useEffect, useState } from "react";
import { MailFilledIcon } from "./icon/MailFilledIcon";
import { SearchIcon } from "./icon/SearchIcon";
import { DataRecord } from "@/types";
import { truncate } from "@/lib/stringutil";
import {
  CollectionContext,
  GlobalContext,
  SelectedRecordContext,
} from "@/app/page";
import { get } from "@/lib/FetchWrapper";

const RecordsExplorer: FC = () => {
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);

  let { globalState, setGlobalState } = useContext(GlobalContext);
  const [data, setData] = useState<DataRecord[]>([]);

  useEffect(() => {
    if (!currentCollection) {
      return;
    }
    get(`/api/records?collectionId=${currentCollection?.id || "0"}`).then(
      (data) => setData(data.result)
    );
  }, [currentCollection]);

  useEffect(() => {
    if (!globalState) {
      return;
    }
    if (globalState.newRecord) {
      setData([globalState.newRecord].concat(data));
      setGlobalState({ ...globalState, newRecord: null });
    }
  }, [globalState]);

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
      setRec({...data, dirty: true});
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
      className={`border-b-1 pb-1 cursor-pointer hover:bg-slate-50 border-l-8 pl-2 ${
        currentRecord && currentRecord!.id === rec.id
          ? `${rec.dirty ? "border-l-orange-400" : "border-l-green-600 bg-slate-100"}`
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
