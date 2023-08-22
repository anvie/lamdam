import { CollectionContext, SelectedRecordContext } from "@/lib/context";
import { __debug, __error } from "@/lib/logger";
import { Textarea } from "@nextui-org/input";
import { FC, useContext, useEffect, useState } from "react";
import ArrowRightCircleIcon from "./icon/ArrowRightCircleIcon";
import { Button } from "@nextui-org/button";
import { Confirm, Notify } from "notiflix";
import { get } from "@/lib/FetchWrapper";
import { XMarkCircleIcon } from "./icon/XMarkCircleIcon";
import GoExternalIcon from "./icon/GoExternalIcon";

const PromptEditor: FC = () => {
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);

  const [dirty, setDirty] = useState(false);
  const [rawHistory, setRawHistory] = useState("");

  useEffect(() => {
    if (currentRecord && dirty && !currentRecord.dirty) {
      setDirty(false);
    }
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
        setCurrentRecord({ ...currentRecord, rawHistory: lines.join("\n") });
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
      if (currentRecord) {
        setDirty(true);
        setCurrentRecord &&
          setCurrentRecord({
            ...currentRecord,
            dirty: true,
            [name]: _value,
          });
      } else {
        // recrod belum exists, buatkan
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
          collectionId: currentCollection.id,
          rawHistory: "",
          outputPositive: "",
          outputNegative: "",
          [name]: _value,
        };
        setCurrentRecord && setCurrentRecord(doc);
      }
    };
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
  };

  return (
    <div className="border pb-4">
      {/* ID */}

      <div className="border-b p-4 grid grid-cols-2 items-center align-middle">
        <div>
          id:{" "}
          {currentRecord && (
            <span className={`font-semibold ${dirty ? "text-orange-500" : ""}`}>
              {currentRecord.id}
            </span>
          )}
        </div>
        <div className="ml-3 flex align-middle gap-2">
          <Button size="sm" isIconOnly>
            <ArrowRightCircleIcon
              width="2em"
              className="cursor-pointer"
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
        </div>
      </div>

      {/* PROMPT */}

      <div className="px-4 pt-2">
        <Textarea
          label="Prompt:"
          labelPlacement="outside"
          placeholder="Enter your prompt"
          className="w-full"
          value={(currentRecord && currentRecord.prompt) || ""}
          onValueChange={throttledSaveChanges("prompt")}
        />
      </div>

      {/* RESPONSE */}

      <div
        className={`px-4 ${
          currentCollection?.meta?.dataType === "rm" ? "flex flex-col gap-2 border-2 border-blue-100 m-2 rounded-md pb-2" : ""
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
          value={(currentRecord && (currentCollection?.meta?.dataType === "rm" ? currentRecord.outputPositive : currentRecord.response)) || ""}
          onValueChange={throttledSaveChanges(currentCollection?.meta?.dataType === "rm" ? "outputPositive" : "response")}
        />

        {currentCollection?.meta?.dataType === "rm" && (
          <Textarea
            label={"Bad Output:"}
            labelPlacement="outside"
            placeholder={`Enter AI output for negative`}
            className="w-full"
            value={(currentRecord && (currentCollection?.meta?.dataType === "rm" ? currentRecord.outputNegative : currentRecord.response)) || ""}
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
          label="History: (separated by 2 new lines)"
          labelPlacement="outside"
          placeholder="Enter histories separated by new lines"
          className="w-full"
          value={rawHistory}
          onValueChange={throttledSaveChanges("history")}
        />
      </div>
    </div>
  );
};

export default PromptEditor;
