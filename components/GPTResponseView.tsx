import { __debug, __error } from "@/lib/logger";
import { DataRecord } from "@/types";
import { Button } from "@nextui-org/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";
import { FC, useEffect, useState } from "react";
import { Input, Textarea } from "@nextui-org/input";

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

function getopenaiApiUrl(): string {
  return localStorage.getItem("lamdam.openAiApiUrl") || "";
}

const GPTResponseView: FC<Props> = ({
  isOpen,
  onOpenChange,
  currentRecord,
  onCopy,
  mode,
}) => {
  const [data, setData] = useState("");
  const [sourceError, setSourceError] = useState(false);
  const [apiKeyNotFound, setAPIKeyNotFound] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiApiUrl, setopenaiApiUrl] = useState("");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (isOpen) {
      void stearmResponse();
      if (getopenaiApiUrl()) {
        setopenaiApiUrl(getopenaiApiUrl()!);
      }
    }
  }, [isOpen]);

  const stearmResponse = async () => {
    setSourceError(false);
    setAPIKeyNotFound(false);
    setData("");

    let url = `https://api.openai.com/v1/chat/completions`;

    if (getopenaiApiUrl()) {
      url = getopenaiApiUrl()! + "/v1/chat/completions";
    }

    const _openaiApiKey = localStorage.getItem("openai.apiKey") || "";

    if (!_openaiApiKey) {
      __error("openai.apiKey not set");
      setAPIKeyNotFound(true);
      return;
    }

    let content = currentRecord.prompt || "";
    if (!content) {
      return;
    }

    if (content.indexOf("---") > -1) {
      const s = content.split("\n")
      setPrompt(s[s.length-1]);
    }else{
      setPrompt(content);
    }

    const messages = [
      {
        role: "system",
        content:
          "Kamu adalah Kitab AI atau biasa dipanggil KiAi, kamu bisa memberikan informasi yang bermanfaat",
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
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.6,
      top_p: 0,
      n: 1,
      max_tokens: 1024,
      stream: true,
    };
    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer sk-${_openaiApiKey}`,
      },
      body: JSON.stringify(query),
    };
    try {
      const response = await fetch(url, requestOptions);

      const reader = response!
        .body!.pipeThrough(new TextDecoderStream())
        .getReader();

      let dataBuff = "";
      setData("");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        console.log("Received:", value);
        if (value.indexOf("data: [DONE]") > -1) break;
        if (value.indexOf("\"error\"") > -1){
          if (value.indexOf("\"invalid_api_key\"") > -1){
            setAPIKeyNotFound(true);
          }
          break;
        }
        const values = value.split("\n");
        for (let i = 0; i < values.length; i++) {
          const v = values[i];
          let d: any = {};
          try {
            if (v.indexOf("data: ") > -1) {
              d = JSON.parse(v.replace("data: ", ""));
            }
          } catch (e) {
            __error("cannot parse response", e);
            __error("response value:", value);
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
    <Modal size="2xl" isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>GPT Response</ModalHeader>
            <ModalBody>
              {sourceError && (
                <div>
                  <div className="text-red-500">
                    Error: Cannot parse response
                  </div>
                  <Input
                    label="Enter GPT API url:"
                    value={openaiApiUrl}
                    onValueChange={(d) => {
                      localStorage.setItem("lamdam.openaiApiUrl", d);
                      setopenaiApiUrl(d);
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
              {apiKeyNotFound && (
                <div>
                  <div className="text-red-500">
                    Error: openai API key not found
                  </div>
                  <Input
                    label="Your Openai API key"
                    value={openaiApiKey}
                    onValueChange={(d) => {
                      let apiKey = d.trim();
                      if (d.startsWith("sk-")){
                        apiKey = d.replace("sk-", "");
                      }
                      localStorage.setItem("openai.apiKey", apiKey);
                      setOpenaiApiKey(d.trim());
                    }}
                    onKeyUp={(e) => {
                      __debug('e:', e)
                      if (e.key === "Enter") {
                        if ((e.target as any).value.length > 0){
                          setAPIKeyNotFound(false);
                          void stearmResponse();
                        }
                      }
                    }}
                  />
                </div>
              )}
              <div className="font-semibold">{prompt}</div>
              <Textarea value={data} />
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

export default GPTResponseView;
