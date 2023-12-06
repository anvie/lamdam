"use client";

import { get } from "@/lib/FetchWrapper";
import { CollectionContext, NeedUpdateContext } from "@/lib/context";
import { __error } from "@/lib/logger";
import { Collection } from "@/types";
import { Select, SelectItem } from "@nextui-org/react";
import { useContext, useEffect, useState } from "react";

const CollectionSelector = () => {
  const [data, setData] = useState<Collection[]>([]);
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);
  const { needUpdate, setNeedUpdate } = useContext(NeedUpdateContext);
  const [fresh, setFresh] = useState<boolean>(true);

  useEffect(() => {
    if (!(needUpdate || fresh)) {
      return;
    }
    setFresh(true);
    get("/api/collections")
      .then((data) => {
        setData(data.result);
        if (!currentCollection) {
          if (setCurrentCollection) {
            if (localStorage.getItem("currentCollectionId")) {
              const col = data.result.find(
                (col: any) =>
                  col.id === localStorage.getItem("currentCollectionId")
              );
              if (!col) {
                setCurrentCollection(data.result[0]);
                return;
              }
              setCurrentCollection(col);
            } else {
              setCurrentCollection(data.result[0]);
            }
          }
        }
      })
      .catch((error) => {
        __error("Cannot get collections.", error);
      });
  }, [needUpdate]);

  return (
    <Select
      size="sm"
      variant="flat"
      className="max-w-full md:max-w-xs w-full md:w-72"
      classNames={{
        trigger:
          "border hover:opacity-75 rounded-lg overflow-hidden dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
        popoverContent: "dark:bg-[#374151] bg-[#F9FAFB]",
        value: "font-medium text-current",
      }}
      selectionMode="single"
      radius="none"
      items={data ?? []}
      placeholder="Select a collection"
      selectedKeys={
        currentCollection ? new Set([currentCollection.id]) : undefined
      }
      defaultSelectedKeys={
        currentCollection ? new Set([currentCollection.id]) : undefined
      }
      onSelectionChange={(key) => {
        const selectedId = (key as Set<string>).values().next().value;
        const col = data.find((col) => col.id === selectedId);
        if (col) {
          setCurrentCollection?.(col);

          // save to local storage
          localStorage.setItem("currentCollectionId", col.id);
        }
      }}
    >
      {(collection) => (
        <SelectItem
          key={collection.id}
          textValue={`${collection.name} (${toDataTypeName(
            collection.meta?.dataType
          )})`}
          className="dark:hover:bg-white/10"
        >
          <span>
            {collection.name} ({toDataTypeName(collection.meta?.dataType)})
          </span>
        </SelectItem>
      )}
    </Select>
  );
};

function toDataTypeName(dataType: string | undefined) {
  if (dataType === undefined) {
    return "SFT";
  }
  if (dataType === "rm") {
    return "Reward Modeling";
  } else if (dataType === "sft") {
    return "SFT";
  } else {
    return "SFT";
  }
}

export default CollectionSelector;
