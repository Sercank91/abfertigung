'use client';

import { useState, useCallback, useEffect } from 'react';

interface OcrDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  taskId: string | null;
  shipmentCount: number;
  shipments: Shipment[];
}

interface Shipment {
  id: string;
  mrn: string | null;
  documentType: string | null;
  procedureType: string | null;
  commonSender: any;
  commonReceiver: any;
  totalPackages: number | null;
  totalGrossWeight: number | null;
  totalNetWeight: number | null;
  totalValue: number | null;
  currency: string | null;
  invoiceNumbers: string[];
  verified: boolean;
  positionCount: number;
  positions: Position[];
}

interface Position {
  id: string;
  orderNumber: number;
  hsCode: string;
  description: string;
  netWeight: number;
  grossWeight: number;
  procedure: string | null;
  procedureType: string | null;
  sender: any;
  receiver: any;
  value: number | null;
  currency: string | null;
  invoiceNumber: string | null;
}

interface UseOcrDocumentsReturn {
  documents: OcrDocument[];
  loading: boolean;
  error: string | null;
  uploadFile: (file: File, clearanceId: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
}

export function useOcrDocuments(clearanceId: string): UseOcrDocumentsReturn {
  const [documents, setDocuments] = useState<OcrDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!clearanceId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ocr/documents/${clearanceId}`);

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Dokumente');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Fehler beim Laden der OCR-Dokumente:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [clearanceId]);

  const uploadFile = async (file: File, clearanceId: string) => {
    try {
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('clearanceId', clearanceId);

      const response = await fetch('/api/ocr/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload fehlgeschlagen');
      }

      // Nach Upload Liste neu laden
      await fetchDocuments();

      // Polling für Progress starten
      const data = await response.json();
      if (data.documentId) {
        startProgressPolling(data.documentId);
      }
    } catch (err) {
      console.error('Upload-Fehler:', err);
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
      throw err;
    }
  };

  const startProgressPolling = (documentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ocr/status/${documentId}`);
        if (!response.ok) return;

        const data = await response.json();

        // Update document in list
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === documentId
              ? {
                  ...doc,
                  status: data.status,
                  progress: data.progress,
                  errorMessage: data.errorMessage,
                  processedAt: data.processedAt,
                  shipments: data.shipments || [],
                  shipmentCount: (data.shipments || []).length,
                }
              : doc
          )
        );

        // Stop polling wenn completed oder failed
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval);
          await fetchDocuments(); // Final refresh
        }
      } catch (err) {
        console.error('Progress polling error:', err);
      }
    }, 2000); // Poll alle 2 Sekunden

    // Cleanup nach 5 Minuten
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
  };

  const deleteDocument = async (documentId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/ocr/document/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Löschen fehlgeschlagen');
      }

      // Nach Löschen Liste neu laden
      await fetchDocuments();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
      throw err;
    }
  };

  const refreshDocuments = useCallback(async () => {
    await fetchDocuments();
  }, [fetchDocuments]);

  // Initial load
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    error,
    uploadFile,
    refreshDocuments,
    deleteDocument,
  };
}
