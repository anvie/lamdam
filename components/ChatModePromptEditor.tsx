import { SYSTEM_MESSAGE } from "@/lib/consts";
import {
  QAPair,
  SelectedHistoryContext,
  SelectedRecordContext,
} from "@/lib/context";
import { __debug, __error } from "@/lib/logger";
import { Button } from "@nextui-org/button";
import { Textarea } from "@nextui-org/input";
import moment from "moment";
import { FC, useContext, useEffect, useRef, useState } from "react";

interface Props {
  initialMessage?: string;
}

const ChatModePromptEditor: FC<Props> = ({ initialMessage }) => {
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);

  // const { currentCollection, setCurrentCollection } =
  //   useContext(CollectionContext);

  const [dirty, setDirty] = useState(false);
  const [rawHistory, setRawHistory] = useState("");

  return (
    <div className="border pb-4">
      {/* CHAT BOX */}

      <ChatBox initialMessage={initialMessage} />
    </div>
  );
};

export default ChatModePromptEditor;

function getKiaiApiUrl(): string {
  return localStorage.getItem("lamdam.kiaiApiUrl") || "";
}

function formatDistanceToNow(distance: Date): string {
  return moment(distance).fromNow();
}

type Message = {
  id: number;
  creator: string;
  content: string;
  date: Date;
};

async function sendMessage(
  text: string,
  histories: Message[],
  onData: (message: string, isDone: boolean) => void,
  onError: (e: any) => void
) {
  let url = `${process.env.NEXT_PUBLIC_KIAI_API_URL}/v1/chat/completions`;

  if (getKiaiApiUrl()) {
    url = getKiaiApiUrl()! + "/v1/chat/completions";
  }

  const messages = [
    {
      role: "system",
      content: SYSTEM_MESSAGE,
    },
    {
      role: "user",
      content:
        "Namamu adalah Kitab AI, sebuah kecerdasan buatan yang ditraining menggunakan kitab-kitab pesantren.",
    },
    {
      role: "assistant",
      content: "Terimakasih, nama saya adalah Kitab AI",
    },
  ];

  histories.forEach((h) => {
    messages.push({
      role: h.creator === "me" ? "user" : "assistant",
      content: h.content,
    });
  });

  messages.pop(); // remove last message

  messages.push({
    role: "user",
    content: text,
  });

  let query = {
    model: "output/Sidrap-7B-v1b",
    messages,
    temperature: 0.3,
    top_p: 0.1,
    n: 1,
    max_tokens: 1024,
    frequency_penalty: 0.1,
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

    // let dataBuff = "";
    // let receivedDataBuff = "";
    // let _inData = false;
    // while (true) {
    //   const { value, done } = await reader.read();
    //   if (done) break;
    //   console.log("Received", value);
    //   // if (value.indexOf("data: [DONE]") > -1) {
    //   //   onData(dataBuff, true);
    //   //   break;
    //   // }
    //   const values = value.split("\n");
    //   forLinesLoop: for (let i = 0; i < values.length; i++) {
    //     const v = values[i];
    //     let d: any = {};
    //     try {
    //       if (v.indexOf("data: ") > -1) {
    //         _inData = true;
    //         receivedDataBuff = v.replace("data: ", "");
    //         d = JSON.parse(receivedDataBuff);
    //       } else {
    //         if (_inData) {
    //           receivedDataBuff += v;
    //           d = JSON.parse(receivedDataBuff);
    //           _inData = false;
    //           receivedDataBuff = "";
    //         } else {
    //           d = JSON.parse(v);
    //         }
    //       }
    //     } catch (e) {
    //       if (_inData) {
    //         continue forLinesLoop;
    //       }
    //       __error("cannot parse response", e);
    //       __error("response value:", value);
    //       onError(e);
    //     }
    //     if (d.choices && d.choices.length > 0) {
    //       if (d.choices[0].delta.content) {
    //         dataBuff += d.choices[0].delta.content;
    //         if (dataBuff) {
    //           onData(dataBuff, false);
    //         }
    //       }
    //     }
    //   }
    // }

    let dataBuff = "";
    let receivedDataBuff = "";
    let _inData = false;
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
        if (v === "data: [DONE]") {
          onData(dataBuff, true);
          break readerLoop;
        }
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
          onError(true);
        }
        if (d.choices && d.choices.length > 0) {
          if (d.choices[0].delta.content) {
            dataBuff += d.choices[0].delta.content;
            if (dataBuff) {
              onData(dataBuff, false);
            }
          }
        }
      }
    }
  } catch (e) {
    __error("error:", e);
    onError(e);
  }
}

let GLOBAL_IN_PROCESSING_MESSAGE = false;
let _AUTO_SCROLLER_IVAL: NodeJS.Timer | null = null;

const formatMessageOutput = (message: string) => {
  return message.replaceAll("\n", "<br/>");
};

interface ChatBoxProps {
  initialMessage?: string;
}

