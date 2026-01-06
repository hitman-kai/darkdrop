'use client';

interface TgInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'password';
  disabled?: boolean;
  className?: string;
}

export function TgInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  className = '',
}: TgInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`tg-input ${className}`}
    />
  );
}

