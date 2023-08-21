"use client";

import { Button } from "@nextui-org/button";
import { FC, Key, useContext, useEffect, useRef, useState } from "react";
import { DocumentPlus } from "./icon/DocumentPlus";
import { CheckIcon } from "./icon/CheckIcon";
import { XMarkIcon } from "./icon/XMarkIcon";
import { ArrowRightIcon } from "./icon/ArrowRightIcon";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AddRecordSchema } from "@/lib/schema";
import { get, post } from "@/lib/FetchWrapper";
import { __debug, __error } from "@/lib/logger";
import { ErrorLabel } from "./ErrorLabel";
import {
  CollectionContext,
  GlobalContext,
  SelectedRecordContext,
} from "@/app/page";
import { Collection, DataRecord } from "@/types";
import { errorMessage } from "@/lib/errorutil";
import { Notify } from "notiflix/build/notiflix-notify-aio";
import { Confirm } from "notiflix/build/notiflix-confirm-aio";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/dropdown";

const RecordOps: FC = () => {
  const [error, setError] = useState("");
  let { globalState, setGlobalState } = useContext(GlobalContext);
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);
  let { currentRecord, setCurrentRecord } = useContext(SelectedRecordContext);
  const modalState = useDisclosure();

  const [enableOps, setEnableOps] = useState(false);

  useEffect(() => {
    Notify.init({ position: "center-top" });
  }, []);

  useEffect(() => {
    setEnableOps(currentRecord !== null && currentRecord.id !== "");
  }, [currentRecord]);

  const onAddClick = () => {
    if (currentRecord && currentRecord.id != "") {
      // apabila sudah exists, kasih konfirmasi apakah mau buat duplikat dari current record?
      modalState.onOpen();
    } else {
      setError("");

      if (!currentRecord) {
        alert("Please specify record first");
        return;
      }
      const rec: DataRecord = currentRecord!;

      post("/api/addRecord", {
        prompt: rec.prompt,
        response: rec.response,
        input: rec.input,
        history: rec.history,
        collectionId: currentCollection!.id,
      })
        .then((data) => {
          const doc = data.result as DataRecord;
          __debug("doc:", doc);
          setCurrentRecord!(doc);
          setGlobalState({
            ...globalState,
            newRecord: doc,
          });
        })
        .catch((err) => {
          if (err) {
            __error(typeof err);
            alert("Cannot add record :(. " + errorMessage(err));
          }
        });
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

    post("/api/updateRecord", {
      id: rec.id,
      prompt: rec.prompt,
      input: rec.input,
      response: rec.response,
      history: rec.history,
      collectionId: currentCollection!.id,
    })
      .then((data) => {
        __debug("data:", data);
        const doc = currentRecord!;
        doc.dirty = false;
        setCurrentRecord!({
          ...doc,
          prompt: rec.prompt,
          response: rec.response,
          input: rec.input,
          history: rec.history,
          collectionId: rec.collectionId,
          dirty: false,
        });
        Notify.success("Record has been updated", { position: "center-top" });
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

    Confirm.show("Confirmation", `Are you sure you want to delete record "${rec.prompt}"?`,"Yes", "No", ()=>{

        post("/api/deleteRecord", {
          id: rec.id,
          collectionId: currentCollection?.id,
        })
          .then((data) => {
            __debug("data:", data);
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
      
    });

  };

  return (
    <div className="border">
      <div className="flex flex-col p-2 items-start justify-start gap-3">
        {error && <ErrorLabel message={error} />}
        <Button
          size="md"
          startContent={<DocumentPlus width="1.2em" />}
          onClick={onAddClick}
        >
          Add New Record
        </Button>
        <Button
          size="md"
          disabled={!enableOps}
          startContent={<CheckIcon />}
          onClick={onUpdateClick}
        >
          Update Record
        </Button>

        <MoveRecordButton
          disabled={!enableOps}
          currentRecord={currentRecord}
          onMoveSuccess={() => {
            setGlobalState({
              ...globalState,
              deleteRecord: currentRecord,
            });
            setCurrentRecord!(null);
          }}
        />

        <div className="p-2 border-b-1 w-full"></div>

        <Button size="md">Get GPT Response</Button>

        <div className="p-2 border-b-1 w-full"></div>

        <Button
          size="md"
          className="bg-red-500 text-white"
          startContent={<XMarkIcon />}
          disabled={!enableOps}
          onClick={onDeleteClick}
        >
          Delete Record
        </Button>
      </div>

      {currentCollection && (
        <ConfirmModal
          currentRecord={currentRecord}
          onUpdate={setCurrentRecord}
          collectionId={currentCollection.id}
          {...modalState}
        />
      )}
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
        __debug("data:", data);
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
          startContent={<ArrowRightIcon />}
          disabled={disabled}
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
  onOpen: () => void;
  onOpenChange: (open: boolean) => void;
  currentRecord: DataRecord | null;
  onUpdate: any;
  collectionId: string;
}

const ConfirmModal: FC<Props> = ({
  isOpen,
  onOpen,
  onOpenChange,
  currentRecord,
  onUpdate,
  collectionId,
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
            if (!currentRecord) {
              alert("Please specify record first");
              return;
            }
            const rec = currentRecord;
            __debug("currentRecord:", currentRecord);
            await post("/api/addRecord", {
              prompt: rec.prompt,
              response: rec.response,
              input: rec.input,
              history: rec.history,
              collectionId,
            })
              .then((data) => {
                __debug("data:", data);
                setGlobalState({
                  ...globalState,
                  newRecord: data.result as DataRecord,
                });
                onClose();
                onUpdate(data.result as DataRecord);
                Notify.success("New record was created", {
                  position: "center-top",
                });
              })
              .catch((err) => {
                if (err) {
                  __error(err);
                  setError("Cannot add collection :(");
                }
              });
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

// const AddRecordModal: FC<any> = ({ isOpen, onOpen, onOpenChange }) => {
//   const { currentCollection, setCurrentCollection } =
//     useContext(CollectionContext);
//   let { globalState, setGlobalState } = useContext(GlobalContext);
//   const { needUpdate, setNeedUpdate } = useContext(NeedUpdateContext);
//   const {
//     register,
//     handleSubmit,
//     control,
//     formState: { errors },
//   } = useForm({
//     resolver: zodResolver(AddRecordSchema),
//   });
//   const theForm = useRef(null);
//   const [error, setError] = useState<string | null>(null);

//   const onSubmit = (onClose: any) => {
//     setError("");
//     return (data: any) => {
//       post("/api/addRecord", data)
//         .then((data) => {
//           __debug("data:", data);
//           // if (data.result && data.result.length > 0){
//           setNeedUpdate(true);
//           setGlobalState({
//             ...globalState,
//             newRecord: data.result as DataRecord,
//           })
//           onClose();
//           // }
//         })
//         .catch((err) => {
//           if (err) {
//             __error(err);
//             setError("Cannot add collection :(");
//           }
//         });
//     };
//   };

//   return (
//     <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
//       <ModalContent>
//         {(onClose) => (
//           <>
//             <ModalHeader className="flex flex-col gap-1">
//               Create new collection
//             </ModalHeader>
//             <ModalBody>
//               <form
//                 onSubmit={handleSubmit(onSubmit)}
//                 className="flex flex-col gap-3"
//                 ref={theForm}
//               >
//                 <CInput control={control} name="name" errors={errors} />
//                 <CInput control={control} name="creator" errors={errors} />
//                 <CTextarea
//                   control={control}
//                   name="description"
//                   errors={errors}
//                 />
//                 {error && <ErrorLabel message={error} />}
//                 {/* <code>
//                   <pre>{JSON.stringify(errors, null, 2)}</pre>
//                 </code> */}
//               </form>
//             </ModalBody>
//             <ModalFooter>
//               <Button color="danger" variant="light" onClick={onClose}>
//                 Close
//               </Button>
//               <Button
//                 color="primary"
//                 onPress={(e) => {
//                   handleSubmit(onSubmit(onClose))(theForm as any);
//                 }}
//               >
//                 Submit
//               </Button>
//             </ModalFooter>
//           </>
//         )}
//       </ModalContent>
//     </Modal>
//   );
// };
