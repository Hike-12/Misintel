import { FileUpload } from "@/components/ui/file-upload";

interface ImageUploadProps {
  imagePreview: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageUpload({ imagePreview, onImageChange }: ImageUploadProps) {
  const handleFilesChange = (files: File[]) => {
    if (files.length > 0) {
      // Create a synthetic event to match the existing interface
      const syntheticEvent = {
        target: {
          files: files,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onImageChange(syntheticEvent);
    }
  };

  return (
    <FileUpload
      type="image"
      accept="image/*"
      onChange={handleFilesChange}
      preview={imagePreview}
    />
  );
}
