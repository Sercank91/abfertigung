'use client';

import { useState } from 'react';

interface Position {
  id: string;
  orderNumber: number;
  hsCode: string;
  description: string;
  netWeight: number;
  grossWeight: number;
  procedure: string | null;
  procedureType: string | null;
  value: number | null;
  currency: string | null;
}

interface Address {
  name?: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
}

interface Shipment {
  id: string;
  mrn: string | null;
  documentType: string | null;
  procedureType: string | null;
  commonSender: Address | null;
  commonReceiver: Address | null;
  commonOriginCountry?: string | null;
  commonDestCountry?: string | null;
  totalPackages?: number | null;
  totalGrossWeight: number | null;
  totalNetWeight: number | null;
  totalValue: number | null;
  currency: string | null;
  verified: boolean;
  positionCount: number;
  positions: Position[];
}

interface OcrDocumentCardProps {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  shipmentCount: number;
  shipments: Shipment[];
  onDelete?: (id: string) => void;
}

export default function OcrDocumentCard({
  id,
  fileName,
  fileSize,
  status,
  progress,
  errorMessage,
  processedAt,
  createdAt,
  shipmentCount,
  shipments,
  onDelete,
}: OcrDocumentCardProps) {
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (address: Address | null) => {
    if (!address) return '-';
    const parts = [];
    if (address.name) parts.push(address.name);
    if (address.address) parts.push(address.address);
    if (address.zip || address.city) {
      const cityParts = [address.zip, address.city].filter(Boolean);
      parts.push(cityParts.join(' '));
    }
    if (address.country) parts.push(address.country);
    return parts.join(', ') || '-';
  };

  const toggleShipment = (shipmentId: string) => {
    setExpandedShipments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(shipmentId)) {
        newSet.delete(shipmentId);
      } else {
        newSet.add(shipmentId);
      }
      return newSet;
    });
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
            Wartend
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            Verarbeitung {progress}%
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
            Abgeschlossen
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
            Fehler
          </span>
        );
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
            </svg>
            <div>
              <p className="font-medium text-gray-900">{fileName}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(fileSize)} • {formatDate(createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {onDelete && (
              <button
                onClick={() => onDelete(id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Dokument löschen"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {(status === 'processing' || status === 'pending') && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-blue-700">{progress}%</span>
          </div>
          <p className="text-sm text-blue-600 mt-2">
            {status === 'pending' ? 'Warte auf Verarbeitung...' : 'OCR-Verarbeitung läuft...'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {status === 'failed' && errorMessage && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <div className="flex gap-2">
            <svg className="h-5 w-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Shipments */}
      {status === 'completed' && shipmentCount > 0 && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Extrahierte Sendungen ({shipmentCount})
            </h4>
            {processedAt && (
              <span className="text-sm text-gray-500">
                Verarbeitet: {formatDate(processedAt)}
              </span>
            )}
          </div>

          {shipments.map((shipment) => {
            const isExpanded = expandedShipments.has(shipment.id);

            return (
              <div
                key={shipment.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Shipment Header */}
                <div
                  className="bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleShipment(shipment.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">
                          {shipment.mrn || 'Keine MRN'}
                        </p>
                        <div className="flex gap-4 text-sm text-gray-500 mt-1">
                          {shipment.documentType && (
                            <span>Typ: {shipment.documentType}</span>
                          )}
                          {shipment.procedureType && (
                            <span className="font-medium text-blue-600">
                              {shipment.procedureType}
                            </span>
                          )}
                          <span>{shipment.positionCount} Positionen</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {shipment.totalPackages && (
                        <span>{shipment.totalPackages} Packstücke</span>
                      )}
                      {shipment.totalNetWeight && (
                        <span>{shipment.totalNetWeight.toFixed(2)} kg</span>
                      )}
                      {shipment.totalValue && shipment.currency && (
                        <span>
                          {shipment.totalValue.toLocaleString('de-DE')} {shipment.currency}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Positions (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {/* Sendungsdetails */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {/* Linke Spalte */}
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-gray-700">Absender:</span>
                            <p className="text-gray-900 mt-0.5">{formatAddress(shipment.commonSender)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Versendungsland:</span>
                            <p className="text-gray-900 mt-0.5">
                              {shipment.commonOriginCountry || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Rechte Spalte */}
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-gray-700">Empfänger:</span>
                            <p className="text-gray-900 mt-0.5">{formatAddress(shipment.commonReceiver)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Bestimmungsland:</span>
                            <p className="text-gray-900 mt-0.5">
                              {shipment.commonDestCountry || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Gewicht und Packstücke */}
                        <div className="col-span-2 flex gap-6 pt-2 border-t border-gray-200">
                          {shipment.totalPackages && (
                            <div>
                              <span className="font-medium text-gray-700">Packstücke:</span>
                              <span className="ml-2 text-gray-900">{shipment.totalPackages}</span>
                            </div>
                          )}
                          {shipment.totalGrossWeight && (
                            <div>
                              <span className="font-medium text-gray-700">Rohmasse:</span>
                              <span className="ml-2 text-gray-900">
                                {shipment.totalGrossWeight.toFixed(2)} kg
                              </span>
                            </div>
                          )}
                          {shipment.totalNetWeight && (
                            <div>
                              <span className="font-medium text-gray-700">Nettomasse:</span>
                              <span className="ml-2 text-gray-900">
                                {shipment.totalNetWeight.toFixed(2)} kg
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Pos
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              HS-Code
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Beschreibung
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Nettogewicht
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Wert
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              Verfahren
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(shipment.positions || []).map((position) => (
                            <tr key={position.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {position.orderNumber}
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                {position.hsCode}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {position.description}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">
                                {position.netWeight.toFixed(2)} kg
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">
                                {position.value && position.currency
                                  ? `${position.value.toLocaleString('de-DE')} ${position.currency}`
                                  : '-'}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {position.procedureType && (
                                  <span
                                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                      position.procedureType === 'T1'
                                        ? 'bg-orange-100 text-orange-800'
                                        : position.procedureType === 'T2'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {position.procedureType}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No Shipments */}
      {status === 'completed' && shipmentCount === 0 && (
        <div className="p-4 text-center text-gray-500">
          <p>Keine Sendungen gefunden</p>
        </div>
      )}
    </div>
  );
}
