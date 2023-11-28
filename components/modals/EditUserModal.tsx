import { EditUserSchema } from "@/lib/schema";
import { UserRoles } from "@/models";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@nextui-org/input";
import { Button, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, User as UserProfile } from "@nextui-org/react";
import { User } from "next-auth";
import { Notify } from "notiflix";
import { FC, useRef } from "react";
import { useForm } from "react-hook-form";
import useSWRMutation from 'swr/mutation';
import { z } from "zod";
import { ModalProps } from "../hooks/useModal";
import { Statistic } from "@/types";

type UserWithStats = User & {
    stats: Statistic;
}

interface Props extends ModalProps {
    user: UserWithStats
}

type FormType = z.infer<typeof EditUserSchema>

async function updateUser(url: string, { arg }: { arg: string }) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(arg)
        })

        const data = await res.json()
        if (data.error) throw new Error(data.error)

        return data
    } catch (error) {
        throw error
    }
}

const EditUserModal: FC<Props> = ({ user, ...props }) => {
    const formRef = useRef<HTMLFormElement>(null)
    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormType>({
        resolver: zodResolver(EditUserSchema),
        defaultValues: {
            id: user.id,
            role: user.role,
            status: user.status,
            meta: {
                monthlyTarget: user.meta?.monthlyTarget ?? 0,
            },
        }
    })

    const swr = useSWRMutation(`/api/users/${user.id}`, updateUser)

    const role = watch('role', user.role)

    const inputClassNames = {
        inputWrapper: "border group-data-[invalid=true]:border group-data-[invalid=true]:bg-red-200 group-data-[invalid=true]:border-danger dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
        input: "bg-transparent",
        errorMessage: "mt-1 -ml-1 text-danger",
    }

    const onSubmit = async (data: FormType) => {
        try {
            await swr.trigger(data as any)
            Notify.success('User updated successfully')
            props.closeModal?.()
        } catch (error: any) {
            Notify.failure(error.message)
        }
    }

    return (
        <ModalContent>
            <ModalHeader>
                <h4 className="text-2xl font-semibold">Edit User</h4>
            </ModalHeader>
            <ModalBody className="">
                <form ref={formRef} className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                    <UserProfile
                        avatarProps={{ radius: "lg", src: user.image! }}
                        description={user.email}
                        name={String(user.name)}
                        className="w-full dark:bg-[#374151] bg-[#F9FAFB] justify-start p-2 border dark:border-none rounded-lg gap-2"
                    >
                        {user.email}
                    </UserProfile>
                    <Select
                        label="Role"
                        placeholder="Select Role"
                        selectionMode="single"
                        disallowEmptySelection
                        defaultSelectedKeys={user.role ? new Set([user.role]) : undefined}
                        value={user.role}
                        fullWidth
                        errorMessage={errors.role?.message}
                        items={UserRoles.map((role) => ({ value: role, label: role }))}
                        classNames={{
                            trigger: "border hover:opacity-75 rounded-lg overflow-hidden dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
                            popoverContent: "dark:bg-[#374151] bg-[#F9FAFB]",
                            value: "font-medium text-current capitalize",
                        }}
                        {...register('role')}
                    >
                        {(item) => (
                            <SelectItem
                                key={item.value}
                                value={item.value}
                                className="dark:hover:bg-white/10 capitalize"
                            >
                                {item.label}
                            </SelectItem>
                        )}
                    </Select>
                    {role === 'annotator' && (
                        <Input
                            type="number"
                            label="Monthly Target"
                            placeholder="Enter Monthly Target"
                            classNames={inputClassNames}
                            {...register('meta.monthlyTarget', { valueAsNumber: true })}
                            errorMessage={errors.meta?.monthlyTarget?.message}
                        />
                    )}
                    <Select
                        label="Status"
                        placeholder="Select Status"
                        selectionMode="single"
                        disallowEmptySelection
                        defaultSelectedKeys={user.status ? new Set([user.status]) : undefined}
                        value={user.status}
                        fullWidth
                        errorMessage={errors.status?.message}
                        items={["active", "blocked"].map((status) => ({ value: status, label: status }))}
                        classNames={{
                            trigger: "border hover:opacity-75 rounded-lg overflow-hidden dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
                            popoverContent: "dark:bg-[#374151] bg-[#F9FAFB]",
                            value: "font-medium text-current capitalize",
                        }}
                        {...register('status')}
                    >
                        {(item) => (
                            <SelectItem
                                key={item.value}
                                value={item.value}
                                className="dark:hover:bg-white/10 capitalize"
                            >
                                {item.label}
                            </SelectItem>
                        )}
                    </Select>
                </form>
            </ModalBody>
            <ModalFooter>
                <Button
                    variant="bordered"
                    isDisabled={swr.isMutating}
                    onPress={props.closeModal}
                >
                    Cancel
                </Button>
                <Button
                    color="primary"
                    isLoading={swr.isMutating}
                    isDisabled={swr.isMutating}
                    onPress={() => formRef.current?.requestSubmit()}
                >
                    Save
                </Button>
            </ModalFooter>
        </ModalContent>
    );
}

export default EditUserModal;