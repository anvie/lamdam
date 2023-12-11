import { get, post } from "@/lib/FetchWrapper";
import {
  CollectionContext,
  GlobalContext,
  QAPair,
  SelectedHistoryContext,
  SelectedRecordContext,
} from "@/lib/context";
import { errorMessage } from "@/lib/errorutil";
import { __debug, __error } from "@/lib/logger";
import { DisclosureType } from "@/lib/types";
import { DataRecord } from "@/types";
import { Button } from "@nextui-org/button";
import { Textarea } from "@nextui-org/input";
import { Tooltip, cn } from "@nextui-org/react";
import { useSession } from "next-auth/react";
import { Confirm, Notify } from "notiflix";
import { FC, useContext, useEffect, useState } from "react";
import { HiArrowRight, HiOutlineChatBubbleLeftEllipsis, HiOutlineDocumentPlus, HiOutlineMagnifyingGlass, HiOutlineTrash, HiXMark } from "react-icons/hi2";
import ChatModePromptEditor from "./ChatModePromptEditor";
import GPTResponseView from "./GPTResponseView";
import LLMResponseView, { LLMResponseData } from "./LLMResponseView";
import { BarsArrowDownIcon } from "./icon/BarsArrowDownIcon";
import ChipIcon from "./icon/ChipIcon";

interface PromptEditorProps {
  llmResponseViewDisclosure: DisclosureType;
  gptResponseViewDisclosure: DisclosureType;
}

