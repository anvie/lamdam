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
import { Checkbox, cn } from "@nextui-org/react";
import { FC, useEffect, useState } from "react";

const EMBEDDING_INIT_MESSAGE = `Mulai sekarang kamu akan menjawab pertanyaan saya dengan diawali tanda berikut:

1. \`<:a:>\` : Apabila pertanyaan berupa permintaan memberikan definisi seperti: "apa itu dna", "apa isi dari surat xxx?".
2. \`<:s:>\` : Apabila pertanyaan berupa permintaan info/biografi seseorang, contoh: "siapa itu soekarno".
3. \`<:c:>\` : Apabila pertanyaan berupa how-to, contoh: "bagaimana cara memperbaiki ...".
4. \`<:p:>\` : Apabila pertanyaan berupa permintaan pemrograman seperti: "buatkan kode fibonasi menggunakan Python".
5. \`<:t:>\` : Apabila pertanyaan berupa permintaan translasi atau tarkib seperti: "tolong terjemahkan...", "tolong tarkibkan".

Apabila kamu paham, jawab dengan "Siap".`;
const EMBEDDING_INIT_MESSAGE_RESPONSE = "Siap.";

export interface LLMResponseData {
  target: string;
  text: string;
  history?: string[][];
  rag?: string;
}

interface Props {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentRecord: DataRecord;
  onCopy: (data: LLMResponseData) => void;
  mode: string;
  useEmbedding: boolean;
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
  useEmbedding,
}) => {
  const httpReqController = new AbortController();
  const abortSignal = httpReqController.signal;

  const [data, setData] = useState("");
  const [ragContent, setRagContent] = useState("");
  const [extractRag, setExtractRag] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const [kiaiApiUrl, setKiaiApiUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [inStreaming, setInStreaming] = useState(false);

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
      let _content = s[s.length - 1];
      setPrompt(_content);
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

    if (useEmbedding) {
      messages.push({
        role: "user",
        content: EMBEDDING_INIT_MESSAGE,
      });
      messages.push({
        role: "assistant",
        content: "Siap.",
      });
    }

    if (currentRecord.input) {
      // content = currentRecord.input + "\n\n---\n" + content;
      content = content + "\n" + currentRecord.input;
    }

    messages.push({
      role: "user",
      content,
    });

    let query: any = {
      model: "llama-2",
      messages,
      temperature: 0.01,
      top_p: 0.1,
      n: 1,
      max_tokens: 1024,
      stream: true,
    };
    if (useEmbedding) {
      query["embedding_mode"] = "by_flag";
    }
    const requestOptions: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
      keepalive: false,
      signal: abortSignal,
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
      setInStreaming(true);
      readerLoop: while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setInStreaming(false);
          break;
        }
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
            setInStreaming(false);
            setSourceError(true);
          }
          if (d.choices && d.choices.length > 0) {
            const delta = d.choices[0].delta;
            if (delta.role === "rag") {
              setRagContent(delta.content);
              continue;
            }
            if (delta.content) {
              dataBuff += delta.content;
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
    } finally {
      setInStreaming(false);
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
            <ModalHeader>
              {process.env.NEXT_PUBLIC_INTERNAL_MODEL_NAME} Response
            </ModalHeader>
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
              <div className="font-semibold">
                {prompt.length > 160
                  ? prompt.substring(0, 160) + "..."
                  : prompt}
              </div>
              <Textarea minRows={10} maxRows={20} value={data} />
            </ModalBody>

            <ModalFooter className="flex justify-between">
              <div>
                {useEmbedding && (
                  <Checkbox
                    onValueChange={(selected) => {
                      setExtractRag(selected);
                    }}
                  >
                    <span>Extract RAG</span>
                  </Checkbox>
                )}
              </div>
              <div className="flex gap-2">
                {mode === "rm" && (
                  <>
                    <Button
                      color="success"
                      onClick={() => {
                        onCopy({
                          target: "good",
                          text: data,
                          history: [],
                          rag: extractRag ? ragContent : undefined,
                        });
                        onClose();
                      }}
                    >
                      Copy to Good Output
                    </Button>
                    <Button
                      color="warning"
                      onClick={() => {
                        onCopy({
                          target: "bad",
                          text: data,
                          history: [],
                          rag: extractRag ? ragContent : undefined,
                        });
                        onClose();
                      }}
                    >
                      Copy to Bad Output
                    </Button>
                  </>
                )}
                <Button
                  className={cn(!inStreaming ? "bg-gray-400" : "bg-red-500")}
                  disabled={!inStreaming}
                  onClick={() => {
                    httpReqController.abort();
                    console.log("abort");
                  }}
                >
                  Stop
                </Button>
                {mode === "sft" && (
                  <Button
                    color="success"
                    onClick={() => {
                      onCopy({
                        target: "response",
                        text: data,
                        history: useEmbedding
                          ? [
                              [
                                EMBEDDING_INIT_MESSAGE,
                                EMBEDDING_INIT_MESSAGE_RESPONSE,
                              ],
                            ]
                          : undefined,
                        rag: extractRag ? ragContent : undefined,
                      });
                      onClose();
                    }}
                  >
                    Use as Response
                  </Button>
                )}
                <Button color="danger" variant="light" onClick={onClose}>
                  Close
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default LLMResponseView;
