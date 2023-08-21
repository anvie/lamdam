import { CollectionContext, SelectedRecordContext } from "@/app/page";
import { __debug, __error } from "@/lib/logger";
import { Textarea } from "@nextui-org/input";
import { FC, useContext, useEffect, useState } from "react";

const PromptEditor: FC = () => {
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  const { currentCollection, setCurrentCollection } = useContext(CollectionContext);

  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (currentRecord && dirty && !currentRecord.dirty) {
      setDirty(false);
    }
  }, [currentRecord])

  useEffect(() => {
    if (currentCollection && currentRecord && currentRecord.collectionId != currentCollection.id) {
      setCurrentRecord && setCurrentRecord(null);
    }
  }, [currentCollection])

  const throttledSaveChanges = (name: string) => {
    return (value: string) => {
      if (!currentCollection){
        __error("currentCollection is null");
        return;
      }
      let _value:string | string[] = value;
      if (name == "history"){
        _value = value.split("\n")
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
          [name]: _value
        };
        setCurrentRecord && setCurrentRecord(doc);
      }
    };
  };

  return (
    <div className="border pb-4">
      {/* ID */}

      <div className="border-b p-4">
        id:{" "}
        {currentRecord && (
          <span className={`font-semibold ${dirty ? 'text-orange-500' : ''}`}>{currentRecord.id}</span>
        )}
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

      <div className="px-4">
        <Textarea
          label="Response:"
          labelPlacement="outside"
          placeholder="Enter AI response"
          className="w-full"
          value={(currentRecord && currentRecord.response) || ""}
          onValueChange={throttledSaveChanges("response")}
        />
      </div>

      {/* input / CONTEXT */}

      <div className="px-4">
        <Textarea
          label="input: (context)"
          labelPlacement="outside"
          placeholder="Enter input or context"
          className="w-full"
          value={currentRecord && currentRecord.input || ""}
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
          value={(currentRecord && currentRecord.history.join("\n")) || ""}
          onValueChange={throttledSaveChanges("history")}
        />
      </div>
    </div>
  );
};

export default PromptEditor;
