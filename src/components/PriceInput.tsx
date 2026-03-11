import React from 'react';

interface PriceInputProps {
  value: string; // raw numeric string, e.g. "1500000"
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

/** Convert raw string "1500000" → display "1.500.000" */
function toDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const n = parseInt(digits, 10);
  if (isNaN(n)) return '';
  // vi-VN locale uses "." as thousand separator
  return new Intl.NumberFormat('vi-VN').format(n);
}

export default function PriceInput({
  value,
  onChange,
  placeholder,
  className,
  style,
  onFocus,
  onBlur,
}: PriceInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip everything except digits
    const raw = e.target.value.replace(/\D/g, '');
    onChange(raw);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={toDisplay(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}
