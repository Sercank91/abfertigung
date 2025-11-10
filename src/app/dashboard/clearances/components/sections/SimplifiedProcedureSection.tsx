'use client';

/**
 * SimplifiedProcedureSection Component
 *
 * Checkbox für vereinfachtes Verfahren mit Info-Text
 * Zeigt bedingt GoodsLocationSelector und AuthorizationSelector
 */

interface SimplifiedProcedureSectionProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export default function SimplifiedProcedureSection({
  isEnabled,
  onToggle,
}: SimplifiedProcedureSectionProps) {
  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={onToggle}
          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          id="simplifiedProcedure"
        />
      </div>
      <div className="flex-1">
        <label htmlFor="simplifiedProcedure" className="font-medium text-gray-900 cursor-pointer">
          Vereinfachtes Verfahren
        </label>
        <p className="text-sm text-gray-600 mt-1">
          Bei aktiviertem vereinfachtem Verfahren sind Warenort und Bewilligung Pflichtfelder.
        </p>
      </div>
    </div>
  );
}
