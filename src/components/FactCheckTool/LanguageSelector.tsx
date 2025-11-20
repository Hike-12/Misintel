import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/lib/translation-types';

interface LanguageSelectorProps {
  selectedLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  translating: boolean;
}

export function LanguageSelector({ selectedLanguage, onLanguageChange, translating }: LanguageSelectorProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Languages className="w-4 h-4 text-neutral-400" />
        <span className="text-xs text-neutral-400">Language:</span>
      </div>
      <Select
        value={selectedLanguage}
        onValueChange={onLanguageChange}
        disabled={translating}
      >
        <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SUPPORTED_LANGUAGES).map(
            ([code, name]) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
