import { FileUpload } from "@/components/ui/file-upload";

interface VideoUploadProps {
  videoPreview: string;
  onVideoChange: (file: File) => void;
}

export function VideoUpload({ videoPreview, onVideoChange }: VideoUploadProps) {
  const handleFilesChange = (files: File[]) => {
    if (files.length > 0) {
      onVideoChange(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-400 text-sm">
          ⚠️ <strong>Note:</strong> Direct video links (YouTube, Vimeo, etc.) are not supported. 
          Please upload a video file instead.
        </p>
      </div>
      <FileUpload
        type="video"
        accept="video/*"
        onChange={handleFilesChange}
        preview={videoPreview}
      />
    </div>
  );
}