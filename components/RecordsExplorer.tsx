"use client";

import { SearchSetting } from "@/components/SearchSetting";
import { get } from "@/lib/FetchWrapper";
import {
  CollectionContext,
  GlobalContext,
  SelectedRecordContext,
} from "@/lib/context";
import { __debug } from "@/lib/logger";
import { getLocalStorage } from "@/lib/state";
import { truncate } from "@/lib/stringutil";
import { RecordStatuses } from "@/models";
import { DataRecord, Statistic } from "@/types";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Chip, ChipProps, RadioGroup, Tooltip } from "@nextui-org/react";
import moment from "moment";
import React, { FC, useContext, useEffect, useState } from "react";
import { HiArrowLeft, HiArrowRight } from "react-icons/hi2";
import useSWR from "swr";
import CRadio from "./CRadio";
import { SearchIcon } from "./icon/SearchIcon";

type SearchData = {
  id: string;
} & Partial<{
  keyword: string;
  toId: string;
  fromId: string;
  status?: string | string[];
}>;

const revalidateSearch = ({ id, keyword, toId, fromId, status }: SearchData) => {
  let uri = new URL(`/api/records?collectionId=${id}`, window.origin);

  const creators = getLocalStorage<string[]>("search-settings.creator", []);
  const features = getLocalStorage<string[]>("search-settings.features", []);

  if (keyword) {
    uri.searchParams.set("q", keyword);
  }

  for (const creator of creators) {
    uri.searchParams.append("creators", creator);
  }

  for (const feature of features) {
    uri.searchParams.append("features", feature);
  }

  if (status) {
    if (Array.isArray(status)) {
      for (const s of status) {
        uri.searchParams.append("status", s);
      }
    } else {
      uri.searchParams.set("status", status);
    }
  }

  if (toId) uri.searchParams.set("toId", toId);
  if (fromId) uri.searchParams.set("fromId", fromId);

  return uri.toString();
};

const colors: Record<string, ChipProps['color']> = {
  all: 'primary',
  approved: 'success',
  rejected: 'danger',
  pending: 'warning'
}

