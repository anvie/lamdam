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
import { Key, useState } from "react"
import { CloseIcon } from "./icon/CloseIcon"
import { SettingsIcon } from "./icon/SettingsIcon"

const Features = () => {
	const items = ["prompt", "response", "input", "history"];

	const [selected, setSelected] = useState([items[0]]);

	return (
		<CheckboxGroup value={selected} onValueChange={setSelected}>
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
	
	const filteredItems = creators.filter((item) =>
		item.toLowerCase().startsWith(inputValue.toLowerCase())
	);

	const onInputCreatorAction = (key: Key) => {};
	return (
		<>
			<section className="flex flex-wrap border p-4 rounded-lg gap-2">
				{creators.map((item) => (
					<>
						<div className="flex items-center border rounded-lg px-2 py-1 pt-0 gap-2">
							<p>{item}</p>
							<CloseIcon className="cursor-pointer"></CloseIcon>
						</div>
					</>
				))}
				<input
					type="text"
					ref={refs.setReference}
					placeholder="type  here"
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
