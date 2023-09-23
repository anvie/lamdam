"use client";

import { get } from "@/lib/FetchWrapper";
import {
  CollectionContext,
  GlobalContext,
  SelectedRecordContext,
} from "@/lib/context";
import { __debug } from "@/lib/logger";
import { truncate } from "@/lib/stringutil";
import { DataRecord } from "@/types";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import moment from "moment";
import { FC, useContext, useEffect, useState } from "react";
import { SearchIcon } from "./icon/SearchIcon";

const RecordsExplorer: FC = () => {
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);

  let { globalState, setGlobalState } = useContext(GlobalContext);
  // let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  const [data, setData] = useState<DataRecord[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [lastId, setLastId] = useState<string[]>([]);

  useEffect(() => {
    if (!currentCollection) {
      return;
    }
    void refreshData(currentCollection?.id || "0", undefined, true);
  }, [currentCollection]);

  useEffect(() => {
    __debug("in RecordsExplorer globalState effect");
    if (!globalState) {
      return;
    }
    if (globalState.newRecord) {
      __debug(
        "globalState.newRecord changed. New record:",
        globalState.newRecord
      );
      const newData = [globalState.newRecord].concat(data);
      __debug("newData:", newData);
      setLastId([]);
      setData(newData);
      setGlobalState({ ...globalState, newRecord: null });
    }
    if (globalState.deleteRecord) {
      __debug("globalState.deleteRecord changed.");
      setLastId([]);
      void refreshData(currentCollection?.id || "0", query, true);
      setGlobalState({ ...globalState, deleteRecord: null });
    }
    if (globalState.updatedRecord) {
      __debug("globalState.updatedRecord changed.");
      const newData = data.map((d) => {
        if (d.id === globalState.updatedRecord?.id) {
          return globalState.updatedRecord;
        }
        return d;
      });
      setLastId([]);
      setData(newData);
      setGlobalState({ ...globalState, updatedRecord: null });
    }
  }, [globalState]);

  // useEffect(() => {
  //   if (!currentRecord){
  //     return;
  //   }
  //   const records = data.map((rec)=> {
  //     if (!currentRecord){
  //       return rec;
  //     }
  //     if (rec.id === currentRecord.id){
  //       return currentRecord;
  //     }else{
  //       return rec;
  //     }
  //   });
  //   setData(records);
  // }, [currentRecord]);

  useEffect(() => {
    __debug("data changed:", data);
    if (!loaded) {
      setLoaded(true);
    }
  }, [data]);

  const doSearch = () => {
    if (!currentCollection) {
      return;
    }
    let uri = `/api/records?collectionId=${currentCollection?.id}`;
    if (query) {
      uri = `/api/records?collectionId=${currentCollection?.id}&q=${query}`;
    }
    void get(uri)
      .then((data) => {
        setData(data.result);
      })
      .catch((err) => {
        __debug("error", err);
      });
  };

  const refreshData = async (id: string, query?: string | undefined, noLastId: boolean = false) => {
    if (!id) {
      return;
    }
    // __debug("refreshing data for collectionId:", id);
    let uri = `/api/records?collectionId=${currentCollection?.id}`;
    if (query) {
      uri = `/api/records?collectionId=${currentCollection?.id}&q=${query}`;
    }
    if (lastId.length > 0 && !noLastId) {
      if (lastId[1] !== "") {
        uri = `${uri}&toId=${lastId[1]}`;
      }
      if (lastId[0] !== "") {
        uri = `${uri}&fromId=${lastId[0]}`;
      }
    }
    return await get(
      // `/api/records?collectionId=${id}${query ? `&q=${query}` : ""}`
      uri
    ).then((data) => {
      setData(data.result);
      if (data.result.length > 0) {
        setLastId([data.result[0].id, data.result[data.result.length - 1].id]);
      } else {
        // setLastId([lastId.shift() as string, lastId[0]]);
      }
    });
  };

  const onPrevPage = () => {
    if (!currentCollection) {
      return;
    }
    let uri = `/api/records?collectionId=${currentCollection?.id}`;
    if (query) {
      uri = `/api/records?collectionId=${currentCollection?.id}&q=${query}`;
    }
    if (lastId.length > 0) {
      uri = `${uri}&toId=${lastId[1]}`;
    }
    void get(uri)
      .then((data) => {
        setData(data.result);
        if (data.result.length > 0) {
          setLastId([data.result[0].id, data.result[data.result.length - 1].id]);
        } else {
          // setLastId([lastId.shift() as string, lastId[0]]);
        }
      })
      .catch((err) => {
        __debug("error", err);
      });
  }

  const onNextPage = () => {
    if (!currentCollection) {
      return;
    }
    let uri = `/api/records?collectionId=${currentCollection?.id}`;
    if (query) {
      uri = `/api/records?collectionId=${currentCollection?.id}&q=${query}`;
    }
    if (lastId.length > 0) {
      uri = `${uri}&fromId=${lastId[0]}`;
    }
    void get(uri)
      .then((data) => {
        setData(data.result);
        if (data.result.length > 0) {
          setLastId([data.result[0].id, data.result[data.result.length - 1].id]);
        } else {
          setLastId([lastId[1], ""]);
        }
      })
      .catch((err) => {
        __debug("error", err);
      });
  }


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

      <div className="h-[600px] overflow-scroll">
        {data &&
          data.map((data, index) => {
            return (
              <DataRecordRow
                key={`data-record-${data.id}`}
                collectionId={currentCollection?.id || "0"}
                data={data}
              />
            );
          })}
      </div>

      {loaded && <Navigator onPrev={onPrevPage} onNext={onNextPage} />}
    </div>
  );
};

