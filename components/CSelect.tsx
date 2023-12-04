import { formatErrorMessage } from "@/lib/errorutil";
import { Select, SelectItem } from "@nextui-org/select";
import { FC } from "react";
import { Control, Controller, FieldErrors, FieldValues } from "react-hook-form";

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
            name="dataType"
            selectionMode="single"
            defaultSelectedKeys={defaultValue ? new Set([defaultValue]) : undefined}
            value={value}
            fullWidth
            onChange={onChange}
            classNames={{
              trigger: "border hover:opacity-75 rounded-lg overflow-hidden dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
              popoverContent: "dark:bg-[#374151] bg-[#F9FAFB]",
              value: "font-medium text-current",
            }}
          >
            {items.map((item, index) => {
              return (
                <SelectItem
                  key={item.key}
                  value={item.value}
                  className="dark:hover:bg-white/10"
                >
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
