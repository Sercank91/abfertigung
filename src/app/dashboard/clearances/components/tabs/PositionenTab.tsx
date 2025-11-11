'use client';

import { useOcrDocuments } from '../../hooks/useOcrDocuments';
import OcrUploadZone from '../ocr/OcrUploadZone';
import OcrDocumentCard from '../ocr/OcrDocumentCard';

interface PositionenTabProps {
  clearanceId: string;
  onNext: () => void;
}

export default function PositionenTab({ clearanceId, onNext }: PositionenTabProps) {
  const { documents, loading, error, uploadFile, refreshDocuments, deleteDocument } = useOcrDocuments(clearanceId);

  const handleUpload = async (file: File) => {
    await uploadFile(file, clearanceId);
  };

  const handleDelete = async (documentId: string) => {
    if (confirm('Möchten Sie dieses Dokument wirklich löschen?')) {
      await deleteDocument(documentId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">OCR-Upload & Positionen</h3>
        <p className="text-sm text-gray-500 mt-1">
          Laden Sie Zolldokumente (EX1, T1, N821, Rechnungen) hoch und lassen Sie sie automatisch
          verarbeiten.
        </p>
      </div>

      {/* Upload Zone */}
      <OcrUploadZone onUpload={handleUpload} disabled={!clearanceId} />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-2">
            <svg
              className="h-5 w-5 text-red-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && documents.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
          <p className="text-gray-500 mt-4">Lade Dokumente...</p>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Hochgeladene Dokumente ({documents.length})
            </h4>
            <button
              onClick={refreshDocuments}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Aktualisieren
            </button>
          </div>

          {documents.map((doc) => (
            <OcrDocumentCard key={doc.id} {...doc} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && documents.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Noch keine Dokumente hochgeladen</p>
          <p className="text-xs text-gray-400 mt-1">
            Laden Sie oben ein Dokument hoch um zu beginnen
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Weiter zur Zusammenfassung →
        </button>
      </div>
    </div>
  );
}
