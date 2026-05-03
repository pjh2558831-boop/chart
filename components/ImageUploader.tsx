"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

import { validateImageFile } from "../lib/validators";

type ImageUploaderProps = {
  file: File | null;
  disabled?: boolean;
  onFileSelect: (file: File | null) => void;
};

export default function ImageUploader({
  file,
  disabled = false,
  onFileSelect,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFile = async (selectedFile?: File) => {
    if (!selectedFile) {
      return;
    }

    setValidationError(null);

    try {
      await validateImageFile(selectedFile);
      onFileSelect(selectedFile);
    } catch (error) {
      onFileSelect(null);
      setValidationError(
        error instanceof Error ? error.message : "이미지 검증 중 오류가 발생했습니다.",
      );
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled) {
      return;
    }

    void handleFile(event.dataTransfer.files?.[0]);
  };

  const removeImage = () => {
    onFileSelect(null);
    setValidationError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
      <label
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className={[
          "flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition",
          isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50",
          disabled ? "cursor-not-allowed opacity-70" : "hover:border-blue-500 hover:bg-blue-50",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          disabled={disabled}
          onChange={handleInputChange}
          className="sr-only"
        />
        <span className="text-base font-semibold text-slate-900">
          차트 이미지를 선택하거나 여기에 끌어다 놓으세요
        </span>
        <span className="mt-2 text-sm text-slate-600">
          PNG, JPG, JPEG, WEBP · 최대 5MB · 최대 3000px x 3000px
        </span>
      </label>

      {validationError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError}
        </div>
      ) : null}

      {previewUrl ? (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{file?.name}</p>
              <p className="text-xs text-slate-500">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={removeImage}
              disabled={disabled}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              이미지 제거
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img
              src={previewUrl}
              alt="업로드 이미지 미리보기"
              className="max-h-[420px] w-full object-contain"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
