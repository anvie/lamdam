"use client";

import { get, post } from "@/lib/FetchWrapper"
import {
  CollectionContext,
  GlobalContext,
  SelectedRecordContext,
} from "@/lib/context"
import { errorMessage } from "@/lib/errorutil"
import { __debug, __error } from "@/lib/logger"
import { AddRecordSchema } from "@/lib/schema"
import { DisclosureType } from "@/lib/types"
import { RecordStatusType } from "@/models"
import { Collection, DataRecord } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@nextui-org/button"
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/dropdown"
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/modal"
import { Checkbox } from "@nextui-org/react"
import { useSession } from "next-auth/react"
import { Confirm } from "notiflix/build/notiflix-confirm-aio"
import { Notify } from "notiflix/build/notiflix-notify-aio"
import { FC, Key, useContext, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { HiArrowRightOnRectangle, HiOutlineCheck, HiOutlineDocumentCheck, HiOutlineDocumentPlus, HiOutlineTrash, HiXMark } from "react-icons/hi2"
import { ErrorLabel } from "./ErrorLabel"
import { useModal } from "./hooks/useModal"
import RejectReasonModal from "./modals/RejectReasonModal"

function compileHistory(rawHistory: string): string[][] {
  if (!rawHistory || rawHistory == null || rawHistory.trim() === "") {
    return [];
  }
  let compiledHistory: string[][] = [];
  if (rawHistory) {
    const lines = rawHistory.trim().split("\n");
    let user = [];
    let ai = [];
    let inA = false;
    let inB = false;
    for (let line of lines) {
      if (line.startsWith("-----")) {
        inA = false;
        inB = false;
      }
      if (line.startsWith("a:")) {
        user.push(line.replace(/^a: +?/, ""));
        inA = true;
        inB = false;
      } else if (line.startsWith("b:")) {
        ai.push(line.replace(/^b: +?/, ""));
        inB = true;
        inA = false;
      } else if (inA) {
        // append to user's last line
        user[user.length - 1] += "\n" + line;
      } else if (inB) {
        // append to ai's last line
        ai[ai.length - 1] += "\n" + line;
      }
    }
    if (user.length !== ai.length) {
      __debug("user:", user);
      __debug("ai:", ai);
      throw new Error("History is not valid. a and b length is not equal.");
    }
    // zip the user and ai into one list
    for (let i = 0; i < user.length; i++) {
      compiledHistory.push([user[i], ai[i]]);
    }
    __debug("compiledHistory:", compiledHistory);
  }
  return compiledHistory;
}

function formatResponse(rec: DataRecord, dataType: string): string {
  let formattedResponse = rec.response;
  if (dataType === "rm") {
    formattedResponse =
      rec.outputPositive + "\n\n----------\n\n" + rec.outputNegative;
  }
  return formattedResponse;
}

interface RecordOpsProps {
  className: string;
  llmResponseViewDisclosure: DisclosureType;
  gptResponseViewDisclosure: DisclosureType;
}

const RecordOps: FC<RecordOpsProps> = ({
  className,
  llmResponseViewDisclosure,
  gptResponseViewDisclosure,
}) => {
  const [error, setError] = useState("");
  let { globalState, setGlobalState } = useContext(GlobalContext);
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  const modalState = useDisclosure();
  const [useEmbedding, setUseEmbedding] = useState(false);
  const modal = useModal()

  const session = useSession()
  const user = session.data?.user

  const basicRole = ["contributor", "annotator"].includes(user?.role!) || typeof user?.role === 'undefined';

  const canUpdate = (basicRole && currentRecord?.creatorId === user?.id && currentRecord?.status!='approved') || !basicRole

  const canReview = ["superuser", "corrector"].includes(user?.role!) && currentRecord?.status === "pending"
  const canDelete = (user?.role === "superuser" || currentRecord?.creatorId === user?.id) && currentRecord !== null && currentRecord?.status === 'pending';
  const canMoveRecord = ["superuser", "corrector"].includes(user?.role!) || currentRecord?.creatorId === user?.id

  const [enableOps, setEnableOps] = useState(false);
  // const {
  //   isOpen: llmResponseModalVisible,
  //   onOpen: onLlmResponseModalOpen,
  //   onOpenChange: onLlmResponseModalChange,
  // } = useDisclosure();
  // const {
  //   isOpen: gptResponseModalVisible,
  //   onOpen: onGptResponseModalOpen,
  //   onOpenChange: onGptResponseModalChange,
  // } = useDisclosure();

  useEffect(() => {
    Notify.init({ position: "center-top" });
  }, []);

  useEffect(() => {
    setEnableOps(currentRecord !== null && currentRecord.id !== "");
  }, [currentRecord]);

  // Effect ini digunakan untuk memproses operasi `add record` yg di-trigger dari
  // komponen lain seperti PromptEditor.
  useEffect(() => {
    if (globalState.addNewRecord === true) {
      globalState.addNewRecord = false;
      setGlobalState({ ...globalState, addNewRecord: false });
      setTimeout(() => {
        doAddRecord();
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalState]);

  const doAddRecord = () => {
    setError("");

    if (!currentRecord) {
      alert("Please specify record first");
      return;
    }
    const rec: DataRecord = currentRecord!;

    const formattedResponse = formatResponse(
      rec,
      currentCollection?.meta?.dataType || "sft"
    );
    // __debug("formattedResponse:", formattedResponse);

    post("/api/addRecord", {
      prompt: rec.prompt,
      response: formattedResponse,
      input: rec.input,
      history: compileHistory(rec.rawHistory),
      collectionId: currentCollection!.id,
      outputPositive: rec.outputPositive,
      outputNegative: rec.outputNegative,
    })
      .then((data) => {
        const doc = data.result as DataRecord;
        // __debug("doc:", doc);
        setCurrentRecord!(doc);
        setGlobalState({
          ...globalState,
          newRecord: doc,
        });
        Notify.success("Record added successfully", {
          position: "center-top",
        });
      })
      .catch((err) => {
        if (err) {
          console.log(err);
          Notify.failure("Cannot add record: " + errorMessage(err));
        }
      });
  };

  const onAddClick = () => {
    if (currentRecord && currentRecord.id != "") {
      // apabila sudah exists, kasih konfirmasi apakah mau buat duplikat dari current record?
      modalState.onOpen();
    } else {
      doAddRecord();
    }
  };

  const onUpdateClick = () => {
    setError("");

    if (!currentRecord) {
      alert("Please specify record first");
      return;
    }
    const rec: DataRecord = currentRecord!;

    if (!rec.id) {
      alert("Please specify record first");
      return;
    }

    let compiledHistory: string[][] = compileHistory(rec.rawHistory);
    const formattedResponse = formatResponse(
      rec,
      currentCollection?.meta?.dataType || "sft"
    );

    post("/api/updateRecord", {
      id: rec.id,
      prompt: rec.prompt,
      input: rec.input,
      response: formattedResponse,
      history: compiledHistory,
      collectionId: currentCollection!.id,
    })
      .then((data) => {
        const doc = currentRecord!;
        doc.dirty = false;
        const updatedRecord: DataRecord = {
          ...doc,
          prompt: rec.prompt,
          response: formattedResponse,
          input: rec.input,
          history: compiledHistory,
          collectionId: rec.collectionId,
          outputPositive: rec.outputPositive,
          outputNegative: rec.outputNegative,
          dirty: false,
          status: 'pending'
        };
        setCurrentRecord!(updatedRecord);
        setGlobalState({
          ...globalState,
          updatedRecord,
        });
        Notify.success("Record has been updated", {
          position: "center-top",
        });
      })
      .catch((err) => {
        if (err) {
          __error(typeof err);
          alert("Cannot update record :(. " + errorMessage(err));
        }
      });
  };

  const onDeleteClick = () => {
    setError("");

    if (!currentRecord) {
      alert("Please specify record first");
      return;
    }

    const rec: DataRecord = currentRecord!;

    if (!rec.id) {
      alert("Please specify record first");
      return;
    }

    Confirm.show(
      "Confirmation",
      `Are you sure you want to delete record "${rec.prompt}"?`,
      "Yes",
      "No",
      () => {
        post("/api/deleteRecord", {
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

  const onSetStatusClick = (status: RecordStatusType) => {
    setError("");

    if (!currentRecord) {
      alert("Please specify record first");
      return;
    }

    const rec: DataRecord = currentRecord!;

    if (!rec.id) {
      alert("Please specify record first");
      return;
    }

    const onStatusChange = async (data: any) => {
      return await post(`/api/records/${rec.id}/changeStatus`, data)
        .then((data) => {
          __debug("data:", data);
          const doc = currentRecord!;
          doc.dirty = false;
          const updatedRecord = {
            ...doc,
            status,
            meta: {
              rejectReason: data.rejectReason,
            }
          };
          setCurrentRecord!(updatedRecord);
          setGlobalState({
            ...globalState,
            updatedRecord,
          });
          Notify.success(`Record has been ${status}`);
        })
        .catch((err) => {
          if (err) {
            __error(typeof err);
            Notify.failure("Cannot update record :(. " + errorMessage(err));
          }
        })
    }

    if (status === 'rejected') {
      modal.showModal('Reject Reason', RejectReasonModal, {
        size: 'xl',
        onSubmit: (rejectReason) => onStatusChange({
          status,
          collectionId: currentCollection?.id,
          rejectReason,
        }),
      })
    } else {
      Confirm.show(
        "Confirmation",
        `Are you sure you want to mark this record as ${status} "${rec.prompt}"?`,
        "Yes",
        "No",
        () => onStatusChange({
          status,
          collectionId: currentCollection?.id,
        })
      );
    }
  }

  // const onCopyLLMResponse = (data: LLMResponseData) => {
  //   console.log("data:", data);
  //   if (currentRecord) {
  //     const rec = currentRecord;

  //     if (data.target === "bad") {
  //       rec.outputNegative = data.text;
  //     } else if (data.target === "good") {
  //       rec.outputPositive = data.text;
  //     } else if (data.target === "response") {
  //       rec.response = data.text;
  //     }
  //     if (data.history.length > 0) {
  //       const _rawHistory = data.history
  //         .map((d: string[]) => `a: ${d[0]}\nb: ${d[1]}`)
  //         .join("\n-----\n");
  //       rec.history = data.history;
  //       rec.rawHistory = _rawHistory;
  //     }

  //     const formattedResponse = formatResponse(
  //       rec,
  //       currentCollection?.meta?.dataType || "sft"
  //     );

  //     setCurrentRecord!({
  //       ...rec,
  //       response: formattedResponse,
  //     });
  //   }
  // };

  return (
    <div className={className}>
      <div className="flex flex-col items-start justify-start divide-y divide-divider">
        <div className="px-4 py-5 flex flex-col self-stretch items-start justify-start gap-3">
          {error && <ErrorLabel message={error} />}
          <Button
            size="lg"
            radius="md"
            variant="bordered"
            startContent={<HiOutlineDocumentPlus className="w-6 h-6" />}
            onClick={onAddClick}
            fullWidth
          >
            Add New Record
          </Button>
          <Button
            size="lg"
            radius="md"
            variant="bordered"
            isDisabled={!enableOps || !canUpdate}
            startContent={<HiOutlineDocumentCheck className="w-6 h-6" />}
            fullWidth
            onClick={onUpdateClick}
          >
            Update Record
          </Button>

          <MoveRecordButton
            disabled={!enableOps || !canMoveRecord}
            currentRecord={currentRecord}
            onMoveSuccess={() => {
              setGlobalState({
                ...globalState,
                deleteRecord: currentRecord,
              });
              setCurrentRecord!(null);
            }}
          />
        </div>

        <div className="px-4 py-5 flex flex-col self-stretch items-start justify-start gap-3">
          <Button size="lg" radius="md" color="primary" fullWidth onClick={llmResponseViewDisclosure.onOpen}>
            Get {process.env.NEXT_PUBLIC_INTERNAL_MODEL_NAME} Response
          </Button>
          <Button size="lg" radius="md" color="primary" fullWidth onClick={gptResponseViewDisclosure.onOpen}>
            Get GPT Response
          </Button>
          <Checkbox
            onValueChange={(selected) => {
              setUseEmbedding(selected);
              setGlobalState({
                ...globalState,
                useEmbedding: selected,
              });
            }}
          >
            <span>Use Embedding</span>
          </Checkbox>
        </div>

        {canDelete && (
          <div className="px-4 py-5 flex flex-col self-stretch items-start justify-start gap-3">
            <Button
              size="lg"
              radius="md"
              variant="bordered"
              fullWidth
              color="danger"
              startContent={<HiOutlineTrash className="w-6 h-6" />}
              isDisabled={
                !enableOps || currentRecord === null || currentRecord?.id === ""
              }
              onClick={onDeleteClick}
              title="Delete current record"
            >
              Delete Record
            </Button>
          </div>
        )}

        {canReview && (
          <div className="px-4 py-5 flex flex-col self-stretch items-start justify-start gap-3">
            <Button
              size="lg"
              radius="md"
              fullWidth
              color="success"
              startContent={<HiOutlineCheck className="w-6 h-6 border-1.5 rounded-md p-0.5" />}
              isDisabled={
                !enableOps || currentRecord === null || currentRecord?.id === ""
              }
              title="Approve current record"
              onPress={() => onSetStatusClick('approved')}
            >
              Approve Record
            </Button>
            <Button
              size="lg"
              radius="md"
              fullWidth
              color="danger"
              startContent={<HiXMark className="w-6 h-6 border-1.5 rounded-md p-0.5" />}
              isDisabled={
                !enableOps || currentRecord === null || currentRecord?.id === ""
              }
              title="Reject current record"
              onPress={() => onSetStatusClick('rejected')}
            >
              Reject Record
            </Button>
          </div>
        )}
      </div>

      {currentCollection && (
        <ConfirmModal onConfirm={doAddRecord} {...modalState} />
      )}
      {/* 
      {currentRecord && (
        <LLMResponseView
          isOpen={llmResponseModalVisible}
          onOpenChange={onLlmResponseModalChange}
          currentRecord={currentRecord}
          onCopy={onCopyLLMResponse}
          mode={currentCollection?.meta?.dataType || "sft"}
          useEmbedding={useEmbedding}
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
      )} */}
    </div>
  );
};

export default RecordOps;

const MoveRecordButton: FC<{
  disabled: boolean;
  currentRecord: DataRecord | null;
  onMoveSuccess: () => void;
}> = ({ disabled, currentRecord, onMoveSuccess }) => {
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);
  const [data, setData] = useState<Collection[]>([]);
  useEffect(() => {
    get("/api/collections")
      .then((data) => {
        let cols = data.result;

        if (currentCollection) {
          cols = cols.filter((col: any) => col.id !== currentCollection.id);
        }

        setData(cols);
      })
      .catch((error) => {
        __error("Cannot get collections.", error);
      });
  }, [currentCollection]);

  const onAction = (key: Key) => {
    if (!currentRecord) {
      return;
    }

    post("/api/moveRecord", {
      id: currentRecord.id,
      colSrcId: currentCollection?.id,
      colDstId: key as string,
    })
      .then((response) => {
        onMoveSuccess();
        Notify.success("Move record success");
      })
      .catch((err) => {
        __error("Cannot move record.", err);
        Notify.failure("Cannot move record");
      });
  };

  return (
    <Dropdown>
      <DropdownTrigger disabled={disabled}>
        <Button
          variant="bordered"
          size="lg"
          radius="md"
          fullWidth
          startContent={<HiArrowRightOnRectangle className="w-6 h-6" />}
          isDisabled={disabled}
        >
          Move Record to
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Static Actions"
        disabledKeys={disabled ? data.map((d) => d.id) : []}
        onAction={onAction}
      >
        {data.map((col) => {
          return <DropdownItem key={col.id}>{col.name}</DropdownItem>;
        })}
        {/* <DropdownItem key="copy">Copy link</DropdownItem>
        <DropdownItem key="edit">Edit file</DropdownItem>
        <DropdownItem key="delete" className="text-danger" color="danger">
          Delete file
        </DropdownItem> */}
      </DropdownMenu>
    </Dropdown>
  );
};

interface Props {
  isOpen: boolean;
  // onOpen: () => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  // currentRecord: DataRecord | null;
  // currentCollection: Collection;
  // onUpdate: any;
}

const ConfirmModal: FC<Props> = ({
  isOpen,
  // onOpen,
  onOpenChange,
  onConfirm,
  // currentRecord,
  // currentCollection,
  // onUpdate,
}) => {
  let { globalState, setGlobalState } = useContext(GlobalContext);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(AddRecordSchema),
  });

  const theForm = useRef(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => {
          const onSubmit = async () => {
            onConfirm();
            onClose();
          };

          return (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Confirmation
              </ModalHeader>
              <ModalBody>
                <p>Record already exists, wanna duplicate?</p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onClick={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onClick={onSubmit}>
                  Duplicate
                </Button>
              </ModalFooter>
            </>
          );
        }}
      </ModalContent>
    </Modal>
  );
};
