import { __error } from "@/lib/logger";
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

export interface LLMResponseData {
    target: string;
    text: string;
}

interface Props {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentRecord: DataRecord;
  onCopy: (data:LLMResponseData) => void;
}

const LLMResponseView: FC<Props> = ({
  isOpen,
  onOpenChange,
  currentRecord,
  onCopy
}) => {
  const [data, setData] = useState("");

  useEffect(() => {
    if (isOpen) {
      void stearmResponse();
    }
  }, [isOpen]);

  const stearmResponse = async () => {
    const url = `${process.env.NEXT_PUBLIC_KIAI_API_URL}/v1/chat/completions`;
    const content = currentRecord.prompt || "";
    if (!content) {
      return;
    }
    let query = {
      model: "string",
      messages: [
        {
          role: "system",
          content:
            "kamu adalah Kitab AI atau biasa dipanggil KiAi, kamu bisa memberikan informasi yang bermanfaat",
        },
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.35,
      top_p: 0,
      n: 1,
      max_tokens: 512,
      stream: true,
    };
    const requestOptions: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    };
    const response = await fetch(url, requestOptions);

    const reader = response!
      .body!.pipeThrough(new TextDecoderStream())
      .getReader();

    let dataBuff = "";
    setData("");
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      console.log("Received", value);
      let d:any = {};
      try {
        d = JSON.parse(value.substring(6));
      }catch(e){
        __error("cannot parse response", e);
        __error("response value:", value);
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
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>KiAi Response</ModalHeader>
            <ModalBody>{data}</ModalBody>

            <ModalFooter>
              <Button color="success" onClick={()=>{
                onCopy({target: "good", text: data});
                onClose();
              }}>
                Copy to Good Output
              </Button>
              <Button color="warning" onClick={()=>{
                onCopy({target: "bad", text: data});
                onClose();
              }}>
                Copy to Bad Output
              </Button>
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
