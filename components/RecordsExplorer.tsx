"use client";

import { SearchSetting } from "@/components/SearchSetting";
import { get } from "@/lib/FetchWrapper";
import {
  CollectionContext,
  GlobalContext,
  SelectedRecordContext,
} from "@/lib/context";
import { __debug } from "@/lib/logger";
import { truncate } from "@/lib/stringutil";
import { RecordStatuses } from "@/models";
import { DataRecord, Statistic } from "@/types";
import { Button } from "@nextui-org/button";
import { Chip, ChipProps, Input, RadioGroup, Spinner, Tooltip } from "@nextui-org/react";
import moment from "moment";
import React, { FC, Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { HiArrowLeft, HiArrowRight } from "react-icons/hi2";
import useSWR from "swr";
import CRadio from "./CRadio";
import usePagination from "./hooks/usePagination";
import { SearchIcon } from "./icon/SearchIcon";

type SearchData = {
  collectionId: string;
} & Partial<{
  keyword: string | null;
  toId: string;
  fromId: string;
  status: string | string[];
  features: string[];
  creators: string[];
  sort: string;
}>;

type DataFilter = Partial<{
  status: string | string[];
  keyword: string;
  features: string[];
  creators: string[];
  sort: string;
}>

const revalidateSearch = async (params: SearchData) => {
  let uri = new URL(`/api/records`, window.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((v) => {
        uri.searchParams.append(key, v);
      })
    } else {
      uri.searchParams.set(key, value);
    }
  })

  return await get(uri.toString());
}

const revalidateStats = (params: SearchData) => {
  if (typeof window === 'undefined') return `/api/records/stats?collectionId=${params.collectionId}`

  const uri = new URL(`/api/records/stats`, window.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((v) => {
        uri.searchParams.append(key, v);
      })
    } else {
      uri.searchParams.set(key, value);
    }
  })

  return uri.toString();
}

const colors: Record<string, ChipProps['color']> = {
  all: 'primary',
  approved: 'success',
  rejected: 'danger',
  pending: 'warning'
}

const RecordsExplorer: FC<{ className: string }> = ({ className }) => {
  const { currentCollection } = useContext(CollectionContext);
  const { globalState, setGlobalState } = useContext(GlobalContext);
  const [dataFilter, setDataFilter] = useState<DataFilter>({})
  const { data, ...paging } = usePagination<DataRecord, SearchData>(revalidateSearch, {
    ...dataFilter,
    collectionId: currentCollection?.id || "0",
  });

  const statsUrl = useMemo(() => revalidateStats({
    collectionId: currentCollection?.id || "0",
    features: dataFilter.features,
    creators: dataFilter.creators,
    keyword: dataFilter.keyword,
  }), [currentCollection?.id, dataFilter])

  const { data: stats } = useSWR<{ result: Statistic }>(statsUrl, get, { refreshInterval: 4000 })

  const recordStats = stats?.result;

  const loadRecords = useCallback(async (blockLoading = true, opts?: { fromId?: string; toId?: string; }) => {
    if (!currentCollection) return;

    let params: SearchData = {
      ...dataFilter,
      collectionId: currentCollection.id,
    }

    if (opts?.fromId) params.fromId = opts.fromId
    if (opts?.toId) params.toId = opts.toId

    await paging.fetchData(params, { blockLoading })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCollection, dataFilter])

  useEffect(() => {
    __debug("in RecordsExplorer globalState effect");
    if (!globalState || !currentCollection) return;

    if (globalState.newRecord) {
      __debug("globalState.newRecord changed. NewRecord:", globalState.newRecord);
      loadRecords(false);
      setDataFilter((old) => ({ ...old, status: "pending" }))
      setGlobalState({ ...globalState, newRecord: null });
    }
    if (globalState.deleteRecord) {
      __debug("globalState.deleteRecord changed. DeleteRecord:", globalState.deleteRecord);
      loadRecords(false, { fromId: paging.firstId, toId: paging.lastId });
      setGlobalState({ ...globalState, deleteRecord: null });
    }
    if (globalState.updatedRecord) {
      __debug("globalState.updatedRecord changed. UpdatedRecord:", globalState.updatedRecord);
      loadRecords(false, { fromId: paging.firstId, toId: paging.lastId });
      setGlobalState({ ...globalState, updatedRecord: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalState, currentCollection, setGlobalState, paging.firstId, paging.lastId]);

  useEffect(() => {
    if (!currentCollection) return;

    loadRecords();
  }, [currentCollection, loadRecords]);

  return (
    <div className={className}>
      <div className="flex flex-col gap-3.5 border-b-1 border-divider px-4 py-4">
        <div className="flex gap-2 items-center">
          <Input
            isClearable
            placeholder="Search"
            aria-labelledby="search"
            startContent={
              <SearchIcon className="text-2xl text-default-400 pointer-events-none flex-shrink-0" />
            }
            classNames={{
              inputWrapper: "border dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
              input: "bg-transparent",
            }}
            defaultValue={dataFilter.keyword}
            onClear={() => setDataFilter((old) => ({ ...old, keyword: undefined }))}
            onKeyUp={(e) => {
              if (e.key === "Enter" && "value" in e.target) {
                const keyword = String(e.target.value)
                setDataFilter((old) => ({ ...old, keyword }))
              }
            }}
          />
          <SearchSetting
            onSaveSearch={(filters) => {
              setDataFilter((old) => ({ ...old, ...filters }))
            }}
          />
        </div>
        <div className="inline-flex items-center gap-2">
          <RadioGroup
            orientation="horizontal"
            value={String(dataFilter.status || "all")}
            onValueChange={(status) => setDataFilter((old) => ({ ...old, status }))}
          >
            {["all", ...RecordStatuses].map((status) => {
              let renderText = status

              if (status === 'pending') {
                renderText = `(${(recordStats?.pending || 0)}) ${status}`
              } else if (status === 'rejected') {
                renderText = `(${(recordStats?.rejected || 0)}) ${status}`
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
        {paging.isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="flex flex-col gap-2">
              <Spinner color="secondary" size="lg" />
              <div className="text-base leading-none text-gray-400">
                Loading records...
              </div>
            </div>
          </div>
        ) : (
          <Fragment>
            {data.length === 0 && (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="text-2xl font-bold mb-2">No records found</div>
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
          </Fragment>
        )}

      </div>

      <div className="flex justify-between px-2.5 py-2 border-t border-divider items-center bg-gray-50 dark:bg-slate-800">
        <Button
          isIconOnly
          isDisabled={!paging.hasPrev}
          onPress={paging.prevPage}
        >
          <HiArrowLeft strokeWidth={1} className="w-4 h-4" />
        </Button>
        <div>
          <span className="text-xs text-current">Page {paging.currentPage}/{paging.totalPage}</span>
        </div>
        <Button
          isIconOnly
          isDisabled={!paging.hasNext}
          onPress={paging.nextPage}
        >
          <HiArrowRight strokeWidth={1} className="w-4 h-4" />
        </Button>
      </div>
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
  }, [currentRecord, data]);

  useEffect(() => {
    // __debug("data changed:", data);
    setRec(JSON.parse(JSON.stringify(data)));
  }, [data]);

  const onClick = () => {
    // __debug("rec:", rec);
    setCurrentRecord && setCurrentRecord(rec);

    // uncomment this lines if you want to re-fetch the data from the server
    // get(`/api/records/${data.id}?collectionId=${collectionId}`)
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
