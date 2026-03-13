import { useRef, useState } from "react";
import { formatCOP, formatCOPForInput, parseCOPInput } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  /** The numeric value (undefined = empty field) */
  value: number | undefined;
  /** Called whenever the user changes the input. undefined means empty. */
  onChange: (val: number | undefined) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Additional class names for the underlying <input> */
  className?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** id for label association */
  id?: string;
}

/**
 * A text input that:
 * - Displays numbers formatted with COP thousand separators (dots) while typing.
 * - Uses comma as the decimal separator (Colombian locale: es-CO).
 * - Supports up to 2 decimal places.
 * - Starts empty when value is undefined — no default 0 prepended.
 * - Prevents the "010000" leading-zero bug.
 * - Reports raw numeric values (or undefined when empty) to the parent.
 *
 * Examples:
 *   User types "1000000"    → displays "1.000.000"   → reports 1000000
 *   User types "1000000,50" → displays "1.000.000,50" → reports 1000000.5
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  disabled,
  id,
}: CurrencyInputProps) {
  // Local display string — we format integers in real-time but let the user
  // type the decimal part freely until blur.
  const [rawInput, setRawInput] = useState<string>(() =>
    value !== undefined ? formatCOPForInput(value) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value changes (e.g. form reset / initialData applied).
  const externalValueStr = value !== undefined ? formatCOPForInput(value) : "";
  const rawAsNumber = parseCOPInput(rawInput);
  const rawMatchesExternal =
    (isNaN(rawAsNumber) && value === undefined) || rawAsNumber === value;
  const displayValue = rawMatchesExternal ? rawInput : externalValueStr;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;

    // Strip visual dot thousands separators so we can work with the raw digits.
    const withoutDots = typed.replace(/\./g, "");

    // Allow only digits and at most one comma (decimal separator).
    const sanitized = withoutDots.replace(/[^\d,]/g, "");

    if (sanitized === "") {
      setRawInput("");
      onChange(undefined);
      return;
    }

    // Split into integer and optional decimal parts.
    const commaIndex = sanitized.indexOf(",");
    const hasComma = commaIndex !== -1;
    const intPart = hasComma ? sanitized.slice(0, commaIndex) : sanitized;
    const decPart = hasComma ? sanitized.slice(commaIndex + 1, commaIndex + 3) : undefined;

    // Format the integer portion with thousands separators.
    const intNum = intPart === "" ? 0 : Number(intPart);
    const formattedInt = isNaN(intNum) ? "0" : formatCOP(intNum);

    // Build the display string: keep the comma + user's typed decimal chars
    // exactly as typed (so they can type "1.000," before adding digits).
    const display = hasComma ? `${formattedInt},${decPart ?? ""}` : formattedInt;
    setRawInput(display);

    // Report the numeric value only when we have a complete parseable number.
    const fullStr = hasComma
      ? `${intPart}.${decPart ?? "0"}` // JS decimal format
      : intPart;
    const num = parseFloat(fullStr);
    if (!isNaN(num)) {
      onChange(num);
    } else {
      onChange(undefined);
    }
  };

  const handleBlur = () => {
    if (rawInput === "" || rawInput === ",") {
      setRawInput("");
      onChange(undefined);
      return;
    }
    const num = parseCOPInput(rawInput);
    if (!isNaN(num)) {
      // On blur, fully re-format with exactly 2 decimal places.
      setRawInput(formatCOPForInput(num));
      onChange(num);
    }
  };

  const handleFocus = () => {
    inputRef.current?.setSelectionRange(
      inputRef.current.value.length,
      inputRef.current.value.length
    );
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}
