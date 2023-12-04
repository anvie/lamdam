import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea } from "@nextui-org/react";
import { Notify } from "notiflix";
import { FC, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ModalProps } from "../hooks/useModal";

interface Props extends ModalProps {
    onSubmit: (rejectReason: string) => Promise<void>
}

const schema = z.object({
    rejectReason: z.string().nonempty('Please write the reason for rejection')
})

type FormType = z.infer<typeof schema>

const RejectReasonModal: FC<Props> = (props) => {
    const formRef = useRef<HTMLFormElement>(null)
    const { register, handleSubmit, formState: { errors } } = useForm<FormType>({
        resolver: zodResolver(schema),
    })
    const [isLoading, setIsLoading] = useState(false)

    const inputClassNames = {
        inputWrapper: "border group-data-[invalid=true]:border group-data-[invalid=true]:bg-red-200 group-data-[invalid=true]:border-danger dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
        input: "bg-transparent",
        errorMessage: "mt-1 -ml-1 text-danger",
    }

    const onSubmit = async (data: FormType) => {
        try {
            setIsLoading(true)
            await props.onSubmit(data.rejectReason)
            props.closeModal?.()
        } catch (error: any) {
            Notify.failure(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <ModalContent>
            <ModalHeader className="border-b border-b-divider">
                <h4 className="text-2xl font-semibold">Why Rejected?</h4>
            </ModalHeader>
            <ModalBody className="pt-6">
                <form ref={formRef} className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                    <Textarea
                        placeholder="Please write the reason for rejection..."
                        {...register('rejectReason')}
                        classNames={inputClassNames}
                        isInvalid={!!errors.rejectReason}
                        errorMessage={errors.rejectReason?.message}
                        rows={10}
                        minRows={10}
                    />
                </form>
            </ModalBody>
            <ModalFooter>
                <Button
                    variant="bordered"
                    isDisabled={isLoading}
                    onPress={props.closeModal}
                    color="danger"
                >
                    Cancel
                </Button>
                <Button
                    color="primary"
                    isLoading={isLoading}
                    isDisabled={isLoading}
                    onPress={() => formRef.current?.requestSubmit()}
                >
                    Yes, Reject
                </Button>
            </ModalFooter>
        </ModalContent>
    );
}

export default RejectReasonModal;