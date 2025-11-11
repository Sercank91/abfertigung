'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface OcrUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export default function OcrUploadZone({ onUpload, disabled }: OcrUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/tiff',
      'image/bmp',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Ungültiger Dateityp. Bitte nur PDF, PNG, JPG, TIFF oder BMP hochladen.');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Datei zu groß. Maximum: 50 MB');
      return;
    }

    try {
      setUploading(true);
      await onUpload(file);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setUploading(false);
    }
  };

  const openFilePicker = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openFilePicker}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
        onChange={handleFileInput}
        disabled={disabled || uploading}
      />

      {uploading ? (
        <div className="space-y-4">
          <div className="text-5xl">⏳</div>
          <p className="text-lg font-medium text-gray-700">Wird hochgeladen...</p>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <div>
            <p className="text-lg font-medium text-gray-700">
              Dokument hier ablegen oder klicken zum Hochladen
            </p>
            <p className="text-sm text-gray-500 mt-2">
              PDF, PNG, JPG, TIFF oder BMP (max. 50 MB)
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              </svg>
              <span>EX1</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              </svg>
              <span>T1</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              </svg>
              <span>N821</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              </svg>
              <span>Rechnung</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
