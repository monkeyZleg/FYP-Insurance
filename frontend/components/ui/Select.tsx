import type { SelectHTMLAttributes } from "react";
import { ChevronDownRegular } from "@fluentui/react-icons";

/** Native <select> dressed as a WinUI ComboBox. */
export default function Select({ className = "", wrapClassName = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { wrapClassName?: string }) {
  return (
    <span className={`select-wrap ${wrapClassName}`}>
      <select className={`textbox ${className}`} {...rest}>
        {children}
      </select>
      <ChevronDownRegular aria-hidden />
    </span>
  );
}
