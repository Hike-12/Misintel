interface ImageUploadProps {
  imagePreview: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageUpload({ imagePreview, onImageChange }: ImageUploadProps) {
  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-neutral-700 rounded-lg p-8 text-center hover:border-neutral-500 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={onImageChange}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          {imagePreview ? (
            <div className="space-y-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg"
              />
              <p className="text-neutral-400 text-sm">
                Click to change image
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto bg-neutral-800 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-neutral-300">
                Click to upload an image
              </p>
              <p className="text-neutral-500 text-xs">
                The tool will extract and verify text from the image
              </p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
}
