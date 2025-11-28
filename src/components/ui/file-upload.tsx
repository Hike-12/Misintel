"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { Upload, FileAudio, FileVideo, Image } from "lucide-react";
import { useDropzone } from "react-dropzone";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export type FileUploadType = "image" | "video" | "audio" | "any";

interface FileUploadProps {
  onChange?: (files: File[]) => void;
  accept?: string;
  type?: FileUploadType;
  multiple?: boolean;
  maxFiles?: number;
  preview?: string;
  className?: string;
}

const typeConfig = {
  image: {
    icon: Image,
    label: "Upload Image",
    description: "Drag or drop your image here or click to upload",
  },
  video: {
    icon: FileVideo,
    label: "Upload Video",
    description: "Drag or drop your video here or click to upload",
  },
  audio: {
    icon: FileAudio,
    label: "Upload Audio",
    description: "Drag or drop your audio here or click to upload",
  },
  any: {
    icon: Upload,
    label: "Upload File",
    description: "Drag or drop your files here or click to upload",
    hint: "",
  },
};

export const FileUpload = ({
  onChange,
  accept,
  type = "any",
  multiple = false,
  maxFiles = 1,
  preview,
  className,
}: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleFileChange = (newFiles: File[]) => {
    const filesToSet = multiple ? newFiles : newFiles.slice(0, 1);
    setFiles(filesToSet);
    onChange && onChange(filesToSet);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple,
    maxFiles,
    noClick: true,
    accept: accept ? { [accept]: [] } : undefined,
    onDrop: handleFileChange,
    onDropRejected: (error) => {
      console.log(error);
    },
  });

  const hasPreview = preview || files.length > 0;

  return (
    <div className={cn("w-full", className)} {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className={cn(
          "p-6 group/file block rounded-lg cursor-pointer w-full relative overflow-hidden",
          "border border-dashed border-neutral-700 hover:border-neutral-500 transition-colors",
          isDragActive && "border-neutral-400 bg-neutral-900/50"
        )}
      >
        <input
          ref={fileInputRef}
          id={`file-upload-${type}`}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        
        <div className="flex flex-col items-center justify-center relative z-10">
          {hasPreview ? (
            <div className="space-y-4 w-full">
              {/* Image Preview */}
              {type === "image" && preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-60 mx-auto rounded-lg"
                />
              )}
              
              {/* Video Preview */}
              {type === "video" && preview && (
                <video
                  controls
                  src={preview}
                  className="max-h-60 mx-auto rounded-lg"
                />
              )}
              
              {/* Audio Preview */}
              {type === "audio" && preview && (
                <audio
                  controls
                  src={preview}
                  className="w-full rounded-lg"
                  style={{
                    filter: "invert(0.9) hue-rotate(180deg)",
                  }}
                />
              )}
              
              {/* File Cards */}
              {files.map((file, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? `file-upload-${type}` : `file-upload-${type}-${idx}`}
                  className={cn(
                    "relative overflow-hidden z-40 bg-neutral-900/80 backdrop-blur-sm",
                    "flex flex-col items-start justify-start p-4 w-full mx-auto rounded-lg",
                    "border border-neutral-700/50"
                  )}
                >
                  <div className="flex justify-between w-full items-center gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="text-sm text-neutral-300 truncate max-w-xs"
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="rounded-lg px-2 py-1 w-fit shrink-0 text-xs text-neutral-400 bg-neutral-800"
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>

                  <div className="flex text-xs md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between text-neutral-500">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="px-2 py-0.5 rounded-md bg-neutral-800"
                    >
                      {file.type}
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                    >
                      modified {new Date(file.lastModified).toLocaleDateString()}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
              
              <p className="text-neutral-400 text-sm text-center">
                Click to change {type}
              </p>
            </div>
          ) : (
            <>
              <div className="relative w-full max-w-xl mx-auto">
                <motion.div
                  layoutId={`file-upload-${type}`}
                  variants={mainVariant}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                  className={cn(
                    "relative group-hover/file:shadow-2xl z-40",
                    "bg-neutral-900 flex items-center justify-center",
                    "h-24 mt-16 w-full max-w-[6rem] mx-auto rounded-lg",
                    "shadow-[0px_10px_50px_rgba(0,0,0,0.3)]",
                    "border border-neutral-700/50"
                  )}
                >
                  {isDragActive ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-neutral-400 flex flex-col items-center gap-2"
                    >
                      <span className="text-sm">Drop it</span>
                      <Upload className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <Icon className="h-6 w-6 text-neutral-400" />
                  )}
                </motion.div>

                <motion.div
                  variants={secondaryVariant}
                  className={cn(
                    "absolute opacity-0 border border-dashed border-neutral-500",
                    "inset-0 z-30 bg-transparent flex items-center justify-center",
                    "h-24 w-full max-w-[6rem] mx-auto rounded-lg"
                  )}
                />
              </div>
              
              <p className="relative z-20 font-medium text-neutral-300 text-base mt-6">
                {config.label}
              </p>
              <p className="relative z-20 text-neutral-500 text-sm mt-2 text-center">
                {config.description}
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-neutral-600 shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px scale-105 opacity-30">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={cn(
                "w-10 h-10 flex shrink-0 rounded-[2px]",
                index % 2 === 0
                  ? "bg-neutral-900"
                  : "bg-neutral-900 shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              )}
            />
          );
        })
      )}
    </div>
  );
}

export default FileUpload;