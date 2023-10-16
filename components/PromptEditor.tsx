import { get } from "@/lib/FetchWrapper";
import {
  CollectionContext,
  GlobalContext,
  QAPair,
  SelectedHistoryContext,
  SelectedRecordContext,
} from "@/lib/context";
import { __debug, __error } from "@/lib/logger";
import { DataRecord } from "@/types";
import { Button } from "@nextui-org/button";
import { Textarea } from "@nextui-org/input";
import { Divider, useDisclosure } from "@nextui-org/react";
import { Confirm, Notify } from "notiflix";
import { FC, useContext, useEffect, useState } from "react";
import ChatModePromptEditor from "./ChatModePromptEditor";
import GPTResponseView from "./GPTResponseView";
import LLMResponseView, { LLMResponseData } from "./LLMResponseView";
import { AnnotationIcon } from "./icon/AnnotationIcon";
import ArrowRightCircleIcon from "./icon/ArrowRightCircleIcon";
import { BarsArrowDownIcon } from "./icon/BarsArrowDownIcon";
import ChipIcon from "./icon/ChipIcon";
import { ClipboardIcon } from "./icon/ClipboardIcon";
import { DocumentPlus } from "./icon/DocumentPlus";
import { XMarkCircleIcon } from "./icon/XMarkCircleIcon";
import { SearchIcon } from "./icons";

// function formatResponse(rec: DataRecord, dataType: string): string {
//   let formattedResponse = rec.response;
//   if (dataType === "rm") {
//     formattedResponse =
//       rec.outputPositive + "\n\n----------\n\n" + rec.outputNegative;
//   }
//   return formattedResponse;
// }