const Navigator: FC<{ onPrev: () => void, onNext: () => void }> = ({ onPrev, onNext }) => {
  return (
    <div className="flex justify-between p-2">
      <Button onClick={onPrev}>Previous</Button>
      <Button onClick={onNext}>Next</Button>
    </div>
  );
};

export default RecordsExplorer;

const DataRecordRow: FC<{ data: DataRecord; collectionId: string }> = ({
  data,
  collectionId,
}) => {
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  const [rec, setRec] = useState<DataRecord | null>(null);

  useEffect(() => {
    if (!currentRecord) {
      setRec(data);
      return;
    }
    if (data.id === currentRecord.id && currentRecord.dirty) {
      setRec({ ...data, dirty: true });
      return;
    }
    if (data.id === currentRecord.id) {
      setRec(currentRecord as DataRecord);
    } else {
      setRec(data);
    }
  }, [currentRecord]);

  useEffect(() => {
    __debug("data changed:", data);
    setRec(JSON.parse(JSON.stringify(data)));
  }, [data]);

  const onClick = () => {
    __debug("rec:", rec);
    setCurrentRecord && setCurrentRecord(rec);

    // uncomment this lines if you want to re-fetch the data from the server
    // get(`/api/getRecord?id=${data.id}&collectionId=${collectionId}`)
    //   .then((data: any) => {
    //     setCurrentRecord && setCurrentRecord(data.result);
    //   })
    //   .catch((error: any) => {
    //     __error("error when refreshing single record data from server:", error);
    //   });
  };

  return rec ? (
    <div
      className={`border-b-1 pb-1 cursor-pointer hover:bg-slate-50 dark:hover:dark:text-black border-l-8 pl-2 ${currentRecord && currentRecord!.id === rec.id
        ? `${rec.dirty
          ? "border-l-orange-400"
          : "border-l-green-600 bg-slate-100 dark:text-black"
        }`
        : "border-gray-100 "
        }`}
      onClick={onClick}
    >
      <div>{truncate(rec.prompt, 100)}</div>
      <div className="text-sm">{truncate(rec.response, 100)}</div>
      <div className="text-xs inline-flex space-x-2 items-center opacity-80">
        <span>{moment(rec.createdAt).format("YYYY/MM/DD")}</span>
        <span>-</span>
        <span>{rec.creator ?? '?'}</span>
      </div>
    </div>
  ) : (
    <></>
  );
};
