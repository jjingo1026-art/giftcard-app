import { useState, useRef } from "react";

export interface ImageUploadResult {
  objectPath: string;
  serveUrl: string;
}

export function useImageUpload(onUploaded: (result: ImageUploadResult) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setIsUploading(true);
    try {
      // 1. 프리사인드 URL 요청
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("업로드 URL 요청 실패");
      const { uploadURL, objectPath } = await urlRes.json();

      // 2. GCS에 직접 업로드
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) throw new Error("파일 업로드 실패");

      // objectPath: "/objects/..." → 서빙 URL: "/api/storage/objects/..."
      const serveUrl = `/api/storage${objectPath}`;
      onUploaded({ objectPath, serveUrl });
    } catch (e) {
      console.error("이미지 업로드 오류:", e);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return { inputRef, openPicker, onChange, isUploading };
}
