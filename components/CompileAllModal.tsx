"use client";
import { get } from "@/lib/FetchWrapper";
import { __debug, __error } from "@/lib/logger";
import { generateRandomString } from "@/lib/stringutil";
import { Collection } from "@/types";
import { Button } from "@nextui-org/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";
import { Checkbox } from "@nextui-org/react";
import { FC, useEffect, useState } from "react";
import { ErrorLabel } from "./ErrorLabel";
import LoadingCompilation from "./LoadingCompilation";
import CheckCircleIcon from "./icon/CheckCircleIcon";

const CompileAllModal: FC<any> = ({
  isCompileAllModalOpen,
  onCompileAllModal,
  onCompileAllModalOpenChange,
}) => {
  const [error, setError] = useState<string | null>(null);
  //   const { data: session } = useSession();
  const [cols, setCols] = useState<Collection[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [processingState, setProcessingState] = useState<string[]>([]);
  const [doneState, setDoneState] = useState<string[]>([]);

  useEffect(() => {
    __debug("isCompileAllModalOpen:", isCompileAllModalOpen);
    get("/api/collections")
      .then((data) => {
        __debug("data:", data);
        setCols(data.result);
      })
      .catch((error) => {
        __error("Cannot get collections.", error);
      });

    const _selected = localStorage.getItem("selectedCollections");
    if (_selected) {
      setSelected(JSON.parse(_selected));
    }
  }, []);

  useEffect(() => {
    // save to local storage
    localStorage.setItem("selectedCollections", JSON.stringify(selected));
  }, [selected]);

  const _processingState: string[] = [];
  const _doneState: string[] = [];

  const onSubmit = (onClose: any) => {
    return async () => {
      setError("");
      //   __debug("selected:", selected);

      // generate random id
      const batchId = generateRandomString(16);
      let data = {
        batchId,
        ids: selected,
      };

      const requestOptions: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
      const response = await fetch(
        "/api/compileCollectionBatch",
        requestOptions
      );

      const reader = response!
        .body!.pipeThrough(new TextDecoderStream())
        .getReader();

      let ctx = {
        setData: (data: { state: string; col: string }) => {
          __debug("in ctx.setData:", data);
          const colId = data.col;
          if (data.state === "processing") {
            _processingState.push(colId);
            setProcessingState([..._processingState, colId]);
          }
          if (data.state === "done") {
            // setProcessingState(processingState.filter((id) => id !== colId));
            // const _newList = JSON.parse(JSON.stringify(doneState));
            // _newList.push(colId);
            _doneState.push(colId);
            setDoneState([..._doneState, colId]);
          }
        },
        setSourceError: (error: boolean) => {},
        inData: false,
        dataBuff: "",
      };
      readerLoop: while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        // console.log("Received", value);
        handleStreamData(value, ctx);
      }
    };
  };

  const onItemSelected = (colId: string, isSelected: boolean) => {
    __debug("onItemSelected:", colId, isSelected);
    if (isSelected) {
      // add to list
      // deduplicate
      if (selected.includes(colId)) {
        return;
      }
      setSelected([...selected, colId]);
    } else {
      // remove from list
      setSelected(selected.filter((id) => id !== colId));
    }
  };

  return (
    <Modal
      isOpen={isCompileAllModalOpen}
      onOpenChange={onCompileAllModalOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Compile all datasets
            </ModalHeader>
            <ModalBody>
              {error && <ErrorLabel message={error} />}

              <div>Please choose datasets to compile:</div>
              <div className="flex flex-col gap-3 max-h-[500px] min-h-[300px] p-4 border-1 overflow-scroll w-full">
                {cols.map((col) => (
                  <div
                    key={col.id}
                    className="flex w-full items-center justify-between content-between border-b-1 border-b-gray-700 pb-2"
                  >
                    <div>
                      <Checkbox
                        onValueChange={(selected) =>
                          onItemSelected(col.id, selected)
                        }
                        checked={selected.includes(col.id)}
                        isSelected={selected.includes(col.id)}
                        className="w-full"
                      >
                        <div>{col.name}</div>
                      </Checkbox>
                    </div>

                    <div>
                      {!doneState.includes(col.id) &&
                        processingState.includes(col.id) && (
                          <LoadingCompilation />
                        )}
                      {doneState.includes(col.id) && (
                        <CheckCircleIcon
                          className="text-green-600"
                          width="1.2em"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onClick={onClose}>
                Cancel
              </Button>
              <Button color="primary" onPress={onSubmit(onClose)}>
                Compile All
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

function handleStreamData(value: any, ctx: any) {
  const values = value.split("\n");
  let receivedDataBuff = "";
  forLinesLoop: for (let i = 0; i < values.length; i++) {
    const v = values[i].trim();
    if (v === "") continue forLinesLoop;
    if (v === "data: [DONE]") break;
    let d: any = {};
    try {
      if (v.indexOf("data: ") > -1) {
        ctx.inData = true;
        receivedDataBuff = v.replace("data: ", "");
        d = JSON.parse(receivedDataBuff);
      } else {
        if (ctx.inData) {
          receivedDataBuff += v;
          d = JSON.parse(receivedDataBuff);
          ctx.inData = false;
          receivedDataBuff = "";
        } else {
          d = JSON.parse(v);
        }
      }
    } catch (e) {
      if (ctx.inData) {
        continue forLinesLoop;
      }
      __error("cannot parse response", e);
      __error("response v:", v);
      __error("receivedDataBuff:", receivedDataBuff);
      ctx.setSourceError(true);
    }
    // if (d.choices && d.choices.length > 0) {
    //   if (d.choices[0].delta.content) {
    //     ctx.dataBuff += d.choices[0].delta.content;
    //     if (ctx.dataBuff) {
    //       ctx.setData(ctx.dataBuff);
    //     }
    //   }
    // }

    ctx.setData(d);
  }
}

export default CompileAllModal;
