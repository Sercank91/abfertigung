'use client'

import React, { useState } from 'react'

interface CustomsOffice {
  id: string
  code: string
  name: string
  countryCode: string
  city: string | null
}

interface RouteTransitOffice {
  id: string
  order: number
  customsOffice: CustomsOffice
}

interface Route {
  id: string
  name: string
  description: string | null
  countries: string[]
  isActive: boolean
  transitOffices: RouteTransitOffice[]
  createdAt: string
  updatedAt: string
}

interface RouteListProps {
  initialRoutes: Route[]
  initialCustomsOffices: CustomsOffice[]
  canEdit: boolean
  userRole: string
}

// Transliteration: Kyrillisch & Griechisch → Latein
function transliterate(text: string): string {
  const toLatin: { [key: string]: string } = {
    // Bulgarisch & Russisch (Kyrillisch)
    А: 'A',
    а: 'a',
    Б: 'B',
    б: 'b',
    В: 'V',
    в: 'v',
    Г: 'G',
    г: 'g',
    Д: 'D',
    д: 'd',
    Е: 'E',
    е: 'e',
    Ж: 'Zh',
    ж: 'zh',
    З: 'Z',
    з: 'z',
    И: 'I',
    и: 'i',
    Й: 'Y',
    й: 'y',
    К: 'K',
    к: 'k',
    Л: 'L',
    л: 'l',
    М: 'M',
    м: 'm',
    Н: 'N',
    н: 'n',
    О: 'O',
    о: 'o',
    П: 'P',
    п: 'p',
    Р: 'R',
    р: 'r',
    С: 'S',
    с: 's',
    Т: 'T',
    т: 't',
    У: 'U',
    у: 'u',
    Ф: 'F',
    ф: 'f',
    Х: 'H',
    х: 'h',
    Ц: 'Ts',
    ц: 'ts',
    Ч: 'Ch',
    ч: 'ch',
    Ш: 'Sh',
    ш: 'sh',
    Щ: 'Sht',
    щ: 'sht',
    Ъ: 'A',
    ъ: 'a',
    Ь: '',
    ь: '',
    Ю: 'Yu',
    ю: 'yu',
    Я: 'Ya',
    я: 'ya',
    Ё: 'Yo',
    ё: 'yo',
    Ы: 'Y',
    ы: 'y',
    Э: 'E',
    э: 'e',

    // Griechisch
    Α: 'A',
    α: 'a',
    Β: 'V',
    β: 'v',
    Γ: 'G',
    γ: 'g',
    Δ: 'D',
    δ: 'd',
    Ε: 'E',
    ε: 'e',
    Ζ: 'Z',
    ζ: 'z',
    Η: 'I',
    η: 'i',
    Θ: 'Th',
    θ: 'th',
    Ι: 'I',
    ι: 'i',
    Κ: 'K',
    κ: 'k',
    Λ: 'L',
    λ: 'l',
    Μ: 'M',
    μ: 'm',
    Ν: 'N',
    ν: 'n',
    Ξ: 'X',
    ξ: 'x',
    Ο: 'O',
    ο: 'o',
    Π: 'P',
    π: 'p',
    Ρ: 'R',
    ρ: 'r',
    Σ: 'S',
    σ: 's',
    ς: 's', // ς = finales Sigma
    Τ: 'T',
    τ: 't',
    Υ: 'Y',
    υ: 'y',
    Φ: 'F',
    φ: 'f',
    Χ: 'Ch',
    χ: 'ch',
    Ψ: 'Ps',
    ψ: 'ps',
    Ω: 'O',
    ω: 'o',
  }

  return text
    .split('')
    .map((char) => toLatin[char] || char)
    .join('')
}

