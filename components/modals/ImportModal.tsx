import { post } from "@/lib/FetchWrapper";
import { __debug, __log } from "@/lib/logger";
import { truncate } from "@/lib/stringutil";
import { Collection } from "@/types";
import { Button, Input, ModalBody, ModalContent, ModalFooter, cn } from "@nextui-org/react";
import Image from "next/image";
import { Loading } from "notiflix/build/notiflix-loading-aio";
import { Report } from "notiflix/build/notiflix-report-aio";
import React, { FC, useRef, useState } from "react";
import Dropzone, { FileRejection } from 'react-dropzone';
import ImportProvider, { ImportConsumer, ImportConsumerProps, useImport } from "../hooks/useImport";
import { ModalProps } from "../hooks/useModal";
import { CloseIcon } from "../icon/CloseIcon";
import { SearchIcon } from "../icons";

type FileDropProps = {
    acceptedFiles: File[],
    fileRejections: FileRejection[]
    addData: (...data: ImportedRecord[]) => void
}

type ImportedRecord = {
    id: string,
    instruction: string,
    response: string,
    input: string,
    history: [string, string][],
}

interface ImportModalProps extends ModalProps {
    currentCollection?: Collection
    onImportSuccess?: (importedCount: number) => void
}

const ImportModal: FC<ImportModalProps> = ({ currentCollection, ...props }) => {

    const onFileDrop = (opts: FileDropProps) => {
        if (opts.fileRejections.length > 0) {
            const err = opts.fileRejections.map(d => [d.file.name, d.errors.map(e => e.message).join(", ")].join(": ")).join("<br/>");

            Report.failure(
                "Failed!",
                `Cannot export records from collection: <br/><br/>${err}`,
                "Okay"
            );
            return
        }

        if (opts.acceptedFiles.length === 0) return

        Loading.hourglass(`Parsing records...`);
        const file = opts.acceptedFiles[0]
        const reader = new FileReader()
        reader.onload = async (e) => {
            const contents = e.target?.result
            if (typeof contents !== "string") return

            const data = contents.trim().split("\n")
                .map((d, i) => {
                    try {
                        let data: ImportedRecord = JSON.parse(d) as ImportedRecord
                        data.id = String(i)
                        return data
                    } catch (error) {
                        __log("[ERROR]", "🚀 ~ file: ImportModal.tsx:61 ~ reader.onload= ~ error:", error)
                        return null
                    }
                })
                .filter(Boolean) as ImportedRecord[]
            opts.addData(...data)
            Loading.remove(500)
        }
        reader.readAsText(file)
    }

    const doImportData = async (records: ImportedRecord[]) => {
        console.log("🚀 ~ file: ImportModal.tsx:77 ~ doImportData ~ records:", records.length)
        if (!currentCollection || records.length === 0) {
            return;
        }

        Loading.hourglass(`Importing ${records.length} records to collection ${currentCollection.name}...`);
        // split the records if the length is more than 100
        if (records.length > 100) {
            let skip = 0
            let take = 100
            let total = records.length
            let inserted = 0
            let failed_data: ImportedRecord[] = []

            while (skip < total) {
                const data = records.slice(skip, skip + take)
                await post(`/api/importRecords`, {
                    records: data,
                    collection_id: currentCollection.id,
                })
                    .then((resp: any) => {
                        __debug("resp:", resp);
                        if (resp.result) {
                            const result = resp.result as { inserted: number };
                            inserted += result.inserted
                        } else {
                            failed_data.push(...data)
                        }
                    })
                    .catch((_) => failed_data.push(...data))

                skip += take
            }

            Loading.remove()
            if (inserted === total) {
                Report.success(
                    "Import Success",
                    `Total ${inserted} records imported to collection ${currentCollection.name}`,
                    "Okay",
                    () => {
                        props.onImportSuccess?.(inserted);
                        props.closeModal?.();
                    }
                );
            } else {
                // show failed data count
                Report.failure(
                    "Failed!",
                    `Cannot import records to collection: <br/><br/>${failed_data.length} records failed to import.`,
                    "Okay",
                    () => {
                        // download the failed data save as jsonl
                        const data = failed_data.map((r) => {
                            return `${JSON.stringify(r)}\n`;
                        });
                        const blob = new Blob(data, {
                            type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${currentCollection.name}_failed_to_import_data.jsonl`;
                        a.click();
                    }
                );
            }
        } else {
            await post(`/api/importRecords`, {
                records,
                collection_id: currentCollection.id,
            })
                .then((resp: any) => {
                    __debug("resp:", resp);
                    if (resp.result) {
                        const result = resp.result as { inserted: number };
                        Report.success(
                            "Import Success",
                            `Total ${result.inserted} records imported to collection ${currentCollection.name}`,
                            "Okay",
                            () => {
                                props.onImportSuccess?.(result.inserted);
                                props.closeModal?.();
                            }
                        );
                    } else {
                        Report.failure(
                            "Failed!",
                            `Cannot import records to collection: <br/><br/>${resp.error}`,
                            "Okay"
                        );
                    }
                })
                .catch((err: any) => {
                    Report.failure(
                        "Failed!",
                        `Cannot import records to collection: <br/><br/>${err}`,
                        "Okay"
                    );
                })
                .finally(() => Loading.remove());
        }
    }

    return (
        <ImportProvider>
            <ImportConsumer>
                {(context: ImportConsumerProps<ImportedRecord>) => (
                    <ModalContent>
                        <ModalBody className="p-0 grid grid-cols-3 divide-x-1 gap-0 dark:divide-black/30">
                            {context.importData.length > 0 ? (
                                <React.Fragment>
                                    <RecordsExplorer
                                        className="min-h-full w-full col-span-1 p-0"
                                    />
                                    <div className="flex flex-col w-full col-span-2">
                                        <div className="w-full border-b dark:border-b-black/30 py-3 px-4 flex justify-between items-center">
                                            <div>
                                                <div className="text-lg font-bold">Records to Import</div>
                                                <div className="text-sm opacity-80">{context.selectedData.length} records</div>
                                            </div>
                                            <div className="inline-flex gap-2 items-center">
                                                <Button
                                                    radius="sm"
                                                    color="warning"
                                                    className="text-white dark:text-black"
                                                    isDisabled={context.selectedData.length === 0}
                                                    onClick={() => context.dispatch.clearSelectedData()}
                                                >
                                                    Clear Selected
                                                </Button>
                                                <Button
                                                    radius="sm"
                                                    color="danger"
                                                    className="text-white dark:text-black"
                                                    onClick={() => context.dispatch.clearAll()}
                                                >
                                                    Clear All
                                                </Button>
                                                <Button
                                                    radius="sm"
                                                    onPress={() => doImportData(context.importData)}
                                                >
                                                    Import All
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 px-4 py-4 h-[660px] overflow-y-auto">
                                            {context.selectedData.map((data, index) => {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="shadow-none border dark:border-black/40 h-fit rounded-md"
                                                    >
                                                        <div className="inline-flex items-center w-full justify-between border-b dark:border-b-black/40 px-4 py-2">
                                                            <div className="text-base font-medium leading-none">{truncate(data.instruction, 100)}</div>
                                                            <Button
                                                                isIconOnly
                                                                onPress={() => context.dispatch.removeData(index)}
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
                                </React.Fragment>
                            ) : (
                                <Dropzone
                                    maxFiles={1}
                                    accept={{ "application/json": [".jsonl"] }}
                                    onDrop={(acceptedFiles, fileRejections) => onFileDrop({
                                        acceptedFiles,
                                        fileRejections,
                                        addData: context.dispatch.addData
                                    })}
                                >
                                    {({ getRootProps, getInputProps }) => (
                                        <section className="px-6 py-6 text-center min-h-[600px] col-span-3">
                                            <div {...getRootProps()} className="flex w-full items-center justify-center flex-col gap-4 h-full border-2 border-dashed rounded-lg hover:bg-slate-200 hover:cursor-pointer">
                                                <input {...getInputProps()} className="hidden" />
                                                <Image
                                                    width={200}
                                                    height={200}
                                                    objectFit="contain"
                                                    src="/import_file.svg"
                                                    alt="import"
                                                />
                                                <div className="text-center">
                                                    <p className="text-lg">{"Drag 'n' drop some *.jsonl file here,"}</p>
                                                    <p className="text-lg">{"or click to select *.jsonl file"}</p>
                                                </div>
                                            </div>
                                        </section>
                                    )}
                                </Dropzone>
                            )}
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
                                isDisabled={context.selectedData.length === 0}
                                onPress={() => doImportData(context.selectedData)}
                            >
                                Import Selected
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                )}
            </ImportConsumer>
        </ImportProvider>
    );
}

const RecordsExplorer: FC<{ className: string; }> = ({ className }) => {
    const perPage = 50
    const { importData, selectedData, dispatch } = useImport<ImportedRecord>()
    const [query, setQuery] = useState<string>("");
    const [skip, setSkip] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)

    const filteredData = React.useMemo(() => {
        if (query.trim().length === 0) return importData
        const keyword = query.trim().toLowerCase()
        return importData
            .filter(d => {
                return d.instruction.toLowerCase().includes(keyword)
                    || d.response.toLowerCase().includes(keyword)
            })
    }, [importData, query])

    const paginatedData = React.useMemo(() => {
        return filteredData.slice(skip, skip + perPage)
    }, [filteredData, skip])

    const disableNextPage = React.useMemo(() => {
        return skip + perPage >= filteredData.length
    }, [filteredData, skip])

    const disablePrevPage = React.useMemo(() => {
        return skip === 0
    }, [skip])

    const totalPages = React.useMemo(() => {
        return Math.ceil(filteredData.length / perPage)
    }, [filteredData])

    const currentPage = React.useMemo(() => {
        return Math.ceil((skip + 1) / perPage)
    }, [skip])

    const nextPage = () => {
        if (skip + perPage >= filteredData.length) return
        setSkip(s => s + perPage)
        listRef.current?.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth"
        })
    }

    const prevPage = () => {
        if (skip === 0) return
        setSkip(s => s - perPage)
        // smooth scroll to top of listRef
        listRef.current?.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth"
        })
    }

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
                    }}
                    onKeyUp={(e) => {
                        if (e.key === "Enter") {
                            setQuery(e.currentTarget.value);
                        }
                    }}
                    onChange={(e) => {
                        setQuery(e.currentTarget.value);
                    }}
                />
            </div>

            <div ref={listRef} className="h-[600px] overflow-auto">
                {(paginatedData.length === 0) && (
                    <div className="w-full h-full flex items-center justify-center text-center">
                        <p>No Records found</p>
                    </div>
                )}
                {paginatedData.map((data, index) => {
                    const isSelected = selectedData.includes(data);

                    return (
                        <div
                            className={cn("border-b-1 pb-1 dark:border-b-black/30 dark:border-l-black/30 cursor-pointer dark:hover:bg-gray-600 hover:bg-slate-200 dark:hover:dark:text-black border-l-8 pl-2", {
                                "border-l-primary bg-primary bg-opacity-10": isSelected,
                            })}
                            key={index}
                            onClick={() => {
                                if (isSelected) {
                                    dispatch.removeData(index)
                                } else {
                                    dispatch.addSelectedData(data)
                                }
                            }}
                        >
                            <div>{truncate(data.instruction, 100)}</div>
                            <div className="text-sm">{truncate(data.response, 100)}</div>
                        </div>
                    );
                })}
            </div>

            {filteredData.length > 0 && (
                <div className="flex justify-between p-2 items-center">
                    <Button onClick={prevPage} isDisabled={disablePrevPage}>Previous</Button>
                    <div className="text-sm">Page {currentPage}/{totalPages}</div>
                    <Button onClick={nextPage} isDisabled={disableNextPage}>Next</Button>
                </div>
            )}
        </div>
    );
};

export default ImportModal;