import { InputType } from './types';

interface InputTypeSelectorProps {
  inputType: InputType;
  onInputTypeChange: (type: InputType) => void;
}

export function InputTypeSelector({ inputType, onInputTypeChange }: InputTypeSelectorProps) {
  return (
    <div className="flex gap-3 mb-6 justify-center">
      {(["text", "url", "image", "video"] as const).map((type) => (
        <button
          key={type}
          onClick={() => onInputTypeChange(type)}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm border ${
            inputType === type
              ? "bg-gradient-to-b from-neutral-50 to-neutral-400 text-black border-transparent"
              : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-neutral-200"
          }`}
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}
    </div>
  );
}