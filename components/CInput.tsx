import { formatErrorMessage } from "@/lib/errorutil";
import { Input } from "@nextui-org/input";
import { FC } from "react";
import {
  Control,
  Controller,
  FieldErrors,
  FieldValues,
} from "react-hook-form";

interface CInputProps {
  control: Control<FieldValues, any>;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  errors: FieldErrors<FieldValues>;
  readOnly?: boolean;
}

const CInput: FC<CInputProps> = ({
  control,
  name,
  defaultValue,
  label,
  placeholder,
  errors,
  readOnly,
}) => {
  const inputClassNames = {
    inputWrapper: "border dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
    input: "bg-transparent",
  }

  return (
    <>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue || ""}
        render={({ field: { onChange, value } }) => (
          <Input
            label={label || name.toUpperCase()}
            placeholder={placeholder || `Enter ${name}`}
            isClearable={!readOnly}
            onChange={onChange}
            value={value}
            onClear={!readOnly ? () => onChange("") : undefined}
            readOnly={readOnly}
            classNames={inputClassNames}
          />
        )}
      />
      <span className="text-red-500 text-sm">
        {errors[name] && (
          <p>
            {name} {formatErrorMessage(errors[name]?.message as string)}
          </p>
        )}
      </span>
    </>
  );
};

export default CInput;