const ChatBox: FC<ChatBoxProps> = ({ initialMessage }) => {
  let { newHistory, setNewHistory } = useContext(SelectedHistoryContext);

  const [messagesHistory, setMessagesHistory] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [buffMessage, setBuffMessage] = useState("");
  const [inProcessingMessage, setInProcessingMessage] = useState(false);

  useEffect(() => {
    if (_AUTO_SCROLLER_IVAL !== null) {
      clearInterval(_AUTO_SCROLLER_IVAL);
      _AUTO_SCROLLER_IVAL = null;
    }
    _AUTO_SCROLLER_IVAL = setTimeout(() => {
      __debug("in auto scroller ival");
      const el = document.getElementById("ChatBox");
      if (el) {
        el.scrollTop = el.scrollHeight;
      }

      // finally, set message history context
      updateHistoryContext();
    }, 1000);
    const el = document.getElementById("ChatBox");
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [buffMessage]);

  useEffect(() => {
    if (initialMessage && messagesHistory.length === 0) {
      setInputMessage(initialMessage);
    }
    if (newHistory.length > 0) {
      // setMessagesHistory([]);
      let _messagesHistory: Message[] = [];
      let counter = 1;
      newHistory.forEach((qaPair) => {
        _messagesHistory.push({
          id: Date.now() + ++counter,
          creator: "me",
          content: qaPair.a,
          date: new Date(),
        });
        _messagesHistory.push({
          id: Date.now() + ++counter,
          creator: "Kitab-AI",
          content: qaPair.b,
          date: new Date(),
        });
      });
      setMessagesHistory(_messagesHistory);
    }
  }, [initialMessage, newHistory]);

  const updateHistoryContext = () => {
    __debug("in updateHistoryContext()");
    const result: QAPair[] = messagesHistory
      .reduce((acc: Message[][], curr, idx, src) => {
        if (idx % 2 === 0) acc.push([curr, src[idx + 1]]);
        return acc;
      }, [])
      .map((msgs) => {
        __debug("msgs:", msgs);
        return {
          a: msgs[0].content,
          b: msgs[1].content,
        };
      });
    __debug("result:", result);

    setNewHistory(result);
  };

  const handleSendMessage = () => {
    __debug("in handleSendMessage()");
    if (inputMessage.trim().length == 0) {
      return;
    }
    if (GLOBAL_IN_PROCESSING_MESSAGE) {
      return;
    }
    if (inProcessingMessage) {
      return;
    }
    setInProcessingMessage(true);
    GLOBAL_IN_PROCESSING_MESSAGE = true;

    messagesHistory.push({
      id: Date.now(),
      creator: "me",
      content: inputMessage,
      date: new Date(),
    });
    setMessagesHistory(messagesHistory);

    void sendMessage(
      inputMessage.trim(),
      messagesHistory,
      (message, isDone) => {
        // __debug('message:', message)
        if (!isDone) {
          setBuffMessage(message);
          setInProcessingMessage(false);
          GLOBAL_IN_PROCESSING_MESSAGE = false;
        } else if (isDone) {
          messagesHistory.push({
            id: Date.now(),
            creator: "Kitab-AI",
            content: message,
            date: new Date(),
          });
          setMessagesHistory(messagesHistory);
          setInputMessage("");
          setBuffMessage("");
        }
      },
      (e) => {
        __error("error:", e);
        setInProcessingMessage(false);
        GLOBAL_IN_PROCESSING_MESSAGE = false;
      }
    );

    // set focus to textarea
    inputRef?.current?.focus();
  };

  return (
    <div className="p-4 w-full h-screen">
      <div
        id="ChatBox"
        className="overflow-y-scroll border-2 border-gray-500 rounded p-4 h-[600px]"
      >
        {messagesHistory.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col p-2 rounded mb-2 ${
              message.creator === "Kitab-AI" ? "bg-green-100" : "bg-gray-300"
            }`}
          >
            <span className="dark:text-gray-500 font-semibol">
              {message.creator}:
            </span>
            <p
              className="dark:text-black"
              dangerouslySetInnerHTML={{
                __html: formatMessageOutput(message.content),
              }}
            ></p>
            <span className="text-gray-700 text-sm">
              {formatDistanceToNow(message.date)} ago
            </span>
          </div>
        ))}

        {buffMessage && (
          <div key={0} className="flex flex-col bg-green-100 p-2 rounded mb-2">
            <span className="dark:text-gray-500 font-semibol">Kitab-AI:</span>
            <p
              className="dark:text-black"
              dangerouslySetInnerHTML={{
                __html: formatMessageOutput(buffMessage),
              }}
            ></p>
          </div>
        )}
      </div>
      <div className="mt-4 flex gap-2 justify-between items-start">
        <Textarea
          label="Prompt:"
          labelPlacement="outside"
          placeholder="Enter your prompt"
          className="w-full"
          value={inputMessage}
          onValueChange={setInputMessage}
          ref={inputRef}
          autoFocus
          disabled={inProcessingMessage}
        />
        <Button
          onClick={handleSendMessage}
          onKeyDown={(e) => {
            // on key == space or enter then sendMessage
            if (e.key === "Enter" || e.key === " ") {
              handleSendMessage();
            }
          }}
          className={`${
            !inProcessingMessage ? "bg-green-500" : "bg-gray-500"
          } text-white mt-6`}
          size="lg"
          disabled={inProcessingMessage}
        >
          Send
        </Button>
      </div>
    </div>
  );
};
