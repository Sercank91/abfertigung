'use client';

/**
 * LRNInput Component
 *
 * Eingabefeld für die Local Reference Number (LRN)
 */

interface LRNInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function LRNInput({ value, onChange, disabled = false }: LRNInputProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-48 text-sm font-medium text-gray-700">LRN*</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        disabled={disabled}
        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        placeholder="Z.B. AT2025000001"
      />
    </div>
  );
}
