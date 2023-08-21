"use client";

import { CollectionContext, NeedUpdateContext } from "@/lib/context";
import { Collection } from "@/types";
import { useContext, useEffect, useState } from "react";
import { get } from "@/lib/FetchWrapper";
import { __debug, __error } from "@/lib/logger";

const CollectionSelector = () => {
  const [data, setData] = useState<Collection[]>([]);
  const { currentCollection, setCurrentCollection } = useContext(CollectionContext);
  const { needUpdate, setNeedUpdate } = useContext(NeedUpdateContext);
  const [fresh, setFresh] = useState<boolean>(true);

  useEffect(() => {
    if (!(needUpdate || fresh)) {
      return;
    }
    setFresh(true);
    get("/api/collections")
      .then((data) => {
        __debug("data:", data);
        setData(data.result);
        if (!currentCollection) {
          if (setCurrentCollection){
            if (localStorage.getItem("currentCollectionId")) {
              const col = data.result.find((col:any) => col.id === localStorage.getItem("currentCollectionId"));
              if (!col){
                setCurrentCollection(data.result[0])
                return;
              }
              setCurrentCollection(col);
            }else{
              setCurrentCollection(data.result[0])
            }
          }
        }
      })
      .catch((error) => {
        __error("Cannot get collections.", error);
      });
  }, [needUpdate]);

  return (
    <div className="flex items-center">
      <label className="sr-only" htmlFor="collection">
        Collection
      </label>
      <select
        className="outline-none border-0 bg-transparent text-default-400 text-small"
        id="collection"
        name="collection"
        value={currentCollection ? currentCollection.id : undefined}
        defaultValue={currentCollection ? currentCollection.id : undefined}
        onChange={(e: any) => {
          const col = data[e.target.selectedIndex];
          if (col) {
            setCurrentCollection && setCurrentCollection(col);

            // save to local storage
            localStorage.setItem("currentCollectionId", col.id);
          }
        }}
      >
        {data &&
          data.map((collection, index) => (
            <option key={`collection-${index}`} value={collection.id}>
              {collection.name}
            </option>
          ))}
      </select>
    </div>
  );
};

export default CollectionSelector;
