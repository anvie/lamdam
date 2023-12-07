import { Chip, RadioProps, VisuallyHidden, cn, useRadio } from "@nextui-org/react";

const CRadio = (props: RadioProps) => {
    const {
        Component,
        children,
        isSelected,
        description,
        getBaseProps,
        getWrapperProps,
        getInputProps,
        getLabelProps,
        getLabelWrapperProps,
        getControlProps,
    } = useRadio(props);

    const MyComponent = Component as any

    return (
        <MyComponent
            {...getBaseProps()}
            className={cn(
                "group flex justify-center data-[disabled=true]:opacity-50",
            )}
        >
            <VisuallyHidden>
                <input {...getInputProps()} />
                <span {...getWrapperProps()}>
                    <span {...getControlProps()} />
                </span>
            </VisuallyHidden>

            {children && (
                <Chip
                    variant={isSelected ? "flat" : "bordered"}
                    color={props.color}
                    className="cursor-pointer group-data-[disabled=true]:cursor-not-allowed"
                    radius="md"
                    classNames={{
                        content: "text-center capitalize text-xs font-medium"
                    }}
                >
                    {children}
                </Chip>
            )}
        </MyComponent>
    );
};

export default CRadio;