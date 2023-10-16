import { get, post } from "@/lib/FetchWrapper";
import { __debug } from "@/lib/logger";
import { getLocalStorage } from "@/lib/state";
import { truncate } from "@/lib/stringutil";
import { Collection, DataRecord } from "@/types";
import { Button } from "@nextui-org/button";
import { Input, ModalBody, ModalContent, ModalFooter, Spinner, cn } from "@nextui-org/react";
import moment from "moment";
import { Loading } from "notiflix/build/notiflix-loading-aio";
import { Report } from "notiflix/build/notiflix-report-aio";
import { FC, useEffect, useState } from "react";
import { SearchSetting } from "../SearchSetting";
import ExportProvider, { ExportConsumer, ExportConsumerProps, useExport } from "../hooks/useExport";
import { ModalProps } from "../hooks/useModal";
import { CloseIcon } from "../icon/CloseIcon";
import { SearchIcon } from "../icons";

interface Props extends ModalProps {
    currentCollection?: Collection
}

type SearchData = {
    id: string;
} & Partial<{
    keyword: string;
    toId: string;
    fromId: string;
}>;

type ExportedRecord = {
    instruction: string,
    response: string,
    input: string,
    history: [string, string][],
}

const revalidateSearch = ({ id, keyword, toId, fromId }: SearchData) => {
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

    if (toId) uri.searchParams.set("toId", toId);
    if (fromId) uri.searchParams.set("fromId", fromId);

    return uri.toString();
};

const ExportModal: FC<Props> = ({ currentCollection, ...props }) => {
    const doExportData = async (ids: string[]) => {
        if (!currentCollection) {
            return;
        }

        Loading.hourglass(`Exporting ${ids.length > 0 ? ids.length : 'all'} records from collection ${currentCollection.name}...`);
        await post(`/api/exportRecords`, {
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
    const { exportData, canExport, removeData, clearData } = useExport<DataRecord>()

    return (
        <div className="flex flex-col w-full col-span-2">
            <div className="w-full border-b dark:border-b-black/30 py-3 px-4 flex justify-between items-center">
                <div>
                    <div className="text-lg font-bold">Records to Export</div>
                    <div className="text-sm opacity-80">{exportData.length} records</div>
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
                            className="shadow-none border dark:border-black/40 h-fit rounded-md"
                            key={index}
                        >
                            <div className="inline-flex items-center w-full justify-between border-b dark:border-b-black/40 px-4 py-2">
                                <div className="text-base font-medium leading-none">{truncate(data.prompt, 100)}</div>
                                <Button
                                    isIconOnly
                                    onPress={() => removeData(index)}
                                    variant="light"
                                    size="sm"
                                    className="text-current"
                                >
                                    <CloseIcon />
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
    const [data, setData] = useState<DataRecord[]>([]);
    const [query, setQuery] = useState<string>("");
    const [lastId, setLastId] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { exportData, addData, removeData, setCanExport } = useExport<DataRecord>();

    const refreshData = async (
        query?: string | undefined,
        noLastId: boolean = false
    ) => {
        try {
            if (!currentCollection) {
                return;
            }
            setIsLoading(true);
            let options: SearchData = {
                id: currentCollection.id,
            };

            if (query) options.keyword = query;
            if (lastId.length > 0 && !noLastId) {
                if (lastId[1] !== "") {
                    options.toId = lastId[1];
                }
                if (lastId[0] !== "") {
                    options.fromId = lastId[0];
                }
            }

            return await get(revalidateSearch(options)).then((data) => {
                setData(data.result);
                if (data.result.length > 0) {
                    setCanExport(true);
                    setLastId([
                        data.result[0].id,
                        data.result[data.result.length - 1].id,
                    ]);
                } else {
                    setCanExport(false);
                }
            });
        } catch (error) {
            console.log("🚀 ~ file: ExportModal.tsx:185 ~ error:", error)
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshData(undefined, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            <div className="pb-2 p-2 flex gap-1 border-b-1 dark:border-b-black/30">
                <Input
                    className="pb-2 p-2"
                    type="email"
                    placeholder="search records"
                    labelPlacement="outside"
                    startContent={
                        <SearchIcon className="text-2xl text-default-400 pointer-events-none flex-shrink-0" />
                    }
                    isClearable
                    value={query}
                    onClear={() => {
                        setQuery("")
                        refreshData(undefined, true)
                    }}
                    onKeyUp={(e) => {
                        if (e.key === "Enter") {
                            refreshData(query, true);
                        }
                    }}
                    onChange={(e) => {
                        setQuery(e.currentTarget.value);
                    }}
                />
                <SearchSetting />
            </div>

            <div className="h-[600px] overflow-scroll">
                {isLoading && (
                    <div className="w-full h-full flex items-center justify-center">
                        <Spinner color="primary" size="lg" />
                    </div>
                )}
                {(!isLoading && data.length === 0) && (
                    <div className="w-full h-full flex items-center justify-center text-center">
                        <p>No Records in {currentCollection?.name}</p>
                    </div>
                )}
                {!isLoading && data.map((data, index) => {
                    const isSelected = exportData.find((d) => d.id === data.id);

                    return (
                        <div
                            className={cn("border-b-1 pb-1 dark:border-b-black/30 dark:border-l-black/30 cursor-pointer dark:hover:bg-gray-600 hover:bg-slate-200 dark:hover:dark:text-black border-l-8 pl-2", {
                                "border-l-primary bg-primary bg-opacity-10": isSelected,
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
                            <div>{truncate(data.prompt, 100)}</div>
                            <div className="text-sm">{truncate(data.response, 100)}</div>
                            <div className="text-xs inline-flex space-x-2 items-center opacity-80">
                                <span>{moment(data.createdAt).format("YYYY/MM/DD")}</span>
                                <span>-</span>
                                <span>{data.creator ?? "?"}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between p-2">
                <Button onClick={onPrevPage}>Previous</Button>
                <Button onClick={onNextPage}>Next</Button>
            </div>
        </div>
    );
};

export default ExportModal;