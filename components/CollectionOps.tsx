"use client";
import CollectionSelector from "@/components/CollectionSelector"
import * as apiClient from "@/lib/FetchWrapper"
import { post } from "@/lib/FetchWrapper"
import {
  CollectionContext,
  GlobalContext,
  NeedUpdateContext,
} from "@/lib/context"
import { __debug, __error } from "@/lib/logger"
import { AddCollectionSchema } from "@/lib/schema"
import { Statistic } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@nextui-org/button"
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/modal"
import { cn } from "@nextui-org/react"
import { useSession } from "next-auth/react"
import { Confirm } from "notiflix/build/notiflix-confirm-aio"
import { Loading } from "notiflix/build/notiflix-loading-aio"
import { Report } from "notiflix/build/notiflix-report-aio"
import React, { FC, useContext, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { HiCalculator, HiCalendarDays, HiMiniCircleStack } from "react-icons/hi2"
import useSWR from "swr"
import CInput from "./CInput"
import CSelect from "./CSelect"
import CTextarea from "./CTextarea"
import CompileAllModal from "./CompileAllModal"
import { ErrorLabel } from "./ErrorLabel"
import { useModal } from "./hooks/useModal"
import ExportModal from "./modals/ExportModal"
import ImportModal from "./modals/ImportModal"


const CollectionOps: FC = () => {
  return (
    <div className="border-b border-divider inline-flex justify-between items-center gap-3 px-4 md:px-4 py-3 flex-col md:flex-row">
      <div className="inline-flex items-center gap-4 md:gap-8 w-full flex-col md:flex-row">
        <CollectionSelector />
        <RecordsStats />
      </div>

      <CollectionOpsButtons />
    </div>
  );
};

export default CollectionOps;

const CollectionOpsButtons = () => {
  const {
    isOpen: isAddCollectionModalOpen,
    onOpen: onAddCollectionModalOpen,
    onOpenChange: onAddCollectionModalOpenChange,
  } = useDisclosure();
  const {
    isOpen: isCompileAllModalOpen,
    onOpen: onCompileAllModalOpen,
    onOpenChange: onCompileAllModalOpenChange,
  } = useDisclosure();

  const { currentCollection, setCurrentCollection } = useContext(CollectionContext);
  const { setNeedUpdate } = useContext(NeedUpdateContext);
  const { globalState, setGlobalState } = useContext(GlobalContext);

  const { showModal } = useModal()

  const doDump = () => {
    if (!currentCollection) {
      return;
    }

    Loading.hourglass(`Compiling collection ${currentCollection.name}...`);
    post(`/api/dumpCollection`, {
      id: currentCollection.id,
    })
      .then((resp: any) => {
        __debug("resp:", resp);
        if (resp.result) {
          Report.success(
            "Compile Success",
            `Total ${resp.result.total} records compiled from collection ${currentCollection.name}`,
            "Okay"
          );
        }
      })
      .catch((err: any) => {
        Report.failure(
          "Failed!",
          `Cannot compile collection: <br/><br/>${err}`,
          "Okay"
        );
      })
      .finally(() => {
        Loading.remove();
      });
  };

  const onDumpClick = () => {
    if (!currentCollection) {
      return;
    }
    if (currentCollection.count > 10000) {
      Confirm.show(
        "Confirmation",
        `Are you sure to compile the collection ${currentCollection.name}? This may take a while for a large collection.`,
        "Yes",
        "No",
        () => {
          doDump();
        }
      );
    } else {
      doDump();
    }
  };

  const showCompileAllModal = () => {
    onCompileAllModalOpen();
  };

  return (
    <React.Fragment>
      <div className="items-end justify-end gap-3 hidden md:flex">
        <Button
          size="sm"
          onClick={onDumpClick}
        >
          Compile
        </Button>
        <Button
          size="sm"
          onClick={showCompileAllModal}
        >
          Compile All
        </Button>
        <Button
          size="sm"
          className="hidden md:block"
          onClick={onAddCollectionModalOpen}
        >
          Add
        </Button>
        <Button size="sm" className="hidden md:block">
          Edit
        </Button>
        <Button size="sm" className="hidden md:block" onPress={() => {
          showModal('Export', ExportModal, {
            currentCollection: currentCollection ?? undefined,
          })
        }}>
          Export
        </Button>
        <Button size="sm" className="hidden md:block" onPress={() => {
          showModal('Import', ImportModal, {
            currentCollection: currentCollection ?? undefined,
            onImportSuccess: (importedCount) => {
              const currentCollectionTmp = {
                id: currentCollection!.id,
                count: currentCollection!.count + importedCount,
                meta: currentCollection!.meta,
                name: currentCollection!.name,
              };
              setCurrentCollection?.(currentCollectionTmp);
              setNeedUpdate(true);
            },
          })
        }}>
          Import
        </Button>
      </div>
      <AddCollectionModal
        isAddCollectionModalOpen={isAddCollectionModalOpen}
        onAddCollectionModal={onAddCollectionModalOpen}
        onAddCollectionModalOpenChange={onAddCollectionModalOpenChange}
      />
      <CompileAllModal
        isCompileAllModalOpen={isCompileAllModalOpen}
        onCompileAllModal={onCompileAllModalOpen}
        onCompileAllModalOpenChange={onCompileAllModalOpenChange}
      />
    </React.Fragment>
  );
};

const RecordsStats = () => {
  const { currentCollection } = useContext(CollectionContext);

  let { globalState, setGlobalState } = useContext(GlobalContext);

  const [recordsCount, setRecordsCount] = useState<number>(0);

  const { data } = useSWR<{ result: Statistic }>('/api/users/myStats', apiClient.get, {
    refreshInterval: 3000,
  })

  const myStats = data?.result
  const monthlyTarget = myStats?.targets.monthly || 0
  const perDayTarget = myStats?.targets.daily || 0

  useEffect(() => {
    if (!currentCollection) {
      return;
    }
    setRecordsCount(currentCollection.count);
  }, [currentCollection]);

  useEffect(() => {
    if (!currentCollection) {
      return;
    }
    // setRecordsCount(currentCollection.count);
    if (globalState.newRecord) {
      setRecordsCount(recordsCount + 1);
      setGlobalState({ ...globalState, newRecord: null });
    }
    if (globalState.deleteRecord) {
      setRecordsCount(recordsCount - 1);
    }
  }, [globalState]);

  if (!currentCollection) return (<div />)

  return (
    <div className="inline-flex items-center gap-2 md:gap-7 justify-between md:justify-start self-stretch md:self-auto">
      <div className="flex gap-2 items-center">
        <div className={cn("w-10 h-10 text-white dark:text-current rounded-lg flex items-center justify-center", {
          "bg-success": (myStats?.today || 0) >= perDayTarget && perDayTarget > 0,
          "bg-danger": (myStats?.today || 0) < perDayTarget && perDayTarget > 0,
          "bg-primary": perDayTarget === 0,
        })}>
          <HiCalculator className="w-6 h-6 relative" />
        </div>
        <div className="flex flex-col">
          <span className="opacity-40 text-current text-xs font-normal">Daily Target</span>
          <span className="text-current text-sm font-medium">{myStats?.today ?? 0}/{perDayTarget}</span>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <div className={cn("w-10 h-10 text-white dark:text-current rounded-lg flex items-center justify-center", {
          "bg-success": (myStats?.thisMonth || 0) >= monthlyTarget && monthlyTarget > 0,
          "bg-danger": (myStats?.thisMonth || 0) < monthlyTarget && monthlyTarget > 0,
          "bg-primary": monthlyTarget === 0,
        })}>
          <HiCalendarDays className="w-6 h-6 relative" />
        </div>
        <div className="flex flex-col">
          <span className="opacity-40 text-current text-xs font-normal">Monthly Target</span>
          <span className="text-current text-sm font-medium">{Number(myStats?.thisMonth ?? 0).toDisplay()}/{monthlyTarget.toDisplay()}</span>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <div className="w-10 h-10 bg-primary text-white dark:text-current rounded-lg flex items-center justify-center">
          <HiMiniCircleStack className="w-6 h-6 relative" />
        </div>
        <div className="flex flex-col">
          <span className="opacity-40 text-current text-xs font-normal">Total Record</span>
          <span className="text-current text-sm font-medium">{recordsCount.toDisplay()}</span>
        </div>
      </div>
    </div>
  )
};

const AddCollectionModal: FC<any> = ({
  isAddCollectionModalOpen,
  onAddCollectionModal,
  onAddCollectionModalOpenChange,
}) => {
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);
  const { needUpdate, setNeedUpdate } = useContext(NeedUpdateContext);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(AddCollectionSchema),
  });
  const theForm = useRef(null);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const onSubmit = (onClose: any) => {
    setError("");
    return (data: any) => {
      __debug("data:", data);
      post("/api/addCollection", data)
        .then((data) => {
          __debug("data:", data);
          // if (data.result && data.result.length > 0){
          setNeedUpdate(true);
          onClose();
          // }
        })
        .catch((err) => {
          if (err) {
            __error(err);
            setError("Cannot add collection :(");
          }
        });
    };
  };

  return (
    <Modal
      isOpen={isAddCollectionModalOpen}
      onOpenChange={onAddCollectionModalOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Create new collection
            </ModalHeader>
            <ModalBody>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-3"
                ref={theForm}
              >
                <CInput control={control} name="name" errors={errors} />
                <CInput
                  control={control}
                  name="creator"
                  defaultValue={session?.user?.name}
                  errors={errors}
                  readOnly={session?.user?.name !== undefined}
                />
                <CTextarea
                  control={control}
                  name="description"
                  errors={errors}
                />

                <CSelect
                  control={control}
                  name="dataType"
                  errors={errors}
                  items={[
                    {
                      key: "sft",
                      value: "sft",
                      name: "SFT",
                    },
                    {
                      key: "rm",
                      value: "rm",
                      name: "Reward Modeling",
                    },
                  ]}
                />

                {error && <ErrorLabel message={error} />}
                {/* <code>
                  <pre>{JSON.stringify(errors, null, 2)}</pre>
                </code> */}
              </form>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onClick={onClose}>
                Close
              </Button>
              <Button
                color="primary"
                onPress={(e) => {
                  handleSubmit(onSubmit(onClose))(theForm as any);
                }}
              >
                Action
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
