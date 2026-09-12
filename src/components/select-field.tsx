"use client";

import { useState } from "react";
import { Select, type SelectOption } from "./select";

/**
 * Drop-in replacement for a native <select name="..."> inside a plain
 * form (GET action or FormData-read onSubmit). Keeps the exact same
 * submit behavior by mirroring the picked value into a hidden native
 * input the form still submits — only the visual control changes.
 */
export function SelectField({
  name,
  defaultValue,
  options,
  className,
  menuClassName,
  hoverClassName,
  id,
}: {
  name: string;
  defaultValue: string;
  options: SelectOption[];
  className?: string;
  menuClassName?: string;
  hoverClassName?: string;
  id?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select
        id={id}
        value={value}
        onChange={setValue}
        options={options}
        className={className}
        menuClassName={menuClassName}
        hoverClassName={hoverClassName}
      />
    </>
  );
}
