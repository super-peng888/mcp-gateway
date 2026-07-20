import { Search } from "lucide-react"
import { Button, Input } from "antd"
import type { SearchField } from "@/hooks/useTable"

export interface SearchFormProps<
  S extends Record<string, string> = Record<string, string>,
> {
  searchFormSchema: SearchField<S>[]
  values: S
  onChange: (values: S) => void
  onSearch: (values: S) => void
  className?: string
  inline?: boolean
}

export function SearchForm<
  S extends Record<string, string> = Record<string, string>,
>({
  searchFormSchema,
  values,
  onChange,
  onSearch,
  className = "",
  inline = false,
}: SearchFormProps<S>) {
  const handleChange = (key: keyof S & string, value: string) => {
    onChange({ ...values, [key]: value } as S)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch(values)
    }
  }

  return (
    <div
      className={`flex items-center gap-2 ${inline ? "flex-nowrap" : "flex-wrap"} ${className}`}
    >
      {searchFormSchema.map((field) => (
        <div key={field.key} className="w-full md:w-48">
          {field.render ? (
            field.render(values[field.key], (v) => handleChange(field.key, v))
          ) : (
            <Input
              value={values[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={field.placeholder ?? field.label}
              prefix={
                field.icon ? (
                  <span className="text-[#9ca3af]">{field.icon}</span>
                ) : undefined
              }
              className="h-9 text-sm"
              allowClear
            />
          )}
        </div>
      ))}
      <Button
        type="primary"
        icon={<Search className="size-4" />}
        onClick={() => onSearch(values)}
      >
        搜索
      </Button>
    </div>
  )
}
