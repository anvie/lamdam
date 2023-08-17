import { Button } from "@nextui-org/button";
import { FC, useContext, useRef, useState } from "react";
import { GearIcon } from "./icon/GearIcon";
import CollectionSelector from "@/components/CollectionSelector";
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
import { AddCollectionSchema } from "@/lib/schema";
import { post } from "@/lib/FetchWrapper";
import { __debug, __error } from "@/lib/logger";
import { ErrorLabel } from "./ErrorLabel";
import { CollectionContext, NeedUpdateContext } from "@/app/page";
import CInput from "./CInput";
import CTextarea from "./CTextarea";

const CollectionOps: FC = () => {
  return (
    <div className="border grid grid-cols-3 gap-3 p-5">
      <CollectionSelector />
      <RecordsStats />
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

  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);

  const onDumpClick = () => {
    if (!currentCollection) {
      return;
    }
    post(`/api/dumpCollection`, {
      collectionId: currentCollection.id,
    })
      .then((resp: any) => {})
      .catch((err: any) => {
        __error(err.message);
        alert("Cannot dump collection");
      });
  };

  return (
    <>
      <div className="flex items-end justify-end gap-3">
        <Button size="sm" onClick={onDumpClick}>
          Dump
        </Button>
        <div className="border-l-1 h-full bg-slate-300"></div>
        <Button size="sm" onClick={onAddCollectionModalOpen}>
          Add
        </Button>
        <Button size="sm">Edit</Button>
        <Button size="sm">Export</Button>
        <Button size="sm">Import</Button>
        <Button size="sm" isIconOnly>
          <GearIcon width="2em" />
        </Button>
      </div>
      <AddCollectionModal
        isAddCollectionModalOpen={isAddCollectionModalOpen}
        onAddCollectionModal={onAddCollectionModalOpen}
        onAddCollectionModalOpenChange={onAddCollectionModalOpenChange}
      />
    </>
  );
};

const RecordsStats = () => {
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);
  return currentCollection ? (
    <div>{currentCollection.count} total</div>
  ) : (
    <div></div>
  );
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

  const onSubmit = (onClose: any) => {
    setError("");
    return (data: any) => {
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
                <CInput control={control} name="creator" errors={errors} />
                <CTextarea
                  control={control}
                  name="description"
                  errors={errors}
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
