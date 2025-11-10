/**
 * Countries Utilities
 * Funktionen für Länder und Ländercodes
 */

interface Country {
  code: string;
  name: string;
  flag?: string;
}

/**
 * Liste aller EU- und wichtiger Nicht-EU-Länder für den Zollverkehr
 */
export const COUNTRIES: Country[] = [
  // EU-Länder
  { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgien', flag: '🇧🇪' },
  { code: 'BG', name: 'Bulgarien', flag: '🇧🇬' },
  { code: 'HR', name: 'Kroatien', flag: '🇭🇷' },
  { code: 'CY', name: 'Zypern', flag: '🇨🇾' },
  { code: 'CZ', name: 'Tschechien', flag: '🇨🇿' },
  { code: 'DK', name: 'Dänemark', flag: '🇩🇰' },
  { code: 'EE', name: 'Estland', flag: '🇪🇪' },
  { code: 'FI', name: 'Finnland', flag: '🇫🇮' },
  { code: 'FR', name: 'Frankreich', flag: '🇫🇷' },
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'GR', name: 'Griechenland', flag: '🇬🇷' },
  { code: 'HU', name: 'Ungarn', flag: '🇭🇺' },
  { code: 'IE', name: 'Irland', flag: '🇮🇪' },
  { code: 'IT', name: 'Italien', flag: '🇮🇹' },
  { code: 'LV', name: 'Lettland', flag: '🇱🇻' },
  { code: 'LT', name: 'Litauen', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxemburg', flag: '🇱🇺' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'NL', name: 'Niederlande', flag: '🇳🇱' },
  { code: 'PL', name: 'Polen', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'RO', name: 'Rumänien', flag: '🇷🇴' },
  { code: 'SK', name: 'Slowakei', flag: '🇸🇰' },
  { code: 'SI', name: 'Slowenien', flag: '🇸🇮' },
  { code: 'ES', name: 'Spanien', flag: '🇪🇸' },
  { code: 'SE', name: 'Schweden', flag: '🇸🇪' },

  // Nicht-EU-Länder (wichtig für Transit)
  { code: 'CH', name: 'Schweiz', flag: '🇨🇭' },
  { code: 'NO', name: 'Norwegen', flag: '🇳🇴' },
  { code: 'GB', name: 'Vereinigtes Königreich', flag: '🇬🇧' },
  { code: 'TR', name: 'Türkei', flag: '🇹🇷' },
  { code: 'RS', name: 'Serbien', flag: '🇷🇸' },
  { code: 'BA', name: 'Bosnien und Herzegowina', flag: '🇧🇦' },
  { code: 'MK', name: 'Nordmazedonien', flag: '🇲🇰' },
  { code: 'AL', name: 'Albanien', flag: '🇦🇱' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'MD', name: 'Moldawien', flag: '🇲🇩' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'RU', name: 'Russland', flag: '🇷🇺' },
];

/**
 * Gibt den vollständigen Ländernamen für einen Ländercode zurück
 *
 * @param code - ISO 3166-1 Alpha-2 Ländercode (z.B. "AT", "DE")
 * @returns Ländername oder Code wenn nicht gefunden
 *
 * @example
 * getCountryName("AT") // → "Österreich"
 * getCountryName("DE") // → "Deutschland"
 * getCountryName("XX") // → "XX" (unbekannt)
 */
export function getCountryName(code: string): string {
  if (!code) return '';

  const country = COUNTRIES.find(c => c.code === code.toUpperCase());
  return country ? country.name : code;
}

/**
 * Gibt die Länderflagge für einen Ländercode zurück
 *
 * @param code - ISO 3166-1 Alpha-2 Ländercode
 * @returns Emoji-Flagge oder leeren String
 *
 * @example
 * getCountryFlag("AT") // → "🇦🇹"
 */
export function getCountryFlag(code: string): string {
  if (!code) return '';

  const country = COUNTRIES.find(c => c.code === code.toUpperCase());
  return country?.flag || '';
}

/**
 * Gibt formatierten Ländertext mit Flagge zurück
 *
 * @param code - ISO 3166-1 Alpha-2 Ländercode
 * @returns Formatierter String mit Flagge und Name
 *
 * @example
 * getCountryDisplay("AT") // → "🇦🇹 Österreich"
 */
export function getCountryDisplay(code: string): string {
  if (!code) return '';

  const flag = getCountryFlag(code);
  const name = getCountryName(code);

  return flag ? `${flag} ${name}` : name;
}

/**
 * Prüft ob ein Ländercode ein EU-Land ist
 *
 * @param code - ISO 3166-1 Alpha-2 Ländercode
 * @returns true wenn EU-Land
 */
export function isEUCountry(code: string): boolean {
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ];

  return euCountries.includes(code.toUpperCase());
}

/**
 * Sortiert Länder alphabetisch nach Name
 */
export function sortCountriesByName(countries: Country[]): Country[] {
  return [...countries].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Filtert Länder nach Suchbegriff
 *
 * @param searchTerm - Suchbegriff (Name oder Code)
 * @returns Gefilterte Länderliste
 */
export function searchCountries(searchTerm: string): Country[] {
  if (!searchTerm) return COUNTRIES;

  const term = searchTerm.toLowerCase();
  return COUNTRIES.filter(
    country =>
      country.name.toLowerCase().includes(term) ||
      country.code.toLowerCase().includes(term)
  );
}
