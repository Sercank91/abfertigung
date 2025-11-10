'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Guarantee {
  id: string
  name: string
}

interface Company {
  id: string
  name: string
  country: string
  address: string
  postalCode: string
  city: string
  emails: string[]
  phones: string[]
  isActive: boolean
  createdAt: string
  guarantees: Guarantee[]
}

interface Props {
  initialCompanies: Company[]
  availableGuarantees: Guarantee[]
  canEdit: boolean
  userRole: string
}

export default function CompanyList({
  initialCompanies,
  availableGuarantees,
  canEdit,
  userRole,
}: Props) {
  const router = useRouter()

  // ✅ SUPER DEFENSIVE: Stelle sicher dass ALLES Arrays sind
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (!Array.isArray(initialCompanies)) return []
    return initialCompanies.map((c) => {
      const guarantees = Array.isArray(c.guarantees) ? c.guarantees : []

      // 🐛 DEBUG: Prüfe ob Bürgschaften vollständige Objekte sind
      const hasInvalidGuarantees = guarantees.some((g) => !g || !g.id || !g.name)
      if (hasInvalidGuarantees) {
        console.warn(`⚠️ Firma "${c.name}" hat unvollständige Bürgschaften-Daten!`, c.guarantees)
      }

      return {
        ...c,
        guarantees: guarantees,
        emails: Array.isArray(c.emails) ? c.emails : [],
        phones: Array.isArray(c.phones) ? c.phones : [],
      }
    })
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    address: '',
    postalCode: '',
    city: '',
    emails: [''],
    phones: [''],
    guaranteeIds: [] as string[],
  })

  // ✅ Stelle sicher dass guarantees auch ein Array ist
  const safeGuarantees = Array.isArray(availableGuarantees) ? availableGuarantees : []

  // Suche filtern
  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Modal öffnen (Neu oder Bearbeiten)
  const openModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company)
      const safeEmails = Array.isArray(company.emails) ? company.emails : []
      const safePhones = Array.isArray(company.phones) ? company.phones : []
      const safeGuarantees = Array.isArray(company.guarantees) ? company.guarantees : []

      setFormData({
        name: company.name,
        country: company.country,
        address: company.address || '',
        postalCode: company.postalCode || '',
        city: company.city || '',
        emails: safeEmails.length > 0 ? safeEmails : [''],
        phones: safePhones.length > 0 ? safePhones : [''],
        guaranteeIds: safeGuarantees.map((g) => g.id),
      })
    } else {
      setEditingCompany(null)
      setFormData({
        name: '',
        country: '',
        address: '',
        postalCode: '',
        city: '',
        emails: [''],
        phones: [''],
        guaranteeIds: [],
      })
    }
    setError('')
    setShowModal(true)
  }

  // Modal schließen
  const closeModal = () => {
    setShowModal(false)
    setEditingCompany(null)
    setError('')
  }

  // E-Mail hinzufügen
  const addEmail = () => {
    setFormData({ ...formData, emails: [...formData.emails, ''] })
  }

  // E-Mail entfernen
  const removeEmail = (index: number) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter((_, i) => i !== index),
    })
  }

  // E-Mail ändern
  const updateEmail = (index: number, value: string) => {
    const newEmails = [...formData.emails]
    newEmails[index] = value
    setFormData({ ...formData, emails: newEmails })
  }

  // Telefon hinzufügen
  const addPhone = () => {
    setFormData({ ...formData, phones: [...formData.phones, ''] })
  }

  // Telefon entfernen
  const removePhone = (index: number) => {
    setFormData({
      ...formData,
      phones: formData.phones.filter((_, i) => i !== index),
    })
  }

  // Telefon ändern
  const updatePhone = (index: number, value: string) => {
    const newPhones = [...formData.phones]
    newPhones[index] = value
    setFormData({ ...formData, phones: newPhones })
  }

  // Bürgschaft Toggle
  const toggleGuarantee = (guaranteeId: string) => {
    if (formData.guaranteeIds.includes(guaranteeId)) {
      setFormData({
        ...formData,
        guaranteeIds: formData.guaranteeIds.filter((id) => id !== guaranteeId),
      })
    } else {
      setFormData({
        ...formData,
        guaranteeIds: [...formData.guaranteeIds, guaranteeId],
      })
    }
  }

  // Speichern
  const handleSave = async () => {
    // Validierung
    if (!formData.name.trim()) {
      setError('Firmenname ist erforderlich')
      return
    }

    if (!formData.country.trim()) {
      setError('Land ist erforderlich')
      return
    }

    if (formData.guaranteeIds.length === 0) {
      setError('Mindestens eine Bürgschaft muss ausgewählt werden')
      return
    }

    setLoading(true)
    setError('')

    try {
      const url = editingCompany ? `/api/companies/${editingCompany.id}` : '/api/companies'

      const method = editingCompany ? 'PUT' : 'POST'

      // Emails und Phones filtern (nur gefüllte)
      const cleanedEmails = formData.emails.filter((e) => e.trim() !== '')
      const cleanedPhones = formData.phones.filter((p) => p.trim() !== '')

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          emails: cleanedEmails,
          phones: cleanedPhones,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Fehler beim Speichern')
        setLoading(false)
        return
      }

      // ✅ Stelle sicher dass die Response auch Arrays hat
      const safeData = {
        ...data,
        guarantees: Array.isArray(data.guarantees) ? data.guarantees : [],
        emails: Array.isArray(data.emails) ? data.emails : [],
        phones: Array.isArray(data.phones) ? data.phones : [],
      }

      // State aktualisieren
      if (editingCompany) {
        setCompanies(companies.map((c) => (c.id === editingCompany.id ? safeData : c)))
      } else {
        setCompanies([...companies, safeData])
      }

      closeModal()
      setLoading(false)
      router.refresh()
    } catch (err) {
      setError('Netzwerkfehler')
      setLoading(false)
    }
  }

  // Löschen
  const handleDelete = async (company: Company) => {
    if (!confirm(`Möchten Sie die Firma "${company.name}" wirklich löschen?`)) return

    setLoading(true)

    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Fehler beim Löschen')
        setLoading(false)
        return
      }

      // Aus State entfernen
      setCompanies(companies.filter((c) => c.id !== company.id))
      setLoading(false)
      router.refresh()
    } catch (err) {
      alert('Netzwerkfehler')
      setLoading(false)
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
              placeholder="Firmen suchen..."
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
            {filteredCompanies.length} {filteredCompanies.length === 1 ? 'Firma' : 'Firmen'}
          </div>

          {/* Add Button */}
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white whitespace-nowrap"
              disabled={safeGuarantees.length === 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Neue Firma
            </button>
          )}
        </div>
      </div>

      {/* Warnung wenn keine Bürgschaften */}
      {safeGuarantees.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-sm mb-4 text-sm">
          ⚠️ Keine Bürgschaften vorhanden! Bitte erstellen Sie zuerst mindestens eine Bürgschaft.
        </div>
      )}

      {/* DEBUG: Warnung wenn Bürgschaften "Unbekannt" angezeigt werden */}
      {companies.some(
        (c) => Array.isArray(c.guarantees) && c.guarantees.some((g) => !g || !g.name)
      ) && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-sm mb-4 text-sm">
          <strong>🐛 API-Problem erkannt:</strong> Bürgschaften werden als "Unbekannt" angezeigt!
          <br />
          <strong>Lösung:</strong> In{' '}
          <code className="bg-red-100 px-1">src/app/api/companies/route.ts</code> muss bei der
          GET-Route folgendes ergänzt werden:
          <pre className="bg-red-100 p-2 mt-2 text-xs overflow-x-auto">
            {`include: {
  guarantees: true  // ← Dies fehlt!
}`}
          </pre>
        </div>
      )}

      {/* Companies Table */}
      <div className="bg-white border border-[#c6c6c6] rounded-sm overflow-hidden">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12 text-[#525252] text-sm">
            {searchTerm ? 'Keine Firmen gefunden' : 'Noch keine Firmen vorhanden'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#f2f2f2] border-b border-[#c6c6c6]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Firmenname
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Land
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Adresse
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    PLZ
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Stadt
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Bürgschaften
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    E-Mails
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Telefone
                  </th>
                  {canEdit && (
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[#525252] uppercase tracking-wider">
                      Aktionen
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredCompanies.map((company, index) => {
                  // ✅ Extra Safety: Garantiere Arrays
                  const safeCompanyGuarantees = Array.isArray(company.guarantees)
                    ? company.guarantees
                    : []
                  const safeCompanyEmails = Array.isArray(company.emails) ? company.emails : []
                  const safeCompanyPhones = Array.isArray(company.phones) ? company.phones : []

                  return (
                    <tr
                      key={company.id}
                      className={`${index !== filteredCompanies.length - 1 ? 'border-b border-[#e6e6e6]' : ''} hover:bg-[#f9f9f9] transition-colors`}
                    >
                      <td className="px-3 py-2">
                        <div className="font-semibold text-sm text-[#525252]">{company.name}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-[#525252]">{company.country}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-[#525252]">{company.address || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-[#525252]">{company.postalCode || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-[#525252]">{company.city || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {safeCompanyGuarantees.length === 0 ? (
                            <span className="text-sm text-gray-400">-</span>
                          ) : (
                            safeCompanyGuarantees.map((g, idx) => (
                              <span
                                key={g?.id || `guarantee-${idx}`}
                                className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800"
                              >
                                {g?.name || 'Unbekannt'}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-[#525252]">
                          {safeCompanyEmails.length > 0 ? safeCompanyEmails.length : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-[#525252]">
                          {safeCompanyPhones.length > 0 ? safeCompanyPhones.length : '-'}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => openModal(company)}
                            className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white mr-2"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDelete(company)}
                            className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#d32f2f] text-[#d32f2f] bg-transparent transition-all hover:bg-[#d32f2f] hover:text-white"
                          >
                            Löschen
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-sm border border-[#c6c6c6] w-full max-w-2xl shadow-lg my-8">
            <div className="p-4 max-h-[85vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-[#525252] mb-4">
                {editingCompany ? 'Firma bearbeiten' : 'Neue Firma'}
              </h2>

              {error && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-sm text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {/* Firmenname */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">
                    Firmenname *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                    placeholder="z.B. Sönmez Bustas Lojistik"
                  />
                </div>

                {/* Land */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">Land *</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                    placeholder="z.B. Türkei"
                  />
                </div>

                {/* Adresse */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">
                    Adresse (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                    placeholder="Straße und Hausnummer"
                  />
                </div>

                {/* PLZ & Stadt */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-sm mb-1 text-[#525252]">
                      PLZ (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                      placeholder="16258"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-sm mb-1 text-[#525252]">
                      Stadt (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                      placeholder="Bursa"
                    />
                  </div>
                </div>

                {/* E-Mail Adressen */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block font-semibold text-sm text-[#525252]">
                      E-Mail Adressen (optional)
                    </label>
                    <button
                      type="button"
                      onClick={addEmail}
                      className="text-xs text-[#0076bc] hover:text-[#005a8f]"
                    >
                      + Hinzufügen
                    </button>
                  </div>
                  {formData.emails.map((email, index) => (
                    <div key={`email-${index}`} className="flex gap-2 mb-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                        placeholder="email@beispiel.com"
                      />
                      {formData.emails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmail(index)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#d32f2f] text-[#d32f2f] bg-transparent transition-all hover:bg-[#d32f2f] hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Telefonnummern */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block font-semibold text-sm text-[#525252]">
                      Telefonnummern (optional)
                    </label>
                    <button
                      type="button"
                      onClick={addPhone}
                      className="text-xs text-[#0076bc] hover:text-[#005a8f]"
                    >
                      + Hinzufügen
                    </button>
                  </div>
                  {formData.phones.map((phone, index) => (
                    <div key={`phone-${index}`} className="flex gap-2 mb-2">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => updatePhone(index, e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                        placeholder="+49 123 456789"
                      />
                      {formData.phones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhone(index)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#d32f2f] text-[#d32f2f] bg-transparent transition-all hover:bg-[#d32f2f] hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Bürgschaften */}
                <div>
                  <label className="block font-semibold text-sm mb-2 text-[#525252]">
                    Bürgschaften * (min. 1)
                  </label>
                  <div className="border border-[#c6c6c6] rounded-sm p-2 max-h-40 overflow-y-auto bg-[#f9f9f9]">
                    {safeGuarantees.length === 0 ? (
                      <p className="text-sm text-gray-500">Keine Bürgschaften verfügbar</p>
                    ) : (
                      safeGuarantees.map((guarantee) => (
                        <label
                          key={guarantee.id}
                          className="flex items-center mb-2 cursor-pointer hover:bg-white p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.guaranteeIds.includes(guarantee.id)}
                            onChange={() => toggleGuarantee(guarantee.id)}
                            className="w-4 h-4 mr-2 rounded border-[#c6c6c6] text-[#0076bc] focus:ring-[#0076bc]"
                          />
                          <span className="text-sm text-[#525252]">{guarantee.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-[#525252] text-[#525252] bg-transparent transition-all hover:bg-[#525252] hover:text-white"
                  disabled={loading}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white"
                  disabled={loading || safeGuarantees.length === 0}
                >
                  {loading ? 'Speichert...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
