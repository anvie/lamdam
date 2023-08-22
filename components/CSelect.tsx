import { Textarea } from "@nextui-org/input";
import { FC } from "react";
import { Control, Controller, FieldErrors, FieldValues } from "react-hook-form";
import { __debug, __error } from "@/lib/logger";
import { formatErrorMessage } from "@/lib/errorutil";
import { Select, SelectItem } from "@nextui-org/select";

interface CSelectProps {
  control: Control<FieldValues, any>;
  name: string;
  items: FieldValues[];
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  errors: FieldErrors<FieldValues>;
}

const CSelect: FC<CSelectProps> = ({
  control,
  name,
  items,
  defaultValue,
  label,
  placeholder,
  errors,
}) => {
  return (
    <>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue || ""}
        render={({ field: { onChange, value } }) => (
          <Select
            label="Data type"
            placeholder="Select data type"
            className="max-w-xs"
            name="dataType"
            defaultValue={defaultValue}
            value={value}
            onChange={onChange}
          >
            {items.map((item, index) => {
              return (
                <SelectItem key={item.key} value={item.value}>
                  {item.name}
                </SelectItem>
              );
            })}
          </Select>
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

export default CSelect;
