'use client';

/**
 * LicensePlateInput Component
 *
 * Komponente für die Eingabe von Kennzeichen mit Typ-Auswahl (30/40)
 * und optionalem zweiten Kennzeichen
 */

interface LicensePlateInputProps {
  // Hauptkennzeichen
  licensePlateType: '30' | '40' | '';
  licensePlate: string;
  licensePlateCountry: string;

  // Zweites Kennzeichen
  hasSecondPlate: boolean;
  secondLicensePlate?: string;
  secondPlateCountry?: string;

  // Callbacks
  onTypeChange: (type: '30' | '40') => void;
  onPlateChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onSecondPlateToggle: () => void;
  onSecondPlateChange: (value: string) => void;
  onSecondCountryChange: (value: string) => void;
}

export default function LicensePlateInput({
  licensePlateType,
  licensePlate,
  licensePlateCountry,
  hasSecondPlate,
  secondLicensePlate,
  secondPlateCountry,
  onTypeChange,
  onPlateChange,
  onCountryChange,
  onSecondPlateToggle,
  onSecondPlateChange,
  onSecondCountryChange,
}: LicensePlateInputProps) {
  return (
    <div className="space-y-3">
      {/* Hauptkennzeichen */}
      <div className="flex items-center gap-4">
        <label className="w-48 text-sm font-medium text-gray-700">Kennzeichen*</label>
        <div className="flex-1 flex gap-2">
          {/* Typ-Auswahl */}
          <select
            value={licensePlateType}
            onChange={(e) => onTypeChange(e.target.value as '30' | '40')}
            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Typ</option>
            <option value="30">30</option>
            <option value="40">40</option>
          </select>

          {/* Kennzeichen */}
          <input
            type="text"
            value={licensePlate}
            onChange={(e) => onPlateChange(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Z.B. W-1234-AB"
          />

          {/* Land */}
          <input
            type="text"
            value={licensePlateCountry}
            onChange={(e) => onCountryChange(e.target.value.toUpperCase())}
            maxLength={2}
            className="w-20 px-3 py-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
            placeholder="AT"
          />

          {/* Zweites Kennzeichen Toggle */}
          <button
            type="button"
            onClick={onSecondPlateToggle}
            className={`px-4 py-2 rounded transition-colors ${
              hasSecondPlate
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={hasSecondPlate ? 'Zweites Kennzeichen entfernen' : 'Zweites Kennzeichen hinzufügen'}
          >
            {hasSecondPlate ? '2 KZ ✓' : '+ 2. KZ'}
          </button>
        </div>
      </div>

      {/* Zweites Kennzeichen (optional) */}
      {hasSecondPlate && (
        <div className="flex items-center gap-4">
          <label className="w-48 text-sm font-medium text-gray-700">2. Kennzeichen</label>
          <div className="flex-1 flex gap-2">
            <div className="w-[90px]"></div> {/* Spacer für Alignment mit Typ-Dropdown */}

            {/* Zweites Kennzeichen */}
            <input
              type="text"
              value={secondLicensePlate || ''}
              onChange={(e) => onSecondPlateChange(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Z.B. B-5678-CD"
            />

            {/* Land */}
            <input
              type="text"
              value={secondPlateCountry || ''}
              onChange={(e) => onSecondCountryChange(e.target.value.toUpperCase())}
              maxLength={2}
              className="w-20 px-3 py-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
              placeholder="DE"
            />

            <div className="w-[100px]"></div> {/* Spacer für Alignment mit Toggle-Button */}
          </div>
        </div>
      )}
    </div>
  );
}