const RecordsExplorer: FC<{ className: string }> = ({ className }) => {
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);

  let { globalState, setGlobalState } = useContext(GlobalContext);
  const [data, setData] = useState<DataRecord[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [lastId, setLastId] = useState<string[]>([]);

  const { data: stats } = useSWR<{ result: Statistic }>(`/api/records/stats?collectionId=${currentCollection?.id}`, get, {
    refreshInterval: 3000,
  })

  const recordStats = stats?.result;

  useEffect(() => {
    if (!currentCollection) {
      return;
    }
    void refreshData(currentCollection?.id || "0", undefined, undefined, true);
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
      __debug("deleteRecord:", globalState.deleteRecord);
      setLastId([]);
      void refreshData(currentCollection?.id || "0", query, []);
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
      // setLastId([]);
      setData(newData);
      setGlobalState({ ...globalState, updatedRecord: null });
    }
  }, [globalState]);

  useEffect(() => {
    // __debug("data changed:", data);
    if (!loaded) {
      setLoaded(true);
    }
  }, [data]);

  const doSearch = () => {
    if (!currentCollection) {
      return;
    }

    void get(revalidateSearch({ id: currentCollection.id, keyword: query }))
      .then((data) => {
        setData(data.result);
      })
      .catch((err) => {
        __debug("error", err);
      });
  };

  const refreshData = async (
    id: string,
    query?: string | undefined,
    status?: string | string[],
    noLastId: boolean = false,
    useLastId?: string[] | undefined
  ) => {
    if (!id) {
      return;
    }
    // __debug("refreshing data for collectionId:", id);
    let options: SearchData = {
      id: currentCollection!.id,
    };

    if (query) options.keyword = query;
    let _lastId = lastId;
    __debug("_lastId:", _lastId);
    if (useLastId !== undefined) {
      _lastId = useLastId;
    }
    if (_lastId.length > 0) {
      if (_lastId[1] !== "") {
        options.toId = _lastId[1];
      }
      if (_lastId[0] !== "") {
        options.fromId = _lastId[0];
      }
    }

    return await get(
      // `/api/records?collectionId=${id}${query ? `&q=${query}` : ""}`
      revalidateSearch({ ...options, status })
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
    let options: SearchData = {
      id: currentCollection!.id,
    };
    if (query) options.keyword = query;
    if (lastId.length > 0) options.toId = lastId[1];
    void get(revalidateSearch(options))
      .then((data) => {
        setData(data.result);
        if (data.result.length > 0) {
          setLastId([
            data.result[0].id,
            data.result[data.result.length - 1].id,
          ]);
        } else {
          // setLastId([lastId.shift() as string, lastId[0]]);
        }
      })
      .catch((err) => {
        __debug("error", err);
      });
  };

  const onNextPage = () => {
    if (!currentCollection) {
      return;
    }
    let options: SearchData = {
      id: currentCollection!.id,
    };
    if (query) options.keyword = query;
    if (lastId.length > 0) options.fromId = lastId[0];
    void get(revalidateSearch(options))
      .then((data) => {
        setData(data.result);
        if (data.result.length > 0) {
          setLastId([
            data.result[0].id,
            data.result[data.result.length - 1].id,
          ]);
        } else {
          setLastId([lastId[1], ""]);
        }
      })
      .catch((err) => {
        __debug("error", err);
      });
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-3.5 border-b-1 border-divider px-4 py-4">
        <div className="flex gap-2 items-center">
          <Input
            type="email"
            placeholder="Search"
            labelPlacement="outside"
            startContent={
              <SearchIcon className="text-2xl text-default-400 pointer-events-none flex-shrink-0" />
            }
            isClearable
            classNames={{
              inputWrapper: "border dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
              input: "bg-transparent",
            }}
            value={query}
            onClear={() => {
              setQuery("");
              setLastId([]);
              void refreshData(currentCollection?.id || "0", undefined, undefined, true);
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
          <SearchSetting />
        </div>
        <div className="inline-flex items-center gap-2">
          <RadioGroup
            orientation="horizontal"
            defaultValue="all"
            onValueChange={async (status) => {
              await refreshData(currentCollection?.id || "0", undefined, status, true);
            }}
          >
            {["all", ...RecordStatuses].map((status) => {
              const color = status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
              let renderText = status

              if (status === 'pending' && (recordStats?.pending || 0) > 0) {
                renderText = `(${recordStats?.pending}) ${status}`
              } else if (status === 'rejected' && (recordStats?.rejected || 0) > 0) {
                renderText = `(${recordStats?.rejected}) ${status}`
              }

              return (
                <CRadio
                  color={colors[status]}
                  key={status}
                  size="sm"
                  classNames={{ label: "text-xs" }}
                  value={status}
                >
                  {renderText}
                </CRadio>
              )
            })}
          </RadioGroup>
        </div>
      </div>

      <div className="h-[calc(100vh-310px)] overflow-y-auto overflow-x-hidden custom-scrollbar">
        {data.length === 0 && (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="text-2xl font-bold mb-2">No data found</div>
            <div className="text-base leading-none text-gray-400">
              Try to change your search settings
            </div>
          </div>
        )}
        {data.map((data, index) => {
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

const Navigator: FC<{ onPrev: () => void; onNext: () => void }> = ({
  onPrev,
  onNext,
}) => {
  return (
    <div className="flex justify-between px-2.5 py-2 border-t border-divider">
      <Button
        isIconOnly
        onPress={onPrev}
      >
        <HiArrowLeft strokeWidth={1} className="w-4 h-4" />
      </Button>
      <Button
        isIconOnly
        onPress={onNext}
      >
        <HiArrowRight strokeWidth={1} className="w-4 h-4" />
      </Button>
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
    // __debug("data changed:", data);
    setRec(JSON.parse(JSON.stringify(data)));
  }, [data]);

  const onClick = () => {
    // __debug("rec:", rec);
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

  if (!rec) return <React.Fragment />;

  const color = rec.status === "approved" ? "success" : rec.status === "rejected" ? "danger" : "warning";

  return (
    <div
      data-active={currentRecord && currentRecord!.id === rec.id}
      data-dirty={rec.dirty}
      className="group py-3.5 pr-3 border-b data-[active=true]:bg-primary/5 hover:bg-primary/5 data-[dirty=true]:bg-orange-400 dark:data-[dirty=true]:bg-orange-600 dark:hover:bg-[#374151] dark:data-[active=true]:bg-[#374151] border-divider pl-5 cursor-pointer select-none flex flex-col gap-1"
      onClick={onClick}
    >
      <h1 className="font-medium group-data-[active=true]:font-semibold text-sm">{truncate(rec.prompt, 100)}</h1>
      <span className="text-sm leading-tight text-gray-500 dark:group-data-[active=true]:text-gray-100 group-data-[active=true]:text-gray-900 dark:text-gray-400">{truncate(rec.response, 100)}</span>
      <div className="text-xs inline-flex space-x-1.5 items-center mt-2">
        {rec.status && (
          <Chip
            size="sm"
            variant="flat"
            color={color}
            radius="sm"
            className="px-1.5 py-1 capitalize text-xs"
          >
            {rec.status}
          </Chip>
        )}
        <span className="opacity-60">{moment(rec.createdAt).format("YYYY/MM/DD")}</span>
        <span className="text-base opacity-60">•</span>
        <Tooltip placement="right" showArrow content={rec.creator || "?"}>
          <span className="opacity-60">{(rec.creator || "?").split(" ")[0]}</span>
        </Tooltip>
      </div>
    </div>
  );
};
