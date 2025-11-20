import { InputType } from './types';

interface TextInputProps {
  inputType: InputType;
  value: string;
  onChange: (value: string) => void;
}

export function TextInput({ inputType, value, onChange }: TextInputProps) {
  return (
    <textarea
      className="w-full p-4 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 transition-all duration-200 bg-neutral-900/30 text-neutral-100 placeholder-neutral-500 text-sm resize-none"
      rows={inputType === "text" ? 4 : 2}
      placeholder={
        inputType === "text"
          ? "Paste text to verify..."
          : "Enter URL to verify..."
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
    />
  );
}
