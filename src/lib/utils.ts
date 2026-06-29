import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Document } from "@langchain/core/documents";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import path from "path";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}




export const formatDocumentsAsString = (documents: Document[]): string => {
  return documents.map((doc) => doc?.pageContent).join("\n\n");
};

export function truncateTitle(title: string, maxLength = 38): string {
  if (!title) return "";
  return title.length > maxLength
    ? title.substring(0, maxLength) + "..."
    : title;
}



//  Success toast
export const showSuccess = (message?: string) => {
  toast.success(message, {
    position: "bottom-right",
    autoClose: 3000,
    theme: "colored",
  });
};

//  Error toast
export const showError = (message: string) => {
  toast.error(message, {
    position: "bottom-left",
    autoClose: 4000,
    theme: "colored",
  });
};

//  Info toast
export const showInfo = (message: string) => {
  toast.info(message, {
    position: "bottom-right",
    autoClose: 5000,
    theme: "colored",
  });
};


export const generateFileName = (fileName: string) => {
  const timestamp = Date.now();
  const ext = fileName.substring(fileName.lastIndexOf("."));
  const baseName = fileName
    .substring(0, fileName.lastIndexOf("."))
    .toLowerCase()
    .replace(/\s+/g, "");

  return `${baseName}-${timestamp}${ext}`;
};

export function getFileExtension(filePath:string){
    
      const extentionWithoutDot=path.extname(filePath).replace('.',' ')
      return extentionWithoutDot
}

export function generateUniqueFileName(prefix = "doc", extension = "txt"): string {
  const timestamp = Date.now(); // current timestamp in ms
  const randomStr = crypto.randomBytes(3).toString("hex"); // random 6-character hex string
  return `${prefix}-${timestamp}-${randomStr}.${extension}`;
}


export function formatUpdatedAt(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}