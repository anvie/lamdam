import { formatErrorMessage } from "@/lib/errorutil";
import { Textarea } from "@nextui-org/input";
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
}

const CTextarea: FC<CInputProps> = ({
  control,
  name,
  defaultValue,
  label,
  placeholder,
  errors,
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
          <Textarea
            label={label || name.toUpperCase()}
            placeholder={placeholder || `Enter ${name}`}
            onChange={onChange}
            value={value}
            onClear={() => onChange("")}
            classNames={inputClassNames}
          />
        )}
      />
      <span className="text-red-500 text-sm">
        {errors[name] && (
          <p>
            {name} {formatErrorMessage(errors[name]!.message as string)}
          </p>
        )}
      </span>
    </>
  );
};

export default CTextarea;