export default function RouteList({
  initialRoutes,
  initialCustomsOffices,
  canEdit,
  userRole,
}: RouteListProps) {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes)
  const [customsOffices] = useState<CustomsOffice[]>(initialCustomsOffices)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    countries: [] as string[],
    transitOfficeIds: [] as string[],
  })

  // Customs Offices für Dropdown
  const [selectedOffices, setSelectedOffices] = useState<CustomsOffice[]>([])
  const [officeSearch, setOfficeSearch] = useState('')
  const [officeSearchResults, setOfficeSearchResults] = useState<CustomsOffice[]>([])

  // Country input
  const [countryInput, setCountryInput] = useState('')

  // Filter routes
  const filteredRoutes = routes.filter(
    (route) =>
      route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.countries.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/routes', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setRoutes(data.routes)
      }
    } catch (error) {
      console.error('Error fetching routes:', error)
    }
  }

  const searchCustomsOffices = async (search: string) => {
    if (!search || search.length < 2) {
      setOfficeSearchResults([])
      return
    }

    try {
      const params = new URLSearchParams({ search, limit: '20' })
      const response = await fetch(`/api/customs-offices?${params}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setOfficeSearchResults(data.offices)
      }
    } catch (error) {
      console.error('Error searching customs offices:', error)
    }
  }

  const handleOpenModal = (route?: Route) => {
    if (route) {
      setEditingRoute(route)
      setFormData({
        name: route.name,
        description: route.description || '',
        countries: route.countries,
        transitOfficeIds: route.transitOffices.map((to) => to.customsOffice.id),
      })
      setSelectedOffices(route.transitOffices.map((to) => to.customsOffice))
    } else {
      setEditingRoute(null)
      setFormData({
        name: '',
        description: '',
        countries: [],
        transitOfficeIds: [],
      })
      setSelectedOffices([])
    }
    setShowModal(true)
    setCountryInput('')
    setOfficeSearch('')
    setOfficeSearchResults([])
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRoute(null)
    setFormData({
      name: '',
      description: '',
      countries: [],
      transitOfficeIds: [],
    })
    setSelectedOffices([])
    setCountryInput('')
    setOfficeSearch('')
    setOfficeSearchResults([])
  }

  const handleAddCountry = () => {
    const country = countryInput.trim().toUpperCase()
    if (country && country.length === 2 && !formData.countries.includes(country)) {
      setFormData({
        ...formData,
        countries: [...formData.countries, country],
      })
      setCountryInput('')
    }
  }

  const handleRemoveCountry = (country: string) => {
    setFormData({
      ...formData,
      countries: formData.countries.filter((c) => c !== country),
    })
  }

  const handleAddOffice = (office: CustomsOffice) => {
    if (!selectedOffices.find((o) => o.id === office.id)) {
      setSelectedOffices([...selectedOffices, office])
      setFormData({
        ...formData,
        transitOfficeIds: [...formData.transitOfficeIds, office.id],
      })
    }
    setOfficeSearch('')
    setOfficeSearchResults([])
  }

  const handleRemoveOffice = (officeId: string) => {
    setSelectedOffices(selectedOffices.filter((o) => o.id !== officeId))
    setFormData({
      ...formData,
      transitOfficeIds: formData.transitOfficeIds.filter((id) => id !== officeId),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Bitte geben Sie einen Namen ein')
      return
    }

    if (formData.countries.length === 0) {
      alert('Bitte fügen Sie mindestens ein Land hinzu')
      return
    }

    setLoading(true)

    try {
      const url = editingRoute ? `/api/routes/${editingRoute.id}` : '/api/routes'
      const method = editingRoute ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchRoutes()
        handleCloseModal()
      } else {
        const data = await response.json()
        alert(data.error || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Error saving route:', error)
      alert('Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (routeId: string) => {
    if (!confirm('Möchten Sie diese Route wirklich löschen?')) return

    try {
      const response = await fetch(`/api/routes/${routeId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        await fetchRoutes()
      } else {
        alert('Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Error deleting route:', error)
      alert('Fehler beim Löschen')
    }
  }

  return (
    <>
      {/* Search Bar & Add Button */}
      <div className="bg-white mb-4 p-3 border border-[#c6c6c6] rounded-sm">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Routen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm pr-8 focus:border-[#0076bc] focus:outline-none"
            />
            <svg
              className="absolute right-2 top-1.5 text-gray-400 pointer-events-none"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Counter */}
          <div className="text-xs text-[#525252] whitespace-nowrap">
            {filteredRoutes.length} {filteredRoutes.length === 1 ? 'Route' : 'Routen'}
          </div>

          {/* Add Button */}
          {canEdit && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Neue Route
            </button>
          )}
        </div>
      </div>

      {/* Routes Table */}
      <div className="bg-white border border-[#c6c6c6] rounded-sm overflow-hidden">
        {filteredRoutes.length === 0 ? (
          <div className="text-center py-12 text-[#525252] text-sm">
            {searchTerm ? 'Keine Routen gefunden' : 'Noch keine Routen erstellt'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#f2f2f2] border-b border-[#c6c6c6]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Beschreibung
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Länder
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Transit-Zollstellen
                  </th>
                  {canEdit && (
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[#525252] uppercase tracking-wider">
                      Aktionen
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredRoutes.map((route, index) => (
                  <tr
                    key={route.id}
                    className={`${index !== filteredRoutes.length - 1 ? 'border-b border-[#e6e6e6]' : ''} hover:bg-[#f9f9f9] transition-colors`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold text-sm text-[#525252]">{route.name}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-[#525252]">{route.description || '-'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {route.countries.map((country) => (
                          <span
                            key={country}
                            className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800"
                          >
                            {country}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-[#525252] space-y-1">
                        {route.transitOffices.length === 0 ? (
                          <div>Keine Zollstellen</div>
                        ) : (
                          route.transitOffices.map((to) => (
                            <div key={to.id}>
                              {to.customsOffice.code} - {transliterate(to.customsOffice.name)}
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleOpenModal(route)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white mr-2"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(route.id)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#d32f2f] text-[#d32f2f] bg-transparent transition-all hover:bg-[#d32f2f] hover:text-white"
                        >
                          Löschen
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && canEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-sm border border-[#c6c6c6] w-full max-w-2xl shadow-lg my-8">
            <div className="p-4 max-h-[85vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-[#525252] mb-4">
                {editingRoute ? 'Route bearbeiten' : 'Neue Route'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                    placeholder="z.B. Kapitan Andreevo"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">
                    Beschreibung (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm min-h-[60px] focus:border-[#0076bc] focus:outline-none"
                    rows={2}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>

                {/* Countries */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">
                    Länder * (2-Buchstaben-Code)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={countryInput}
                      onChange={(e) => setCountryInput(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCountry()
                        }
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                      placeholder="z.B. DE, AT, TR"
                      maxLength={2}
                    />
                    <button
                      type="button"
                      onClick={handleAddCountry}
                      className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white"
                    >
                      Hinzufügen
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.countries.map((country) => (
                      <span
                        key={country}
                        className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {country}
                        <button
                          type="button"
                          onClick={() => handleRemoveCountry(country)}
                          className="ml-2 text-blue-600 hover:text-blue-900 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Transit Offices */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">
                    Transit-Zollstellen (optional)
                  </label>
                  <div className="mb-2">
                    <input
                      type="text"
                      value={officeSearch}
                      onChange={(e) => {
                        setOfficeSearch(e.target.value)
                        searchCustomsOffices(e.target.value)
                      }}
                      className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                      placeholder="Zollstelle suchen (Code oder Name)..."
                    />
                  </div>

                  {/* Search Results */}
                  {officeSearch && officeSearchResults.length > 0 && (
                    <div className="border border-[#c6c6c6] rounded-sm max-h-40 overflow-y-auto mb-2">
                      {officeSearchResults.map((office) => (
                        <button
                          key={office.id}
                          type="button"
                          onClick={() => handleAddOffice(office)}
                          className="w-full text-left px-3 py-2 hover:bg-[#f9f9f9] border-b border-[#e6e6e6] last:border-b-0 text-sm"
                        >
                          <div className="font-medium">
                            {office.code} - {transliterate(office.name)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transliterate(office.city || '')} ({office.countryCode})
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Offices */}
                  <div className="space-y-2">
                    {selectedOffices.map((office, index) => (
                      <div
                        key={office.id}
                        className="flex items-center justify-between p-2 bg-[#f9f9f9] rounded-sm border border-[#e6e6e6]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                          <div>
                            <div className="font-medium text-sm text-[#525252]">
                              {office.code} - {transliterate(office.name)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {transliterate(office.city || '')} ({office.countryCode})
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOffice(office.id)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#d32f2f] text-[#d32f2f] bg-transparent transition-all hover:bg-[#d32f2f] hover:text-white"
                        >
                          Entfernen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-[#525252] text-[#525252] bg-transparent transition-all hover:bg-[#525252] hover:text-white"
                    disabled={loading}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white"
                    disabled={loading}
                  >
                    {loading ? 'Speichert...' : editingRoute ? 'Speichern' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
