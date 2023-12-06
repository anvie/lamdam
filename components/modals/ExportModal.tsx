import { get, post } from "@/lib/FetchWrapper";
import { __debug } from "@/lib/logger";
import { truncate } from "@/lib/stringutil";
import { Collection, DataRecord } from "@/types";
import { Button } from "@nextui-org/button";
import { Input, ModalBody, ModalContent, ModalFooter, Spinner, cn } from "@nextui-org/react";
import moment from "moment";
import { Loading } from "notiflix/build/notiflix-loading-aio";
import { Report } from "notiflix/build/notiflix-report-aio";
import { FC, useCallback, useEffect, useState } from "react";
import { HiArrowLeft, HiArrowRight, HiOutlineXMark } from "react-icons/hi2";
import { SearchSetting } from "../SearchSetting";
import ExportProvider, { ExportConsumer, ExportConsumerProps, useExport } from "../hooks/useExport";
import { ModalProps } from "../hooks/useModal";
import usePagination from "../hooks/usePagination";
import { SearchIcon } from "../icons";

interface Props extends ModalProps {
    currentCollection?: Collection
}

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

type ExportedRecord = {
    instruction: string,
    response: string,
    input: string,
    history: [string, string][],
}

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

const ExportModal: FC<Props> = ({ currentCollection, ...props }) => {
    const doExportData = async (ids: string[]) => {
        if (!currentCollection) {
            return;
        }

        Loading.hourglass(`Exporting ${ids.length > 0 ? ids.length : 'all'} records from collection ${currentCollection.name}...`);
        await post(`/api/records/export`, {
            ids,
            collection_id: currentCollection.id,
        })
            .then((resp: any) => {
                __debug("resp:", resp);
                if (resp.result) {
                    const result = resp.result as ExportedRecord[];
                    const data = result.map((r) => {
                        return `${JSON.stringify(r)}\n`;
                    });
                    const blob = new Blob(data, {
                        type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${currentCollection.name}.jsonl`;
                    a.click();
                    Report.success(
                        "Export Success",
                        `Total ${resp.result.length} records exported from collection ${currentCollection.name}`,
                        "Okay"
                    );
                }
            })
            .catch((err: any) => {
                Report.failure(
                    "Failed!",
                    `Cannot export records from collection: <br/><br/>${err}`,
                    "Okay"
                );
            })
            .finally(() => {
                Loading.remove();
            });
    }

    return (
        <ExportProvider>
            <ExportConsumer>
                {({ exportData }: ExportConsumerProps<DataRecord>) => (
                    <ModalContent>
                        <ModalBody className="p-0 grid grid-cols-3 divide-x-1 gap-0 dark:divide-black/30">
                            <RecordsExplorer
                                className="min-h-full w-full col-span-1 p-0"
                                currentCollection={currentCollection}
                            />
                            <RecordsToExport doExportAll={() => doExportData([])} />
                        </ModalBody>
                        <ModalFooter className="border-t dark:border-t-black/30">
                            <Button
                                onPress={props.closeModal}
                                radius="sm"
                                variant="ghost"
                            >
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                radius="sm"
                                isDisabled={exportData.length === 0}
                                onPress={() => doExportData(exportData.map((d) => d.id))}
                            >
                                Export Selected
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                )}
            </ExportConsumer>
        </ExportProvider>
    );
}

const RecordsToExport: FC<{ doExportAll: () => void }> = ({ doExportAll }) => {
    const { exportData, dataCount, canExport, removeData, clearData } = useExport<DataRecord>()

    return (
        <div className="flex flex-col w-full col-span-2">
            <div className="w-full border-b dark:border-b-black/30 py-3 px-4 flex justify-between items-center">
                <div>
                    <div className="text-lg font-bold">Records to Export</div>
                    <div className="text-sm opacity-80">{exportData.length}/{dataCount} records</div>
                </div>
                <div className="inline-flex gap-2 items-center">
                    <Button
                        radius="sm"
                        color="warning"
                        onPress={clearData}
                        isDisabled={exportData.length === 0}
                        className="text-white dark:text-black"
                    >
                        Clear Selected
                    </Button>
                    <Button
                        radius="sm"
                        isDisabled={!canExport}
                        onPress={doExportAll}
                    >
                        Export All
                    </Button>
                </div>
            </div>
            <div className="flex flex-col gap-2 px-4 py-4 max-h-[calc(100vh/2)] overflow-y-auto">
                {exportData.map((data, index) => {
                    return (
                        <div
                            key={index}
                            className="shadow-none border dark:border-divider/30 h-fit rounded-md dark:bg-slate-700"
                        >
                            <div className="inline-flex items-center w-full justify-between border-b dark:border-b-divider/30 px-4 py-2">
                                <div className="text-base font-medium leading-none">{truncate(data.prompt, 100)}</div>
                                <Button
                                    isIconOnly
                                    onPress={() => removeData(index)}
                                    variant="light"
                                    size="sm"
                                    className="text-current"
                                >
                                    <HiOutlineXMark className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="px-4 py-3 text-sm h-fit overflow-hidden">
                                {truncate(data.response, 300)}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}


const RecordsExplorer: FC<{ className: string; currentCollection?: Collection }> = ({ className, currentCollection }) => {
    const [dataFilter, setDataFilter] = useState<DataFilter>({})
    const { data, ...paging } = usePagination<DataRecord, SearchData>(revalidateSearch, {
        ...dataFilter,
        collectionId: currentCollection?.id || "0",
        status: 'approved',
    });
    const { exportData, addData, removeData, setCanExport } = useExport<DataRecord>(paging.count);

    const loadRecords = useCallback(async (blockLoading = true) => {
        if (!currentCollection) return;

        await paging.fetchData({
            collectionId: currentCollection.id,
            ...dataFilter,
        }, { blockLoading })
            .then((result) => setCanExport((result?.paging.count || 0) > 0))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCollection, dataFilter])

    useEffect(() => {
        if (!currentCollection) return;

        loadRecords();
    }, [currentCollection, loadRecords]);

    return (
        <div className={className}>
            <div className="py-4 px-5 flex gap-2 border-b-1 dark:border-b-black/30">
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

            <div className="h-[calc(100vh/2.2)] overflow-y-auto custom-scrollbar">
                {paging.isLoading && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="flex flex-col gap-2">
                            <Spinner color="secondary" size="lg" />
                            <div className="text-base leading-none text-gray-400">
                                Loading records...
                            </div>
                        </div>
                    </div>
                )}
                {(!paging.isLoading && data.length === 0) && (
                    <div className="w-full h-full flex items-center justify-center text-center">
                        <p>No <span className="font-medium">Approved</span> Records in {currentCollection?.name}</p>
                    </div>
                )}
                {!paging.isLoading && data.map((data, index) => {
                    const isSelected = exportData.find((d) => d.id === data.id);

                    return (
                        <div
                            className={cn("group py-2.5 pr-2 border-b data-[active=true]:bg-secondary/25 hover:bg-secondary/25 data-[dirty=true]:bg-orange-400 dark:data-[dirty=true]:bg-orange-600 dark:hover:bg-[#374151] dark:data-[active=true]:bg-[#374151] border-divider cursor-pointer select-none flex flex-col gap-1 border-l-8 pl-3", {
                                "border-l-secondary bg-secondary bg-opacity-10 dark:bg-opacity-20": isSelected,
                            })}
                            key={index}
                            onClick={() => {
                                if (isSelected) {
                                    removeData(exportData.findIndex((d) => d.id === data.id));
                                } else {
                                    addData(data)
                                }
                            }}
                        >
                            <h1 className="font-medium group-data-[active=true]:font-semibold text-sm">{truncate(data.prompt, 100)}</h1>
                            <span className="text-sm leading-tight text-gray-500 dark:group-data-[active=true]:text-gray-100 group-data-[active=true]:text-gray-900 dark:text-gray-400">{truncate(data.response, 100)}</span>
                            <div className="text-xs inline-flex space-x-1.5 items-center mt-1">
                                <span className="opacity-60">{moment(data.createdAt).format("YYYY/MM/DD")}</span>
                                <span className="text-base opacity-60">•</span>
                                <span className="opacity-60">{(data.creator || "?").split(" ")[0]}</span>
                            </div>
                        </div>
                    );
                })}
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

export default ExportModal;