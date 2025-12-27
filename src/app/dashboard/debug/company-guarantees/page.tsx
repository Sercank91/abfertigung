'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DebugReport {
  tenant: string;
  summary: {
    totalCompanies: number;
    totalGuarantees: number;
    totalLinks: number;
  };
  companies: Array<{ id: string; name: string }>;
  guarantees: Array<{ id: string; name: string }>;
  links: Array<{
    id: string;
    companyId: string;
    guaranteeId: string;
    company_name: string;
    guarantee_name: string;
  }>;
  guaranteeStats: Array<{
    id: string;
    name: string;
    companyCount: number;
  }>;
  diagnosis: {
    hasCompanies: boolean;
    hasGuarantees: boolean;
    hasLinks: boolean;
    issue: string;
  };
}

export default function DebugCompanyGuaranteesPage() {
  const router = useRouter();
  const [report, setReport] = useState<DebugReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/debug/company-guarantees');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Fehler beim Laden');
        setLoading(false);
        return;
      }

      setReport(data);
      setLoading(false);
    } catch (err) {
      setError('Netzwerkfehler');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="w-full pb-1 bg-[#f2f2f2]">
          <div className="px-1 flex flex-row flex-nowrap justify-between">
            <h1 className="text-gray-800 text-[1.8rem] font-normal leading-none">
              Debug: Company-Guarantee Verknüpfungen
            </h1>
          </div>
        </div>
        <div className="flex-1 bg-white overflow-auto p-6">
          <div className="text-center py-12">
            <div className="text-[#525252]">Lade Daten...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="w-full pb-1 bg-[#f2f2f2]">
          <div className="px-1 flex flex-row flex-nowrap justify-between">
            <h1 className="text-gray-800 text-[1.8rem] font-normal leading-none">
              Debug: Company-Guarantee Verknüpfungen
            </h1>
          </div>
        </div>
        <div className="flex-1 bg-white overflow-auto p-6">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            <strong>Fehler:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const issueClass = report.diagnosis.issue.startsWith('⚠️') 
    ? 'bg-red-50 border-red-200 text-red-800'
    : report.diagnosis.issue.startsWith('ℹ️')
    ? 'bg-blue-50 border-blue-200 text-blue-800'
    : 'bg-green-50 border-green-200 text-green-800';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="w-full pb-1 bg-[#f2f2f2]">
        <div className="px-1 flex flex-row flex-nowrap justify-between items-center">
          <h1 className="text-gray-800 text-[1.8rem] font-normal leading-none">
            Debug: Company-Guarantee Verknüpfungen
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 text-sm rounded border border-[#525252] text-[#525252] bg-transparent hover:bg-[#525252] hover:text-white"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Diagnose */}
          <div className={`border px-4 py-3 rounded ${issueClass}`}>
            <strong>Diagnose:</strong> {report.diagnosis.issue}
          </div>

          {/* Zusammenfassung */}
          <div className="bg-white border border-[#c6c6c6] rounded p-4">
            <h2 className="text-lg font-bold text-[#525252] mb-3">Zusammenfassung</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-[#525252]">Firmen</div>
                <div className="text-2xl font-bold text-[#0076bc]">{report.summary.totalCompanies}</div>
              </div>
              <div>
                <div className="text-sm text-[#525252]">Bürgschaften</div>
                <div className="text-2xl font-bold text-[#0076bc]">{report.summary.totalGuarantees}</div>
              </div>
              <div>
                <div className="text-sm text-[#525252]">Verknüpfungen</div>
                <div className="text-2xl font-bold text-[#0076bc]">{report.summary.totalLinks}</div>
              </div>
            </div>
          </div>

          {/* Bürgschaften-Statistik */}
          <div className="bg-white border border-[#c6c6c6] rounded p-4">
            <h2 className="text-lg font-bold text-[#525252] mb-3">Bürgschaften-Statistik</h2>
            {report.guaranteeStats.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Bürgschaften vorhanden</p>
            ) : (
              <table className="min-w-full">
                <thead className="bg-[#f2f2f2] border-b border-[#c6c6c6]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase">Bürgschaft</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase">Anzahl Firmen</th>
                  </tr>
                </thead>
                <tbody>
                  {report.guaranteeStats.map((stat, idx) => (
                    <tr key={stat.id} className={idx !== report.guaranteeStats.length - 1 ? 'border-b border-[#e6e6e6]' : ''}>
                      <td className="px-3 py-2 text-sm text-[#525252]">{stat.name}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          stat.companyCount === 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {stat.companyCount} {stat.companyCount === 1 ? 'Firma' : 'Firmen'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Verknüpfungen */}
          <div className="bg-white border border-[#c6c6c6] rounded p-4">
            <h2 className="text-lg font-bold text-[#525252] mb-3">
              Aktuelle Verknüpfungen ({report.links.length})
            </h2>
            {report.links.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Verknüpfungen in der CompanyGuarantee-Tabelle vorhanden</p>
            ) : (
              <table className="min-w-full">
                <thead className="bg-[#f2f2f2] border-b border-[#c6c6c6]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase">Firma</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase">Bürgschaft</th>
                  </tr>
                </thead>
                <tbody>
                  {report.links.map((link, idx) => (
                    <tr key={link.id} className={idx !== report.links.length - 1 ? 'border-b border-[#e6e6e6]' : ''}>
                      <td className="px-3 py-2 text-sm text-[#525252]">{link.company_name}</td>
                      <td className="px-3 py-2 text-sm text-[#525252]">{link.guarantee_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Alle Firmen */}
          <div className="bg-white border border-[#c6c6c6] rounded p-4">
            <h2 className="text-lg font-bold text-[#525252] mb-3">
              Alle Firmen ({report.companies.length})
            </h2>
            {report.companies.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Firmen vorhanden</p>
            ) : (
              <ul className="space-y-1">
                {report.companies.map(company => (
                  <li key={company.id} className="text-sm text-[#525252]">• {company.name}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Alle Bürgschaften */}
          <div className="bg-white border border-[#c6c6c6] rounded p-4">
            <h2 className="text-lg font-bold text-[#525252] mb-3">
              Alle Bürgschaften ({report.guarantees.length})
            </h2>
            {report.guarantees.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Bürgschaften vorhanden</p>
            ) : (
              <ul className="space-y-1">
                {report.guarantees.map(guarantee => (
                  <li key={guarantee.id} className="text-sm text-[#525252]">• {guarantee.name}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Erklärung */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded text-sm">
            <strong>💡 Erklärung:</strong>
            <br />
            Die Anzahl der Firmen bei den Bürgschaften wird aus der <code className="bg-blue-100 px-1">CompanyGuarantee</code>-Tabelle gezählt.
            Wenn dort keine Einträge vorhanden sind, wird "0 Firmen" angezeigt, auch wenn Firmen existieren.
            <br /><br />
            <strong>Mögliche Ursachen:</strong>
            <ul className="list-disc ml-5 mt-2">
              <li>Die Firmen wurden vor der Implementierung der CompanyGuarantee-Tabelle erstellt</li>
              <li>Es gab einen Fehler beim Speichern der Verknüpfungen</li>
              <li>Die Daten wurden manuell in der Datenbank geändert</li>
            </ul>
            <br />
            <strong>Lösung:</strong> Bearbeiten Sie jede Firma in der Firmen-Verwaltung und speichern Sie sie erneut. 
            Dabei werden die Verknüpfungen automatisch in der CompanyGuarantee-Tabelle erstellt.
          </div>
        </div>
      </div>
    </div>
  );
}

