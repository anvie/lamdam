"use client";

import { get } from "@/lib/FetchWrapper"
import { useLocalStorage } from "@/lib/state"
import { useFloating } from "@floating-ui/react-dom"
import {
	Button,
	Checkbox,
	CheckboxGroup,
	Listbox,
	ListboxItem,
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	useDisclosure,
} from "@nextui-org/react"
import { Dispatch, Key, SetStateAction, useEffect, useState } from "react"
import { CloseIcon } from "./icon/CloseIcon"
import { SettingsIcon } from "./icon/SettingsIcon"

const Features = () => {
	const items = ["prompt", "response", "input", "history"];

	const [selected, setSelected] = useLocalStorage("search-settings.features", [
		items[0],
	]);
	useEffect(() => {
		console.log(selected);
	}, [selected]);

	const onValueChange: Dispatch<SetStateAction<string[]>> = (items) => {
		if (items.length == 0) {
			alert("there must be at least one");
		} else {
			setSelected(items);
		}
	};

	return (
		<CheckboxGroup value={selected} onValueChange={onValueChange}>
			{items.map((item) => (
				<>
					<Checkbox value={item}>{item.toLocaleUpperCase()}</Checkbox>
				</>
			))}
		</CheckboxGroup>
	);
};

const InputCreator = () => {
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");

	const { refs, floatingStyles } = useFloating({
		placement: "bottom-start",
	});
	const [creators, setCreators] = useLocalStorage<string[]>(
		"search-settings.creator",
		[]
	);

	const [data, setData] = useState<string[]>([]);
	useEffect(() => {
		get("/api/creators").then((data) => {
			setData(data);
		});
	}, []);

	const filteredItems = data.filter((item) => {
		if (creators.includes(item)) return false;
		if (item.toLowerCase().startsWith(inputValue.toLowerCase())) return true;
		if (item.toLowerCase().includes(inputValue.toLowerCase())) return true;

		return false;
	});

	const onInputCreatorAction = (key: Key) => {
		if (!creators.includes(key.toString())) {
			setCreators([...creators, key.toString()]);
		}

		setInputValue("");
		setOpen(false);
		document.getElementById("search-setting.creators")!.focus();
	};

	const onDeleteTagCreator = (creator: string) => {
		setCreators(creators.filter((_creator) => _creator != creator));
	};

	return (
		<>
			<section className="flex flex-wrap border p-4 rounded-lg gap-2">
				{creators.map((creator) => (
					<>
						<div className="flex items-center border rounded-lg px-2 py-1 pt-0 gap-2">
							<p>{creator}</p>
							<CloseIcon
								className="cursor-pointer"
								onClick={() => onDeleteTagCreator(creator)}
							></CloseIcon>
						</div>
					</>
				))}
				<input
					id="search-setting.creators"
					type="text"
					ref={refs.setReference}
					placeholder="type  here"
					value={inputValue}
					className="outline-none border-0 bg-transparent flex-1 w-fit"
					onChange={(e) => {
						const value = e.target.value;
						setOpen(!!value);
						setInputValue(value || "");
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							setOpen(false);
						}
					}}
				/>
				{open && filteredItems.length ? (
					<div
						className="absolute top-0 left-0 bg-black rounded p-2"
						ref={refs.setFloating}
						style={floatingStyles}
					>
						<Listbox aria-label="Actions" onAction={onInputCreatorAction}>
							{filteredItems.map((item) => (
								<ListboxItem key={item}>{item}</ListboxItem>
							))}
						</Listbox>
					</div>
				) : (
					<></>
				)}
			</section>
			{filteredItems.length==0 && inputValue ? <small>There is no more creators</small> : ""}
			
		</>
	);
};

export const SearchSetting = () => {
	const { isOpen, onOpen, onOpenChange } = useDisclosure();

	return (
		<>
			<button type="button" onClick={onOpen} className="p-2 outline-none">
				<SettingsIcon />
			</button>

			<Modal
				backdrop="blur"
				isOpen={isOpen}
				placement={"center"}
				onOpenChange={onOpenChange}
				isDismissable={false}
				style={{
					overflow: "visible",
				}}
			>
				<ModalContent>
					{(onClose) => (
						<>
							<ModalHeader className="flex flex-col gap-1">
								Search Settings
							</ModalHeader>
							<ModalBody>
								<Features></Features>
								<label className="mt-4">
									<p className="mb-2">Creator</p>
									<InputCreator></InputCreator>
								</label>
							</ModalBody>
							<ModalFooter>
								<Button color="danger" variant="light" onPress={onClose}>
									Close
								</Button>
								<Button color="primary" onPress={onClose}>
									Save
								</Button>
							</ModalFooter>
						</>
					)}
				</ModalContent>
			</Modal>
		</>
	);
};
