'use client';

/**
 * WorkflowSidebar Component
 *
 * Rechte Sidebar die Validierungsfehler und gespeicherte Werte anzeigt
 */

interface WorkflowItem {
  label: string;
  value: string;
}

interface WorkflowSidebarProps {
  errors: string[];
  savedItems: WorkflowItem[];
}

export default function WorkflowSidebar({ errors, savedItems }: WorkflowSidebarProps) {
  const hasContent = errors.length > 0 || savedItems.length > 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Workflow-Status</h3>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="mb-4 space-y-2">
          {errors.map((error, idx) => (
            <div key={idx} className="text-red-600 text-sm flex items-start gap-2">
              <span className="text-red-600 flex-shrink-0 mt-0.5">✗</span>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Saved Items */}
      {savedItems.length > 0 && (
        <div className="space-y-2">
          {savedItems.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <span className="text-green-600 flex-shrink-0 mt-0.5">✓</span>
              <div>
                <span className="font-medium text-gray-900">{item.label}:</span>
                <span className="ml-1 text-gray-700">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!hasContent && (
        <p className="text-gray-400 text-sm italic">Noch keine Einträge</p>
      )}
    </div>
  );
}
