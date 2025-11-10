'use client';

/**
 * DateInputs Component
 *
 * Komponente für Anmeldedatum und Ankunftsdatum
 */

interface DateInputsProps {
  declarationDate: string;
  arrivalDate: string;
  onDeclarationDateChange: (value: string) => void;
  onArrivalDateChange: (value: string) => void;
}

export default function DateInputs({
  declarationDate,
  arrivalDate,
  onDeclarationDateChange,
  onArrivalDateChange,
}: DateInputsProps) {
  return (
    <>
      {/* Anmeldedatum */}
      <div className="flex items-center gap-4">
        <label className="w-48 text-sm font-medium text-gray-700">Anmeldedatum*</label>
        <input
          type="date"
          value={declarationDate}
          onChange={(e) => onDeclarationDateChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Ankunftsdatum */}
      <div className="flex items-center gap-4">
        <label className="w-48 text-sm font-medium text-gray-700">Ankunftsdatum*</label>
        <input
          type="date"
          value={arrivalDate}
          onChange={(e) => onArrivalDateChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
}