const PromptEditor: FC<PromptEditorProps> = ({
  llmResponseViewDisclosure,
  gptResponseViewDisclosure,
}) => {
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  let { globalState, setGlobalState } = useContext(GlobalContext);
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);

  const [newHistory, setNewHistory] = useState<QAPair[]>([]);

  const [dirty, setDirty] = useState(false);
  const [rawHistory, setRawHistory] = useState("");
  const [chatMode, setChatMode] = useState(false);

  const session = useSession()
  const user = session.data?.user

  const canDelete = (user?.role === "superuser" || currentRecord?.creatorId === user?.id) && currentRecord !== null

  useEffect(() => {
    if (currentRecord && dirty && !currentRecord.dirty) {
      setDirty(false);
    }
    // __debug("PromptEditor.currentRecord:", currentRecord);
    if (currentRecord && currentRecord.rawHistory != rawHistory) {
      let lines = [];
      for (let i = 0; i < currentRecord.history.length; i++) {
        const item = currentRecord.history[i];
        // __debug("item:", item);
        lines.push(`a: ${item[0]}`);
        lines.push(`b: ${item[1]}`);
        if (currentRecord.history[i + 1]) {
          lines.push("-----");
        }
      }
      setRawHistory(lines.join("\n"));
      setCurrentRecord &&
        setCurrentRecord({
          ...currentRecord,
          rawHistory: lines.join("\n"),
        });
    }
  }, [currentRecord]);

  useEffect(() => {
    if (
      currentCollection &&
      currentRecord &&
      currentRecord.collectionId != currentCollection.id
    ) {
      setCurrentRecord && setCurrentRecord(null);
    }
  }, [currentCollection]);

  const throttledSaveChanges = (name: string) => {
    return (value: string) => {
      if (!currentCollection) {
        __error("currentCollection is null");
        return;
      }
      let _value: any = value;
      if (name == "history") {
        setRawHistory(value);
        setDirty(true);
        if (currentRecord) {
          setCurrentRecord &&
            setCurrentRecord({
              ...currentRecord,
              dirty: true,
              rawHistory: _value,
            });
        }
        return;
      }
      let newResponse = currentRecord?.response || "";
      if (name === "outputPositive") {
        newResponse = `${value}\n\n----------\n\n${currentRecord?.outputNegative || ""
          }`;
      }
      if (name === "outputNegative") {
        newResponse = `${currentRecord?.outputPositive || ""
          }\n\n----------\n\n${value}`;
      }
      // __debug("newResponse:", newResponse);
      if (currentRecord) {
        setDirty(true);
        setCurrentRecord &&
          setCurrentRecord({
            ...currentRecord,
            dirty: true,
            response: newResponse,
            [name]: _value,
          });
      } else {
        // recrod belum exists, buatkan
        const doc = setEmptyRecord();
        setCurrentRecord &&
          setCurrentRecord({
            ...doc,
            [name]: _value,
          });
      }
    };
  };

  const setEmptyRecord = () => {
    const doc = {
      id: "",
      prompt: "",
      response: "",
      input: "",
      history: [],
      creator: "",
      createdAt: 0,
      lastUpdated: 0,
      updateHistory: [],
      collectionId: currentCollection!.id,
      rawHistory: "",
      outputPositive: "",
      outputNegative: "",
    };
    setCurrentRecord && setCurrentRecord(doc);
    return doc;
  };

  const showJumpToRecordDialog = () => {
    if (!currentCollection) {
      return;
    }
    Confirm.prompt(
      "Goto Record",
      "record id",
      "",
      "Ok",
      "Cancel",
      (answer: string) => {
        // jumpt to record
        get(`/api/records/${answer}?collectionId=${currentCollection.id}`)
          .then((data: any) => {
            setCurrentRecord && setCurrentRecord(data.result);
          })
          .catch((error: any) => {
            __error("error:", error);
            Notify.failure("Record not found");
          });
      }
    );
  };

  const clearPromptEditor = () => {
    setCurrentRecord && setCurrentRecord(null);
    setRawHistory("");
    setNewHistory([]);
    setChatMode(false);
  };

  const addChatAsHistory = () => {
    let _currentRecord: DataRecord | null = null;

    if (!currentRecord) {
      _currentRecord = setEmptyRecord();
    } else {
      _currentRecord = currentRecord;
    }

    let histories = newHistory.map((d: QAPair) => [d.a, d.b]);
    __debug("histories:", histories);
    const _rawHistory = newHistory
      .map((d: QAPair) => `a: ${d.a}\nb: ${d.b}`)
      .join("\n-----\n");

    const lastMessage =
      histories && histories.length > 0 ? histories.pop() : null;

    setCurrentRecord &&
      setCurrentRecord({
        ..._currentRecord,
        prompt:
          lastMessage && lastMessage.length > 0
            ? lastMessage[0]
            : _currentRecord.prompt,
        response:
          lastMessage && lastMessage.length > 0
            ? lastMessage[1]
            : _currentRecord.prompt,
        history: histories,
        rawHistory: _rawHistory,
        dirty: _currentRecord.id ? true : false,
      });

    setChatMode(false);
  };

  const onAddToHistory = () => {
    if (!currentCollection) {
      return;
    }
    if (chatMode) {
      addChatAsHistory();
      return;
    }
    if (!currentRecord) {
      return;
    }
    let histories = JSON.parse(JSON.stringify(currentRecord.history));
    histories.push([
      `${currentRecord.prompt}\n${currentRecord.input}`.trim(),
      currentRecord.response,
    ]);
    currentRecord.prompt = "";
    currentRecord.response = "";
    const _rawHistory = histories
      .map((d: string[]) => `a: ${d[0]}\nb: ${d[1]}`)
      .join("\n-----\n");
    setCurrentRecord &&
      setCurrentRecord({
        ...currentRecord,
        history: histories,
        rawHistory: _rawHistory,
        dirty: currentRecord.id ? true : false,
      });
    // setRawHistory(_rawHistory);
  };

  const onSwithToChatMode = () => {
    __debug("chatMode:", chatMode);
    setChatMode(!chatMode);
  };

  const onAddNewRecord = () => {
    setGlobalState && setGlobalState({ ...globalState, addNewRecord: true });
  };
  const onShowExplorer = () => {
    setGlobalState({ ...globalState, showExplorer: true });
  };

  const onCopyLLMResponse = (data: LLMResponseData) => {
    if (currentRecord) {
      const rec = currentRecord;

      if (data.target === "bad") {
        rec.outputNegative = data.text;
      } else if (data.target === "good") {
        rec.outputPositive = data.text;
      } else if (data.target === "response") {
        rec.response = data.text;
      }
      if (data.history && data.history.length > 0) {
        for (let i = 0; i < data.history.length; i++) {
          const item = data.history[i];
          rec.history.push([item[0], item[1]]);
        }
        const _rawHistory = rec.history
          .map((d: string[]) => `a: ${d[0]}\nb: ${d[1]}`)
          .join("\n-----\n");
        rec.rawHistory = _rawHistory;
      }
      if (data.rag && data.rag.length > 0) {
        rec.prompt = data.rag;
      }

      const formattedResponse = formatResponse(
        rec,
        currentCollection?.meta?.dataType || "sft"
      );

      setCurrentRecord!({
        ...rec,
        response: formattedResponse,
      });
    }
  };

  const onDeleteRecordClick = () => {
    if (!currentRecord) {
      Notify.info("Please specify record first");
      return;
    }

    const rec: DataRecord = currentRecord!;

    if (!rec.id) {
      Notify.info("Please specify record first");
      return;
    }

    Confirm.show(
      "Confirmation",
      `Are you sure you want to delete record "${rec.prompt}"?`,
      "Yes",
      "No",
      () => {
        post(`/api/records/${rec.id}/delete`, {
          id: rec.id,
          collectionId: currentCollection?.id,
        })
          .then((data) => {
            setGlobalState({
              ...globalState,
              deleteRecord: currentRecord,
            });
            setCurrentRecord!(null);
            Notify.success("Record has been deleted");
          })
          .catch((err) => {
            if (err) {
              __error(typeof err);
              Notify.failure("Cannot update record :(. " + errorMessage(err));
            }
          });
      }
    );
  };

  const inputClassNames = {
    inputWrapper: "border dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
    input: "bg-transparent",
  }

  return (
    <div className="min-h-full max-h-full">
      {/* ID */}

      <div className="border-b border-divider p-4 flex gap-8 items-center align-middle justify-between">
        {currentRecord ? (
          <div className="hidden md:block">
            <span className="uppercase">id:{" "}</span>
            <span className={`font-semibold ${dirty ? "text-orange-500" : "text-current"}`}>
              {currentRecord.id}
            </span>
          </div>
        ) : <div />}
        <div className="w-full flex justify-start md:hidden">
          <Button
            size="sm"
            title="Explorer"
            onPress={onShowExplorer}
            className="md:hidden"
            isIconOnly
          >
            <HiOutlineMagnifyingGlass className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Tooltip showArrow content="Go to Record ID">
            <Button
              size="sm"
              isIconOnly
              onPress={showJumpToRecordDialog}
            >
              <HiArrowRight className="w-5 h-5" />
            </Button>
          </Tooltip>
          {canDelete && (
            <Tooltip showArrow content="Delete current record">
              <Button
                size="sm"
                isIconOnly
                className="flex md:hidden"
                title="Delete current record"
                isDisabled={currentRecord === null || currentRecord?.id === ""}
                onPress={onDeleteRecordClick}
              >
                <HiOutlineTrash
                  className={cn(
                    currentRecord !== null && currentRecord?.id !== ""
                      ? "cursor-pointer text-red-500"
                      : "text-current", "w-5 h-5"
                  )}
                />
              </Button>
            </Tooltip>
          )}
          <Tooltip showArrow content="Clear Prompt Editor">
            <Button
              size="sm"
              isIconOnly
              onClick={clearPromptEditor}
            >
              <HiXMark className="w-5 h-5" />
            </Button>
          </Tooltip>
          <Tooltip showArrow content="Add chat to History">
            <Button
              size="sm"
              title="Add to history"
              onClick={onAddToHistory}
              isDisabled={!chatMode}
            >
              Add History
            </Button>
          </Tooltip>
          <Tooltip showArrow content="Swith to chat mode">
            <Button
              size="sm"
              color={chatMode ? "primary" : "default"}
              title="Swith to chat mode"
              onClick={onSwithToChatMode}
              className={`cursor-pointer ${chatMode ? "text-white" : ""}`}
              isIconOnly
            >
              <HiOutlineChatBubbleLeftEllipsis className="w-5 h-5" />
            </Button>
          </Tooltip>
        </div>
        <div className="w-auto flex md:hidden justify-end items-end gap-2">
          <Button
            size="sm"
            title="Add new"
            onPress={onAddNewRecord}
            isIconOnly
          >
            <HiOutlineDocumentPlus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
        {!chatMode ? (
          <div className="px-4 py-5 flex flex-col gap-4">
            {/* PROMPT */}
            {currentRecord?.status === 'rejected' && (
              <div className="w-full px-4 py-3.5 bg-rose-100 rounded-lg justify-start items-start gap-2 flex flex-col">
                <div className="self-stretch justify-start items-center gap-2 inline-flex">
                  <div className="w-4 h-4 relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M9.00005 16.2C10.9096 16.2 12.741 15.4414 14.0912 14.0912C15.4415 12.7409 16.2 10.9096 16.2 9C16.2 7.09044 15.4415 5.2591 14.0912 3.90883C12.741 2.55857 10.9096 1.8 9.00005 1.8C7.09049 1.8 5.25914 2.55857 3.90888 3.90883C2.55862 5.2591 1.80005 7.09044 1.80005 9C1.80005 10.9096 2.55862 12.7409 3.90888 14.0912C5.25914 15.4414 7.09049 16.2 9.00005 16.2ZM12.3363 7.8363C12.5003 7.66656 12.591 7.43922 12.589 7.20324C12.5869 6.96727 12.4923 6.74153 12.3254 6.57467C12.1585 6.4078 11.9328 6.31315 11.6968 6.3111C11.4608 6.30905 11.2335 6.39976 11.0637 6.5637L8.10005 9.5274L6.93635 8.3637C6.76661 8.19976 6.53927 8.10905 6.30329 8.1111C6.06731 8.11315 5.84158 8.2078 5.67471 8.37467C5.50784 8.54153 5.41319 8.76727 5.41114 9.00324C5.40909 9.23922 5.49981 9.46656 5.66375 9.6363L7.46375 11.4363C7.63252 11.605 7.8614 11.6998 8.10005 11.6998C8.3387 11.6998 8.56757 11.605 8.73635 11.4363L12.3363 7.8363Z" fill="#C81E1E" />
                    </svg>
                  </div>
                  <div className="grow shrink basis-0 text-red-700 text-base font-semibold leading-normal">Rejected Record </div>
                </div>
                {currentRecord?.meta?.rejectReason && (
                  <div className="text-red-700 text-sm font-normal leading-tight">{currentRecord?.meta?.rejectReason}</div>
                )}
              </div>
            )}

            <div className="">
              <Textarea
                label="Prompt"
                labelPlacement="outside"
                placeholder="Enter your prompt"
                fullWidth
                radius="md"
                variant="flat"
                classNames={inputClassNames}
                value={(currentRecord && currentRecord.prompt) || ""}
                onValueChange={throttledSaveChanges("prompt")}
                onKeyDown={(e) => {
                  // handle Command+enter or Ctrl+enter
                  if (
                    (e.ctrlKey || e.metaKey || e.key === "Meta") &&
                    e.key === "Enter"
                  ) {
                    llmResponseViewDisclosure.onOpen();
                  }
                }}
              />

              <div className="md:hidden flex flex-row gap-4 py-2 justify-end">
                <Button
                  size="sm"
                  onPress={llmResponseViewDisclosure.onOpen}
                  isIconOnly
                  className="md:hidden"
                >
                  <BarsArrowDownIcon width="2em" />
                </Button>
                <Button
                  size="sm"
                  onPress={gptResponseViewDisclosure.onOpen}
                  isIconOnly
                  className="md:hidden"
                >
                  <ChipIcon width="2em" />
                </Button>
              </div>
            </div>

            {/* RESPONSE */}

            <div
              className={`${currentCollection?.meta?.dataType === "rm"
                ? "flex flex-col gap-4 border border-divider rounded-lg py-4 px-4"
                : ""
                }`}
            >
              <Textarea
                label={
                  currentCollection?.meta?.dataType === "rm"
                    ? "Good Output"
                    : "Response"
                }
                labelPlacement="outside"
                placeholder={`Enter AI ${currentCollection?.meta?.dataType === "rm"
                  ? "output for positive"
                  : "response"
                  }`}
                fullWidth
                radius="md"
                variant="flat"
                classNames={inputClassNames}
                value={
                  (currentRecord &&
                    (currentCollection?.meta?.dataType === "rm"
                      ? currentRecord.outputPositive
                      : currentRecord.response)) ||
                  ""
                }
                onValueChange={throttledSaveChanges(
                  currentCollection?.meta?.dataType === "rm"
                    ? "outputPositive"
                    : "response"
                )}
                maxRows={30}
              />

              {currentCollection?.meta?.dataType === "rm" && (
                <Textarea
                  label={"Bad Output"}
                  labelPlacement="outside"
                  placeholder={`Enter AI output for negative`}
                  fullWidth
                  radius="md"
                  variant="flat"
                  classNames={inputClassNames}
                  value={
                    (currentRecord &&
                      (currentCollection?.meta?.dataType === "rm"
                        ? currentRecord.outputNegative
                        : currentRecord.response)) ||
                    ""
                  }
                  onValueChange={throttledSaveChanges("outputNegative")}
                />
              )}
            </div>

            {/* input / CONTEXT */}

            <Textarea
              label="Input (Context)"
              labelPlacement="outside"
              placeholder="Enter input or context"
              fullWidth
              radius="md"
              variant="flat"
              classNames={inputClassNames}
              value={(currentRecord && currentRecord.input) || ""}
              onValueChange={throttledSaveChanges("input")}
              onKeyDown={(e) => {
                // handle Command+enter or Ctrl+enter
                if (
                  (e.ctrlKey || e.metaKey || e.key === "Meta") &&
                  e.key === "Enter"
                ) {
                  llmResponseViewDisclosure.onOpen();
                }
              }}
            />

            {/* HISTORY */}

            <Textarea
              label="History:"
              labelPlacement="outside"
              placeholder={
                "a: input\nb: response\n-----\na: input\nb: response"
              }
              fullWidth
              radius="md"
              variant="flat"
              classNames={inputClassNames}
              value={rawHistory}
              onValueChange={throttledSaveChanges("history")}
            />
          </div>
        ) : (
          <SelectedHistoryContext.Provider value={{ newHistory, setNewHistory }}>
            <ChatModePromptEditor
              initialMessage={`${currentRecord?.prompt || ""}\n${currentRecord?.input || ""
                }`.trim()}
            />
          </SelectedHistoryContext.Provider>
        )}
      </div>

      {currentRecord && (
        <LLMResponseView
          isOpen={llmResponseViewDisclosure.isOpen}
          onOpenChange={llmResponseViewDisclosure.onOpenChange}
          currentRecord={currentRecord}
          onCopy={onCopyLLMResponse}
          mode={currentCollection?.meta?.dataType || "sft"}
          useEmbedding={globalState.useEmbedding}
        />
      )}

      {currentRecord && (
        <GPTResponseView
          isOpen={gptResponseViewDisclosure.isOpen}
          onOpenChange={gptResponseViewDisclosure.onOpenChange}
          currentRecord={currentRecord}
          onCopy={onCopyLLMResponse}
          mode={currentCollection?.meta?.dataType || "sft"}
        />
      )}
    </div>
  );
};

function formatResponse(rec: DataRecord, dataType: string): string {
  let formattedResponse = rec.response;
  if (dataType === "rm") {
    formattedResponse =
      rec.outputPositive + "\n\n----------\n\n" + rec.outputNegative;
  }
  return formattedResponse;
}

export default PromptEditor;
