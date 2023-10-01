import { SYSTEM_MESSAGE } from "@/lib/consts";
import { __error } from "@/lib/logger";
import { DataRecord } from "@/types";
import { Button } from "@nextui-org/button";
import { Input, Textarea } from "@nextui-org/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";
import { FC, useEffect, useState } from "react";

export interface LLMResponseData {
  target: string;
  text: string;
}

interface Props {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentRecord: DataRecord;
  onCopy: (data: LLMResponseData) => void;
  mode: string;
}

function getKiaiApiUrl(): string {
  return localStorage.getItem("lamdam.kiaiApiUrl") || "";
}

const LLMResponseView: FC<Props> = ({
  isOpen,
  onOpenChange,
  currentRecord,
  onCopy,
  mode,
}) => {
  const [data, setData] = useState("");
  const [sourceError, setSourceError] = useState(false);
  const [kiaiApiUrl, setKiaiApiUrl] = useState("");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (isOpen) {
      void stearmResponse();
      if (getKiaiApiUrl()) {
        setKiaiApiUrl(getKiaiApiUrl()!);
      }
    }
  }, [isOpen]);

  const stearmResponse = async () => {
    setSourceError(false);
    setData("");

    let url = `${process.env.NEXT_PUBLIC_KIAI_API_URL}/v1/chat/completions`;

    if (getKiaiApiUrl()) {
      url = getKiaiApiUrl()! + "/v1/chat/completions";
    }

    let content = currentRecord.prompt || "";
    if (!content) {
      return;
    }

    if (content.indexOf("---") > -1) {
      const s = content.split("\n");
      setPrompt(s[s.length - 1]);
    } else {
      setPrompt(content);
    }

    const messages = [
      {
        role: "system",
        content: SYSTEM_MESSAGE,
      },
    ];

    if (currentRecord.history) {
      for (let i = 0; i < currentRecord.history.length; i++) {
        const h = currentRecord.history[i];
        messages.push({
          role: "user",
          content: h[0],
        });
        messages.push({
          role: "assistant",
          content: h[1],
        });
      }
    }

    if (currentRecord.input) {
      // content = currentRecord.input + "\n\n---\n" + content;
      content = content + "\n" + currentRecord.input;
    }

    messages.push({
      role: "user",
      content,
    });

    let query = {
      model: "output/Sidrap-7B-v1b",
      messages,
      temperature: 0.01,
      top_p: 0.1,
      n: 1,
      max_tokens: 2000,
      stream: true,
    };
    const requestOptions: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    };
    try {
      const response = await fetch(url, requestOptions);

      const reader = response!
        .body!.pipeThrough(new TextDecoderStream())
        .getReader();

      let dataBuff = "";
      let receivedDataBuff = "";
      let _inData = false;
      setData("");
      readerLoop: while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        console.log("Received", value);
        // if (value.indexOf("data: [DONE]") > -1) {
        //   setData(dataBuff);
        //   break;
        // };
        const values = value.split("\n");
        forLinesLoop: for (let i = 0; i < values.length; i++) {
          const v = values[i].trim();
          if (v === "") continue forLinesLoop;
          if (v === "data: [DONE]") break;
          let d: any = {};
          try {
            if (v.indexOf("data: ") > -1) {
              _inData = true;
              receivedDataBuff = v.replace("data: ", "");
              d = JSON.parse(receivedDataBuff);
            } else {
              if (_inData) {
                receivedDataBuff += v;
                d = JSON.parse(receivedDataBuff);
                _inData = false;
                receivedDataBuff = "";
              } else {
                d = JSON.parse(v);
              }
            }
          } catch (e) {
            if (_inData) {
              continue forLinesLoop;
            }
            __error("cannot parse response", e);
            __error("response v:", v);
            __error("receivedDataBuff:", receivedDataBuff);
            setSourceError(true);
          }
          if (d.choices && d.choices.length > 0) {
            if (d.choices[0].delta.content) {
              dataBuff += d.choices[0].delta.content;
              if (dataBuff) {
                setData(dataBuff);
              }
            }
          }
        }
      }
    } catch (e) {
      __error("error:", e);
      setSourceError(true);
    }
  };

  return (
    <Modal
      size="2xl"
      className="min-h-[450px]"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Kitab-AI Response</ModalHeader>
            <ModalBody>
              {sourceError && (
                <div>
                  <div className="text-red-500">
                    Error: Cannot parse response
                  </div>
                  <Input
                    label="Enter Kitab-AI API url:"
                    value={kiaiApiUrl}
                    onValueChange={(d) => {
                      localStorage.setItem("lamdam.kiaiApiUrl", d);
                      setKiaiApiUrl(d);
                    }}
                    onKeyUp={(e) => {
                      if (e.key === "Enter") {
                        setSourceError(false);
                        void stearmResponse();
                      }
                    }}
                  />
                </div>
              )}
              <div className="font-semibold">{prompt}</div>
              <Textarea minRows={10} maxRows={20} value={data} />
            </ModalBody>

            <ModalFooter>
              {mode === "rm" && (
                <>
                  <Button
                    color="success"
                    onClick={() => {
                      onCopy({ target: "good", text: data });
                      onClose();
                    }}
                  >
                    Copy to Good Output
                  </Button>
                  <Button
                    color="warning"
                    onClick={() => {
                      onCopy({ target: "bad", text: data });
                      onClose();
                    }}
                  >
                    Copy to Bad Output
                  </Button>
                </>
              )}
              {mode === "sft" && (
                <Button
                  color="success"
                  onClick={() => {
                    onCopy({ target: "response", text: data });
                    onClose();
                  }}
                >
                  Use as Response
                </Button>
              )}
              <Button color="danger" variant="light" onClick={onClose}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default LLMResponseView;