const PromptEditor: FC = () => {
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  let { globalState, setGlobalState } = useContext(GlobalContext);
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);
  const {
    isOpen: llmResponseModalVisible,
    onOpen: onLlmResponseModalOpen,
    onOpenChange: onLlmResponseModalChange,
  } = useDisclosure();
  const {
    isOpen: gptResponseModalVisible,
    onOpen: onGptResponseModalOpen,
    onOpenChange: onGptResponseModalChange,
  } = useDisclosure();

  const [newHistory, setNewHistory] = useState<QAPair[]>([]);

  const [dirty, setDirty] = useState(false);
  const [rawHistory, setRawHistory] = useState("");
  const [chatMode, setChatMode] = useState(false);

  useEffect(() => {
    if (currentRecord && dirty && !currentRecord.dirty) {
      setDirty(false);
    }
    // __debug("PromptEditor.currentRecord:", currentRecord);
    if (currentRecord && currentRecord.rawHistory != rawHistory) {
      let lines = [];
      for (let i = 0; i < currentRecord.history.length; i++) {
        const item = currentRecord.history[i];
        __debug("item:", item);
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
        newResponse = `${value}\n\n----------\n\n${
          currentRecord?.outputNegative || ""
        }`;
      }
      if (name === "outputNegative") {
        newResponse = `${
          currentRecord?.outputPositive || ""
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
        get(`/api/getRecord?id=${answer}&collectionId=${currentCollection.id}`)
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
    setGlobalState && setGlobalState({ ...globalState, showExplorer: true });
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

  return (
    <div className="border pb-4">
      {/* ID */}

      <div className="border-b p-4 flex gap-8 items-center align-middle justify-between">
        <div className="hidden md:block">
          id:{" "}
          {currentRecord && (
            <span className={`font-semibold ${dirty ? "text-orange-500" : ""}`}>
              {currentRecord.id}
            </span>
          )}
        </div>
        <div className="w-full flex justify-start md:hidden">
          <Button
            size="sm"
            title="Explorer"
            onClick={onShowExplorer}
            className="md:hidden cursor-pointer"
            isIconOnly
          >
            <SearchIcon width="2em" />
          </Button>
        </div>
        <div className="ml-3 flex gap-4">
          <Button size="sm" isIconOnly className="hidden md:block">
            <ArrowRightCircleIcon
              width="2em"
              className="cursor-pointer ml-1"
              onClick={showJumpToRecordDialog}
            />
          </Button>
          <Button size="sm" isIconOnly>
            <XMarkCircleIcon
              width="2em"
              className="cursor-pointer"
              onClick={clearPromptEditor}
            />
          </Button>
          <Divider orientation="vertical" />
          <Button
            size="sm"
            title="Add to history"
            onClick={onAddToHistory}
            isIconOnly
            className={`cursor-pointer`}
          >
            <ClipboardIcon width="2em" />
          </Button>
          <Divider orientation="vertical" />
          <Button
            size="sm"
            color={chatMode ? "primary" : "default"}
            title="Swith to chat mode"
            onClick={onSwithToChatMode}
            className={`cursor-pointer ${chatMode ? "text-white" : ""}`}
            isIconOnly
          >
            <AnnotationIcon width="2em" />
          </Button>
          <Divider orientation="vertical" />
        </div>
        <div className="w-auto flex justify-end items-end md:hidden gap-2">
          <Button
            size="sm"
            title="Add new"
            onClick={onAddNewRecord}
            className="md:hidden cursor-pointer"
            isIconOnly
          >
            <DocumentPlus width="2em" />
          </Button>
        </div>
      </div>

      {!chatMode ? (
        <div>
          {/* PROMPT */}

          <div className="px-4 pt-2">
            <Textarea
              label="Prompt:"
              labelPlacement="outside"
              placeholder="Enter your prompt"
              className="w-full"
              value={(currentRecord && currentRecord.prompt) || ""}
              onValueChange={throttledSaveChanges("prompt")}
              onKeyDown={(e) => {
                // handle Command+enter or Ctrl+enter
                if (
                  (e.ctrlKey || e.metaKey || e.key === "Meta") &&
                  e.key === "Enter"
                ) {
                  onLlmResponseModalOpen();
                }
              }}
            />

            <div className="md:hidden flex flex-row gap-4 py-2 justify-end">
              <Button
                size="sm"
                onClick={onLlmResponseModalOpen}
                isIconOnly
                className="md:hidden"
              >
                <BarsArrowDownIcon width="2em" />
              </Button>
              <Button
                size="sm"
                onClick={onGptResponseModalOpen}
                isIconOnly
                className="md:hidden"
              >
                <ChipIcon width="2em" />
              </Button>
            </div>
          </div>

          {/* RESPONSE */}

          <div
            className={`px-4 ${
              currentCollection?.meta?.dataType === "rm"
                ? "flex flex-col gap-2 border-2 border-blue-100 m-2 rounded-md pb-2"
                : ""
            }`}
          >
            <Textarea
              label={
                currentCollection?.meta?.dataType === "rm"
                  ? "Good Output:"
                  : "Response:"
              }
              labelPlacement="outside"
              placeholder={`Enter AI ${
                currentCollection?.meta?.dataType === "rm"
                  ? "output for positive"
                  : "response"
              }`}
              className="w-full"
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
                label={"Bad Output:"}
                labelPlacement="outside"
                placeholder={`Enter AI output for negative`}
                className="w-full"
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

          <div className="px-4">
            <Textarea
              label="input: (context)"
              labelPlacement="outside"
              placeholder="Enter input or context"
              className="w-full"
              value={(currentRecord && currentRecord.input) || ""}
              onValueChange={throttledSaveChanges("input")}
            />
          </div>

          {/* HISTORY */}

          <div className="px-4">
            <Textarea
              label="History:"
              labelPlacement="outside"
              placeholder={
                "a: input\nb: response\n-----\na: input\nb: response"
              }
              className="w-full"
              value={rawHistory}
              onValueChange={throttledSaveChanges("history")}
            />
          </div>
        </div>
      ) : (
        <SelectedHistoryContext.Provider value={{ newHistory, setNewHistory }}>
          <ChatModePromptEditor
            initialMessage={`${currentRecord?.prompt || ""}\n${
              currentRecord?.input || ""
            }`.trim()}
          />
        </SelectedHistoryContext.Provider>
      )}

      {currentRecord && (
        <LLMResponseView
          isOpen={llmResponseModalVisible}
          onOpenChange={onLlmResponseModalChange}
          currentRecord={currentRecord}
          onCopy={onCopyLLMResponse}
          mode={currentCollection?.meta?.dataType || "sft"}
        />
      )}

      {currentRecord && (
        <GPTResponseView
          isOpen={gptResponseModalVisible}
          onOpenChange={onGptResponseModalChange}
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
