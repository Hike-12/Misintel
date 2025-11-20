interface ExtensionControlsProps {
  onScanPage: () => void;
  onClearHighlights: () => void;
}

export function ExtensionControls({ onScanPage, onClearHighlights }: ExtensionControlsProps) {
  return (
    <div className="mb-6 space-y-2">
      <button
        type="button"
        onClick={onScanPage}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center text-sm gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Scan This Page for Misinformation
      </button>
      <button
        type="button"
        onClick={onClearHighlights}
        className="w-full bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center text-xs gap-2"
      >
        Clear Highlights
      </button>
    </div>
  );
}
