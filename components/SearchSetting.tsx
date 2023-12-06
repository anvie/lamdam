"use client";

import { truncate } from "@/lib/stringutil";
import {
  Avatar,
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Selection,
} from "@nextui-org/react";
import { useInfiniteScroll } from "@nextui-org/use-infinite-scroll";
import { Dispatch, FC, Fragment, SetStateAction, useState } from "react";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";
import useSimpleUsers from "./hooks/useSimpleUsers";

const InputCreator = ({ state }: { state: [Selection, Dispatch<SetStateAction<Selection>>] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { items, hasMore, isLoading, onLoadMore } = useSimpleUsers();
  const [creators, setCreators] = state;

  const [_, scrollerRef] = useInfiniteScroll({
    hasMore,
    isEnabled: isOpen,
    shouldUseLoader: false,
    onLoadMore,
  });

  const removeCreator = (id: string) => {
    setCreators((prev) => {
      (prev as Set<string>).delete(id);
      return new Set(prev);
    });
  }

  return (
    <Select
      isMultiline
      fullWidth
      isLoading={isLoading}
      items={items}
      scrollRef={scrollerRef}
      onOpenChange={setIsOpen}
      onSelectionChange={setCreators}
      selectedKeys={creators}
      aria-labelledby="creators"
      variant="bordered"
      selectionMode="multiple"
      placeholder="Select creators"
      classNames={{
        base: "max-w-xs",
        trigger: "min-h-[46px] py-1.5 px-2.5",
        value: "w-fit",
        innerWrapper: "w-fit"
      }}
      selectorIcon={<Fragment />}
      renderValue={(items: any[]) => {
        return (
          <div className="flex flex-wrap gap-2">
            {items.map(({ key, data: { name } }) => (
              <Chip
                key={key}
                radius="sm"
                onClose={() => removeCreator(key)}
              >
                {truncate(name.split(' ')[0], 8)}
              </Chip>
            ))}
          </div>
        );
      }}
    >
      {(user) => (
        <SelectItem
          key={user.id}
          textValue={user.name}
        >
          <div className="flex gap-2 items-center">
            <Avatar alt={user.name} className="flex-shrink-0" size="sm" src={user.image} />
            <div className="flex flex-col">
              <span className="text-small">{user.name}</span>
            </div>
          </div>
        </SelectItem>
      )}
    </Select>
  );
}

type SearchSettingProps = {
  onSaveSearch: (filters: { features: string[], creators: string[], sort: string }) => void;
}

export const SearchSetting: FC<SearchSettingProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false)
  const items = ["prompt", "response", "input", "history"]
  const [features, setFeatures] = useState<string[]>(["prompt"]);
  const [creators, setCreators] = useState<Selection>(new Set<string>([]));
  const [sort, setSort] = useState("desc")

  const onSave = () => {
    props.onSaveSearch({
      features,
      creators: Array.from<any>(creators),
      sort,
    })
    setIsOpen(false)
  }

  const onReset = () => {
    setFeatures(["prompt"])
    setCreators(new Set<string>([]))
    props.onSaveSearch({
      features: [],
      creators: [],
      sort: "desc",
    })
    setIsOpen(false)
  }

  return (
    <Dropdown
      radius="md"
      classNames={{
        base: "p-0",
        content: "p-0 border-none bg-background",
      }}
      placement="bottom-end"
      isOpen={isOpen}
    >
      <DropdownTrigger>
        <Button
          type="button"
          isIconOnly
          onPress={() => setIsOpen((open) => !open)}
        >
          <HiOutlineAdjustmentsHorizontal className="w-5 h-5" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        variant="flat"
        aria-label="Dropdown menu with description"
        classNames={{
          base: "p-0 w-[265px]",
        }}
        selectionMode="none"
        closeOnSelect={false}
        bottomContent={
          <div className="flex justify-between gap-2.5 px-4 pb-4">
            <Button
              fullWidth
              onPress={onReset}
            >
              Reset
            </Button>
            <Button
              fullWidth
              color="primary"
              onPress={onSave}
            >
              Save
            </Button>
          </div>
        }
      >
        <DropdownSection
          title="Search Setting"
          classNames={{
            heading: "border-b border-divider block w-full px-4 py-3 font-semibold text-sm text-current",
            group: "px-2 py-2 mt-2 flex flex-col gap-1"
          }}
        >
          <DropdownItem
            key="features"
            isReadOnly
            hideSelectedIcon
          >
            <CheckboxGroup
              aria-labelledby="features"
              color="secondary"
              value={features}
              onChange={(keys) => Array.isArray(keys) && setFeatures(keys)}
            >
              {items.map((item) => {
                return (
                  <Checkbox
                    key={item}
                    value={item}
                    className="capitalize font-medium"
                    classNames={{
                      label: "group-data-[selected=true]:text-current text-gray-500 text-sm"
                    }}
                  >
                    {item}
                  </Checkbox>
                )
              })}
            </CheckboxGroup>
          </DropdownItem>
        </DropdownSection>
        <DropdownSection
          title="Creators"
          classNames={{
            heading: "block w-full px-4 py-0 font-semibold text-sm text-current",
            group: "px-4"
          }}
        >
          <DropdownItem
            key="users"
            isReadOnly
            hideSelectedIcon
            className="p-0"
          >
            <InputCreator state={[creators, setCreators]} />
          </DropdownItem>
        </DropdownSection>
        <DropdownSection
          title="Sort"
          classNames={{
            heading: "block w-full px-4 py-0 font-semibold text-sm text-current",
            group: "px-2"
          }}
        >
          <DropdownItem
            key="sort"
            isReadOnly
            hideSelectedIcon
          >
            <RadioGroup
              aria-labelledby="sort"
              orientation="horizontal"
              color="secondary"
              value={sort}
              onValueChange={setSort}
              classNames={{
                wrapper: "gap-4",
                base: "font-medium",
              }}
            >
              <Radio classNames={{ label: "group-data-[selected=true]:text-current text-gray-500 text-sm" }} value="asc">A-Z</Radio>
              <Radio classNames={{ label: "group-data-[selected=true]:text-current text-gray-500 text-sm" }} value="desc">Z-A</Radio>
            </RadioGroup>
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
};
