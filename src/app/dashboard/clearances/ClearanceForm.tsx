'use client'

import { transliterate } from '@/lib/transliterate'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ✅ Helper für AnmNr Formatierung
function formatAnmNr(anmNr: string): string {
  if (!anmNr || anmNr.length !== 5) return anmNr
  return `${anmNr.slice(0, 2)}.${anmNr.slice(2)}`
}

// ✅ FIX 1: Interface - Direkte Struktur statt verschachtelt
interface Company {
  id: string
  name: string
  country: string
  address: string
  postalCode: string
  city: string
  guarantees: Array<{
    id: string
    name: string
  }>
}

interface Route {
  id: string
  name: string
  countries: string[]
  transitOffices?: Array<{
    id: string
    order: number
    customsOffice: {
      id: string
      code: string
      name: string
      countryCode: string
      city?: string
    }
  }>
}

interface GoodsLocation {
  id: string
  name: string
  code: string | null
}

interface Authorization {
  id: string
  name: string
  code: string
}

interface CustomsOffice {
  id?: string
  code: string
  name: string
  countryCode: string
  city?: string
}

interface Props {
  anmNr?: string // ✅ NEU: AnmNr statt clearanceId
  userId: string
  companies: Company[]
  routes: Route[]
  goodsLocations: GoodsLocation[]
  authorizations: Authorization[]
}

type TabType = 'anmeldung' | 'positionen' | 'zusammenfassung'

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export default function ClearanceForm({
  anmNr, // ✅ NEU
  userId,
  companies,
  routes,
  goodsLocations,
  authorizations,
}: Props) {
  const router = useRouter()
  const isEditMode = !!anmNr // ✅ Prüfe auf AnmNr statt clearanceId
  const isFirstRender = useRef(true)

  const [activeTab, setActiveTab] = useState<TabType>('anmeldung')
  const [anmeldungValidated, setAnmeldungValidated] = useState(false)
  const [anmeldungSaved, setAnmeldungSaved] = useState(false)
  const [positionenSaved, setPositionenSaved] = useState(false)
  const [savedAnmNr, setSavedAnmNr] = useState<string | null>(anmNr || null) // ✅ NEU

  const [formData, setFormData] = useState({
    lrn: '',
    declarationDate: new Date().toISOString().split('T')[0],
    arrivalDate: '',
    companyId: '',
    companyName: '',
    companyAddress: '',
    companyPostalCode: '',
    companyCity: '',
    companyCountry: '',
    guaranteeId: '',
    simplifiedProcedure: false,
    goodsLocationId: '',
    authorizationIds: [] as string[],
    licensePlateType: '30',
    licensePlate: '',
    licensePlateCountry: '',

    // ✅ NEU: Zollstellen mit IDs!
    departureOfficeId: '',
    departureOffice: '',
    departureOfficeName: '',
    departureOfficeCountry: '',

    dispatchOfficeId: '',
    dispatchOffice: '',
    dispatchOfficeName: '',
    dispatchOfficeCountry: '',
    dispatchOfficeCountryCode: '',

    destinationOfficeId: '',
    destinationOffice: '',
    destinationOfficeName: '',
    destinationOfficeCountry: '',
    destinationOfficeCountryCode: '',

    routeId: '',
    customRouteCountries: [] as string[],
    transitOffices: [] as string[],
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [workflowItems, setWorkflowItems] = useState<Array<{ label: string; value: string }>>([])
  const [isEditingCompany, setIsEditingCompany] = useState(false)

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [isGuaranteeModalOpen, setIsGuaranteeModalOpen] = useState(false)
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false)
  const [isGoodsLocationModalOpen, setIsGoodsLocationModalOpen] = useState(false)

  const [companySearch, setCompanySearch] = useState('')
  const [departureSearch, setDepartureSearch] = useState('')
  const [dispatchSearch, setDispatchSearch] = useState('')
  const [destinationSearch, setDestinationSearch] = useState('')
  const [transitSearch, setTransitSearch] = useState('')

  const [departureOffices, setDepartureOffices] = useState<CustomsOffice[]>([])
  const [dispatchOffices, setDispatchOffices] = useState<CustomsOffice[]>([])
  const [destinationOffices, setDestinationOffices] = useState<CustomsOffice[]>([])
  const [transitOfficesResults, setTransitOfficesResults] = useState<CustomsOffice[]>([])

  const [showDepartureDropdown, setShowDepartureDropdown] = useState(false)
  const [showDispatchDropdown, setShowDispatchDropdown] = useState(false)
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false)

  const [allGuarantees, setAllGuarantees] = useState<Array<{ id: string; name: string }>>([])

  const [draggedCountryIndex, setDraggedCountryIndex] = useState<number | null>(null)
  const [draggedTransitIndex, setDraggedTransitIndex] = useState<number | null>(null)
  const [newCountry, setNewCountry] = useState('')

  const debouncedDepartureSearch = useDebounce(departureSearch, 300)
  const debouncedDispatchSearch = useDebounce(dispatchSearch, 300)
  const debouncedDestinationSearch = useDebounce(destinationSearch, 300)
  const debouncedTransitSearch = useDebounce(transitSearch, 300)

  const selectedCompany = companies.find((c) => c.id === formData.companyId)

  // ✅ FIX 2: Direkt verwenden ohne .guarantee mapping
  const availableGuarantees = formData.companyId ? selectedCompany?.guarantees || [] : allGuarantees

  const selectedGuarantee = availableGuarantees.find((g) => g.id === formData.guaranteeId)
  const selectedRoute = routes.find((r) => r.id === formData.routeId)
  const selectedGoodsLocation = goodsLocations.find((g) => g.id === formData.goodsLocationId)

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  )

  // ✅ NEU: Lade Daten wenn AnmNr vorhanden
  useEffect(() => {
    if (isEditMode && anmNr) {
      loadClearanceData()
    }
  }, [isEditMode, anmNr])

  const loadClearanceData = async () => {
    try {
      setLoading(true)
      // ✅ NEU: API-Call mit AnmNr statt ID!
      const response = await fetch(`/api/clearances/${anmNr}`)

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Abfertigung')
      }

      const clearance = await response.json()

      // ✅ NEU: Zollstellen-IDs und -Daten laden!
      setFormData({
        lrn: clearance.lrn || '',
        declarationDate: clearance.registrationDate
          ? new Date(clearance.registrationDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        arrivalDate: clearance.arrivalDate
          ? new Date(clearance.arrivalDate).toISOString().split('T')[0]
          : '',
        companyId: clearance.companyId || '',
        companyName: clearance.company?.name || '',
        companyAddress: clearance.company?.address || '',
        companyPostalCode: clearance.company?.postalCode || '',
        companyCity: clearance.company?.city || '',
        companyCountry: clearance.company?.country || '',
        guaranteeId: clearance.guaranteeId || '',
        simplifiedProcedure: clearance.simplifiedProcedure || false,
        goodsLocationId: clearance.goodsLocationId || '',
        authorizationIds: clearance.authorizationId ? [clearance.authorizationId] : [],
        licensePlateType: '30',
        licensePlate: clearance.licensePlate || '',
        licensePlateCountry: clearance.licensePlateCountry || '',

        // ✅ NEU: Zollstellen aus API laden
        departureOfficeId: clearance.departureOfficeId || '',
        departureOffice: clearance.departureOffice?.code || '',
        departureOfficeName: clearance.departureOffice?.name || '',
        departureOfficeCountry: clearance.departureOffice?.countryCode || '',

        dispatchOfficeId: clearance.dispatchOfficeId || '',
        dispatchOffice: clearance.dispatchOffice?.code || '',
        dispatchOfficeName: clearance.dispatchOffice?.name || '',
        dispatchOfficeCountry: getCountryName(clearance.dispatchOffice?.countryCode || ''),
        dispatchOfficeCountryCode: clearance.dispatchOffice?.countryCode || '',

        destinationOfficeId: clearance.destinationOfficeId || '',
        destinationOffice: clearance.destinationOffice?.code || '',
        destinationOfficeName: clearance.destinationOffice?.name || '',
        destinationOfficeCountry: getCountryName(clearance.destinationOffice?.countryCode || ''),
        destinationOfficeCountryCode: clearance.destinationOffice?.countryCode || '',

        routeId: clearance.routeId || '',
        customRouteCountries: clearance.route?.countries || [],
        transitOffices: [],
      })

      setSavedAnmNr(anmNr ?? null) // ✅ NEU
      setAnmeldungSaved(true)
      setAnmeldungValidated(true)
    } catch (err: any) {
      console.error('Fehler beim Laden:', err)
      setErrors([err.message || 'Fehler beim Laden der Abfertigung'])
      alert('❌ Fehler beim Laden der Abfertigung')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (errors.length > 0 || anmeldungValidated) {
      setErrors([])
      setAnmeldungValidated(false)
    }
  }, [formData])

  useEffect(() => {
    const loadAllGuarantees = async () => {
      try {
        const response = await fetch('/api/guarantees')
        const data = await response.json()
        setAllGuarantees(data.guarantees || [])
      } catch (error) {
        console.error('Fehler beim Laden der Bürgschaften:', error)
      }
    }
    loadAllGuarantees()
  }, [])

  useEffect(() => {
    if (debouncedDepartureSearch.length < 2) {
      setDepartureOffices([])
      return
    }
    const loadOffices = async () => {
      try {
        const response = await fetch(
          `/api/customs-offices?search=${encodeURIComponent(debouncedDepartureSearch)}&limit=50`
        )
        const data = await response.json()
        setDepartureOffices(data.offices || [])
      } catch (error) {
        console.error('Fehler:', error)
      }
    }
    loadOffices()
  }, [debouncedDepartureSearch])

  useEffect(() => {
    if (debouncedDispatchSearch.length < 2) {
      setDispatchOffices([])
      return
    }
    const loadOffices = async () => {
      try {
        const response = await fetch(
          `/api/customs-offices?search=${encodeURIComponent(debouncedDispatchSearch)}&limit=50`
        )
        const data = await response.json()
        setDispatchOffices(data.offices || [])
      } catch (error) {
        console.error('Fehler:', error)
      }
    }
    loadOffices()
  }, [debouncedDispatchSearch])

  useEffect(() => {
    if (debouncedDestinationSearch.length < 2) {
      setDestinationOffices([])
      return
    }
    const loadOffices = async () => {
      try {
        const response = await fetch(
          `/api/customs-offices?search=${encodeURIComponent(debouncedDestinationSearch)}&limit=50`
        )
        const data = await response.json()
        setDestinationOffices(data.offices || [])
      } catch (error) {
        console.error('Fehler:', error)
      }
    }
    loadOffices()
  }, [debouncedDestinationSearch])

  useEffect(() => {
    if (debouncedTransitSearch.length < 2) {
      setTransitOfficesResults([])
      return
    }
    const loadOffices = async () => {
      try {
        const response = await fetch(
          `/api/customs-offices?search=${encodeURIComponent(debouncedTransitSearch)}&limit=50`
        )
        const data = await response.json()
        setTransitOfficesResults(data.offices || [])
      } catch (error) {
        console.error('Fehler:', error)
      }
    }
    loadOffices()
  }, [debouncedTransitSearch])

  const selectCompany = (company: Company) => {
    setFormData({
      ...formData,
      companyId: company.id,
      companyName: company.name,
      companyAddress: company.address,
      companyPostalCode: company.postalCode,
      companyCity: company.city,
      companyCountry: company.country,
      guaranteeId: '',
    })
    setIsCompanyModalOpen(false)
    setCompanySearch('')
  }

  const selectGuarantee = (guarantee: { id: string; name: string }) => {
    setFormData({ ...formData, guaranteeId: guarantee.id })
    setIsGuaranteeModalOpen(false)
  }

  const selectRoute = (route: Route) => {
    setFormData({
      ...formData,
      routeId: route.id,
      customRouteCountries: route.countries,
      transitOffices: route.transitOffices
        ? route.transitOffices.sort((a, b) => a.order - b.order).map((to) => to.customsOffice.code)
        : [],
    })
  }

  const selectGoodsLocation = (location: GoodsLocation) => {
    setFormData({ ...formData, goodsLocationId: location.id })
    setIsGoodsLocationModalOpen(false)
  }

  // ✅ NEU: Speichere auch die ID!
  const selectDepartureOffice = (office: CustomsOffice) => {
    setFormData({
      ...formData,
      departureOfficeId: office.id || '',
      departureOffice: office.code,
      departureOfficeCountry: office.countryCode,
      departureOfficeName: office.name,
    })
    setShowDepartureDropdown(false)
    setDepartureSearch('')
  }

  // ✅ NEU: Speichere auch die ID!
  const selectDispatchOffice = (office: CustomsOffice) => {
    const countryName = getCountryName(office.countryCode)
    setFormData({
      ...formData,
      dispatchOfficeId: office.id || '',
      dispatchOffice: office.code,
      dispatchOfficeName: office.name,
      dispatchOfficeCountry: countryName,
      dispatchOfficeCountryCode: office.countryCode,
    })
    setShowDispatchDropdown(false)
    setDispatchSearch('')
  }

  // ✅ NEU: Speichere auch die ID!
  const selectDestinationOffice = (office: CustomsOffice) => {
    const countryName = getCountryName(office.countryCode)
    setFormData({
      ...formData,
      destinationOfficeId: office.id || '',
      destinationOffice: office.code,
      destinationOfficeName: office.name,
      destinationOfficeCountry: countryName,
      destinationOfficeCountryCode: office.countryCode,
    })
    setShowDestinationDropdown(false)
    setDestinationSearch('')
  }

  const getCountryName = (code: string): string => {
    const countries: Record<string, string> = {
      DE: 'Deutschland',
      AT: 'Österreich',
      TR: 'Türkei',
      BG: 'Bulgarien',
      HU: 'Ungarn',
      RO: 'Rumänien',
      GE: 'Georgien',
    }
    return countries[code] || code
  }

  const addCustomCountry = () => {
    if (
      newCountry &&
      newCountry.length === 2 &&
      !formData.customRouteCountries.includes(newCountry)
    ) {
      setFormData({
        ...formData,
        customRouteCountries: [...formData.customRouteCountries, newCountry],
      })
      setNewCountry('')
    }
  }

  const removeCountry = (index: number) => {
    setFormData({
      ...formData,
      customRouteCountries: formData.customRouteCountries.filter((_, i) => i !== index),
    })
  }

  const addTransitOffice = (office: CustomsOffice) => {
    if (!formData.transitOffices.includes(office.code)) {
      setFormData({
        ...formData,
        transitOffices: [...formData.transitOffices, office.code],
      })
    }
    setTransitSearch('')
  }

  const removeTransitOffice = (index: number) => {
    setFormData({
      ...formData,
      transitOffices: formData.transitOffices.filter((_, i) => i !== index),
    })
  }

  const handleCountryDragStart = (index: number) => setDraggedCountryIndex(index)
  const handleCountryDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedCountryIndex === null || draggedCountryIndex === index) return
    const newCountries = [...formData.customRouteCountries]
    const draggedItem = newCountries[draggedCountryIndex]
    newCountries.splice(draggedCountryIndex, 1)
    newCountries.splice(index, 0, draggedItem)
    setFormData({ ...formData, customRouteCountries: newCountries })
    setDraggedCountryIndex(index)
  }
  const handleCountryDragEnd = () => setDraggedCountryIndex(null)

  const handleTransitDragStart = (index: number) => setDraggedTransitIndex(index)
  const handleTransitDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedTransitIndex === null || draggedTransitIndex === index) return
    const newOffices = [...formData.transitOffices]
    const draggedItem = newOffices[draggedTransitIndex]
    newOffices.splice(draggedTransitIndex, 1)
    newOffices.splice(index, 0, draggedItem)
    setFormData({ ...formData, transitOffices: newOffices })
    setDraggedTransitIndex(index)
  }
  const handleTransitDragEnd = () => setDraggedTransitIndex(null)

  const toggleAuthorization = (authId: string) => {
    setFormData((prev) => ({
      ...prev,
      authorizationIds: prev.authorizationIds.includes(authId)
        ? prev.authorizationIds.filter((id) => id !== authId)
        : [...prev.authorizationIds, authId],
    }))
  }

  const handlePruefen = () => {
    const newErrors: string[] = []
    if (!formData.lrn) newErrors.push('LRN fehlt')
    if (!formData.declarationDate) newErrors.push('Anmeldedatum fehlt')
    if (!formData.arrivalDate) newErrors.push('Ankunftsdatum fehlt')
    if (!formData.companyId) newErrors.push('Transportunternehmen wurde nicht gewählt')
    if (!formData.guaranteeId) newErrors.push('Bürgschaft fehlt')
    if (!formData.licensePlate) newErrors.push('Kennzeichen fehlt')
    if (!formData.licensePlateCountry) newErrors.push('Kennzeichen-Land fehlt')
    if (!formData.departureOffice) newErrors.push('Grenzzollstelle fehlt')
    if (!formData.dispatchOffice) newErrors.push('Versandzollstelle fehlt')
    if (!formData.destinationOffice) newErrors.push('Ankunftszollstelle fehlt')
    if (formData.simplifiedProcedure) {
      if (!formData.goodsLocationId) newErrors.push('Warenort fehlt (vereinfachtes Verfahren)')
      if (formData.authorizationIds.length === 0)
        newErrors.push('Bewilligung fehlt (vereinfachtes Verfahren)')
    }
    setErrors(newErrors)
    if (newErrors.length === 0) {
      setAnmeldungValidated(true)
      alert('✅ Prüfung erfolgreich! Sie können jetzt speichern.')
    } else {
      setAnmeldungValidated(false)
      alert('❌ Bitte alle Pflichtfelder ausfüllen!')
    }
  }

  const handleSpeichern = async () => {
    if (!anmeldungValidated) {
      alert('Bitte zuerst prüfen!')
      return
    }

    setLoading(true)
    try {
      // ✅ NEU: Bei Edit verwende PUT mit AnmNr, sonst POST
      const method = savedAnmNr ? 'PUT' : 'POST'
      const url = savedAnmNr
        ? `/api/clearances/${savedAnmNr}` // ✅ Mit AnmNr!
        : '/api/clearances'

      console.log(`${method} ${url}`)

      // ✅ NEU: Sende Zollstellen-IDs mit!
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // ✅ Wichtig: Nur die IDs senden (nicht die ganzen Objekte)
          departureOfficeId: formData.departureOfficeId || null,
          dispatchOfficeId: formData.dispatchOfficeId || null,
          destinationOfficeId: formData.destinationOfficeId || null,
          createdById: userId,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')

        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
        } else {
          const text = await response.text()
          console.error('Server Error Response:', text.substring(0, 500))

          if (method === 'PUT') {
            throw new Error(
              `UPDATE-Route existiert nicht! Erstellen Sie: src/app/api/clearances/[anmNr]/route.ts`
            )
          } else {
            throw new Error(
              `Server Error (${response.status}): Die API gibt HTML statt JSON zurück.`
            )
          }
        }
      }

      const data = await response.json()

      // ✅ NEU: Speichere AnmNr aus Response!
      if (!savedAnmNr && data.clearance?.anmNr) {
        setSavedAnmNr(data.clearance.anmNr)
        console.log('✅ AnmNr gespeichert:', data.clearance.anmNr)
      }

      const items = [
        { label: 'LRN', value: formData.lrn },
        { label: 'Transportunternehmen', value: formData.companyName },
        {
          label: 'Kennzeichen',
          value: `${formData.licensePlate} (${formData.licensePlateCountry})`,
        },
        {
          label: 'Versandzollstelle',
          value: `${formData.dispatchOffice} ${formData.dispatchOfficeName}`,
        },
        {
          label: 'Ankunftszollstelle',
          value: `${formData.destinationOffice} ${formData.destinationOfficeName}`,
        },
        {
          label: 'Grenzzollstelle',
          value: `${formData.departureOffice} ${formData.departureOfficeName}`,
        },
        { label: 'Bürgschaft', value: selectedGuarantee?.name || '' },
      ]

      if (selectedRoute) {
        items.push({ label: 'Route', value: selectedRoute.name })
      }
      if (formData.simplifiedProcedure && selectedGoodsLocation) {
        items.push({ label: 'Warenort', value: selectedGoodsLocation.name })
      }
      if (formData.authorizationIds.length > 0) {
        const authNames = authorizations
          .filter((a) => formData.authorizationIds.includes(a.id))
          .map((a) => a.code)
          .join(', ')
        items.push({ label: 'Bewilligung', value: authNames })
      }

      setWorkflowItems(items)
      setAnmeldungSaved(true)
      setErrors([])

      const successMessage = savedAnmNr
        ? '✅ Änderungen erfolgreich gespeichert!'
        : '✅ Anmeldung erfolgreich gespeichert!'

      alert(successMessage)

      // ✅ NEU:
      if (isEditMode) {
        // BLEIBE auf der Edit-Seite, zeige nur Erfolgsmeldung
        // router.push('/dashboard/clearances');  ← AUSKOMMENTIERT!
      } else {
        // Bei neuer Clearance: Redirect zur Edit-Seite
        router.push(`/dashboard/clearances/${data.clearance.anmNr}`)
      }
    } catch (err: any) {
      console.error('Fehler beim Speichern:', err)
      setErrors([err.message || 'Unbekannter Fehler beim Speichern'])
      alert(`❌ Fehler: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading && isEditMode && !formData.lrn) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Abfertigung...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="flex-1">
        {/* ✅ NEU: Zeige AnmNr im Header wenn Edit-Mode */}
        {isEditMode && savedAnmNr && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">Anmelde-Nr.:</span>
                <span className="ml-2 text-2xl font-bold text-blue-700">
                  {formatAnmNr(savedAnmNr)}
                </span>
              </div>
              <div className="text-sm text-gray-600">LRN: {formData.lrn}</div>
            </div>
          </div>
        )}

        <div className="bg-white border-b border-gray-300 mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('anmeldung')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'anmeldung'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Anmeldung
            </button>
            <button
              onClick={() => anmeldungSaved && setActiveTab('positionen')}
              disabled={!anmeldungSaved}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'positionen'
                  ? 'bg-blue-600 text-white'
                  : anmeldungSaved
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Positionen
            </button>
            <button
              onClick={() => positionenSaved && setActiveTab('zusammenfassung')}
              disabled={!positionenSaved}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'zusammenfassung'
                  ? 'bg-blue-600 text-white'
                  : positionenSaved
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Zusammenfassung
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {activeTab === 'anmeldung' && (
            <div>
              <h3 className="text-xl font-bold mb-6">
                {isEditMode ? 'Abfertigung bearbeiten' : 'Neue Anmeldung'}
              </h3>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-center gap-4">
                  <label className="w-48 text-sm font-medium text-gray-700">LRN*</label>
                  <input
                    type="text"
                    value={formData.lrn}
                    onChange={(e) => setFormData({ ...formData, lrn: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 4801/25012345"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm font-medium text-gray-700">Anmeldedatum*</label>
                  <input
                    type="date"
                    value={formData.declarationDate}
                    onChange={(e) => setFormData({ ...formData, declarationDate: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="w-32 text-sm font-medium text-gray-700">Ankunftsdatum*</label>
                  <input
                    type="date"
                    value={formData.arrivalDate}
                    onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-48 text-sm font-medium text-gray-700">
                    Transportunternehmen*
                  </label>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      {isEditingCompany ? (
                        <>
                          <input
                            type="text"
                            value={formData.companyName || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, companyName: e.target.value })
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Firmenname"
                          />
                          <button
                            type="button"
                            onClick={() => setIsEditingCompany(false)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCompanyModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Neu wählen
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={formData.companyName || ''}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
                            placeholder="Keine Firma ausgewählt"
                          />
                          <button
                            type="button"
                            onClick={() => setIsCompanyModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Wählen
                          </button>
                        </>
                      )}
                    </div>
                    {formData.companyId && (
                      <div className="mt-1">
                        {isEditingCompany ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={formData.companyAddress}
                              onChange={(e) =>
                                setFormData({ ...formData, companyAddress: e.target.value })
                              }
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              placeholder="Adresse"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={formData.companyPostalCode}
                                onChange={(e) =>
                                  setFormData({ ...formData, companyPostalCode: e.target.value })
                                }
                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded"
                                placeholder="PLZ"
                              />
                              <input
                                type="text"
                                value={formData.companyCity}
                                onChange={(e) =>
                                  setFormData({ ...formData, companyCity: e.target.value })
                                }
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                                placeholder="Ort"
                              />
                              <input
                                type="text"
                                value={formData.companyCountry}
                                onChange={(e) =>
                                  setFormData({ ...formData, companyCountry: e.target.value })
                                }
                                className="w-32 px-2 py-1 text-xs border border-gray-300 rounded"
                                placeholder="Land"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-600">
                              {formData.companyAddress}, {formData.companyPostalCode}{' '}
                              {formData.companyCity}, {formData.companyCountry}
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsEditingCompany(true)}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              Bearbeiten
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm font-medium text-gray-700">Bürgschaft*</label>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={selectedGuarantee?.name || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
                      placeholder="Keine Bürgschaft ausgewählt"
                    />
                    <button
                      type="button"
                      onClick={() => setIsGuaranteeModalOpen(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Wählen
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-48 text-sm font-medium text-gray-700">Kennzeichen*</label>
                  <div className="flex-1 flex gap-2">
                    <select
                      value={formData.licensePlateType}
                      onChange={(e) =>
                        setFormData({ ...formData, licensePlateType: e.target.value })
                      }
                      className="w-20 px-2 py-2 border border-gray-300 rounded"
                    >
                      <option value="30">30</option>
                      <option value="40">40</option>
                    </select>
                    <input
                      type="text"
                      value={formData.licensePlate}
                      onChange={(e) =>
                        setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
                      placeholder="16ABC123"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={formData.licensePlateCountry}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          licensePlateCountry: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-16 px-3 py-2 border border-gray-300 rounded"
                      placeholder="TR"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm font-medium text-gray-700">Grenzzollstelle*</label>
                  <div className="flex-1 relative">
                    {formData.departureOffice ? (
                      <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded bg-red-50">
                        <span className="flex-1 font-mono text-sm">
                          {formData.departureOffice} - {transliterate(formData.departureOfficeName)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              departureOfficeId: '',
                              departureOffice: '',
                              departureOfficeName: '',
                              departureOfficeCountry: '',
                            })
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={departureSearch}
                          onChange={(e) => {
                            setDepartureSearch(e.target.value)
                            setShowDepartureDropdown(true)
                          }}
                          onFocus={() => setShowDepartureDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDepartureDropdown(false), 200)}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Mindestens 2 Zeichen..."
                        />
                        {showDepartureDropdown &&
                          departureSearch.length >= 2 &&
                          departureOffices.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                              {departureOffices.map((office) => (
                                <div
                                  key={office.code}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    selectDepartureOffice(office)
                                  }}
                                  className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b last:border-b-0"
                                >
                                  <div className="font-medium">
                                    {office.code} - {transliterate(office.name)}
                                  </div>
                                  <div className="text-xs text-gray-500">{office.countryCode}</div>
                                </div>
                              ))}
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-48 text-sm font-medium text-gray-700">
                    Versandzollstelle*
                  </label>
                  <div className="flex-1">
                    {formData.dispatchOffice ? (
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded bg-blue-50">
                          <span className="flex-1 font-mono text-sm">
                            {formData.dispatchOffice} - {transliterate(formData.dispatchOfficeName)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                dispatchOfficeId: '',
                                dispatchOffice: '',
                                dispatchOfficeName: '',
                                dispatchOfficeCountry: '',
                                dispatchOfficeCountryCode: '',
                              })
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                        <input
                          type="text"
                          value={formData.dispatchOfficeCountry}
                          onChange={(e) =>
                            setFormData({ ...formData, dispatchOfficeCountry: e.target.value })
                          }
                          className="w-40 px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Land"
                        />
                        <input
                          type="text"
                          maxLength={2}
                          value={formData.dispatchOfficeCountryCode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              dispatchOfficeCountryCode: e.target.value.toUpperCase(),
                            })
                          }
                          className="w-16 px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="DE"
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={dispatchSearch}
                          onChange={(e) => {
                            setDispatchSearch(e.target.value)
                            setShowDispatchDropdown(true)
                          }}
                          onFocus={() => setShowDispatchDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDispatchDropdown(false), 200)}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Mindestens 2 Zeichen..."
                        />
                        {showDispatchDropdown &&
                          dispatchSearch.length >= 2 &&
                          dispatchOffices.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                              {dispatchOffices.map((office) => (
                                <div
                                  key={office.code}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    selectDispatchOffice(office)
                                  }}
                                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                >
                                  <div className="font-medium">
                                    {office.code} - {transliterate(office.name)}
                                  </div>
                                  <div className="text-xs text-gray-500">{office.countryCode}</div>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm font-medium text-gray-700">
                    Ankunftszollstelle*
                  </label>
                  <div className="flex-1">
                    {formData.destinationOffice ? (
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded bg-green-50">
                          <span className="flex-1 font-mono text-sm">
                            {formData.destinationOffice} -{' '}
                            {transliterate(formData.destinationOfficeName)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                destinationOfficeId: '',
                                destinationOffice: '',
                                destinationOfficeName: '',
                                destinationOfficeCountry: '',
                                destinationOfficeCountryCode: '',
                              })
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                        <input
                          type="text"
                          value={formData.destinationOfficeCountry}
                          onChange={(e) =>
                            setFormData({ ...formData, destinationOfficeCountry: e.target.value })
                          }
                          className="w-40 px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Land"
                        />
                        <input
                          type="text"
                          maxLength={2}
                          value={formData.destinationOfficeCountryCode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              destinationOfficeCountryCode: e.target.value.toUpperCase(),
                            })
                          }
                          className="w-16 px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="TR"
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={destinationSearch}
                          onChange={(e) => {
                            setDestinationSearch(e.target.value)
                            setShowDestinationDropdown(true)
                          }}
                          onFocus={() => setShowDestinationDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDestinationDropdown(false), 200)}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Mindestens 2 Zeichen..."
                        />
                        {showDestinationDropdown &&
                          destinationSearch.length >= 2 &&
                          destinationOffices.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                              {destinationOffices.map((office) => (
                                <div
                                  key={office.code}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    selectDestinationOffice(office)
                                  }}
                                  className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                                >
                                  <div className="font-medium">
                                    {office.code} - {transliterate(office.name)}
                                  </div>
                                  <div className="text-xs text-gray-500">{office.countryCode}</div>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-48 text-sm font-medium text-gray-700">Route</label>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={selectedRoute?.name || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
                      placeholder="Keine Route ausgewählt"
                    />
                    <button
                      type="button"
                      onClick={() => setIsRouteModalOpen(true)}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Wählen
                    </button>
                  </div>
                </div>

                <div></div>

                <div className="col-span-2 flex items-center gap-4">
                  <label className="w-48 text-sm font-medium text-gray-700">
                    Vereinfachtes Verfahren*
                  </label>
                  <input
                    type="checkbox"
                    checked={formData.simplifiedProcedure}
                    onChange={(e) =>
                      setFormData({ ...formData, simplifiedProcedure: e.target.checked })
                    }
                    className="w-5 h-5"
                  />
                </div>

                {formData.simplifiedProcedure && (
                  <>
                    <div className="flex items-center gap-4">
                      <label className="w-48 text-sm font-medium text-gray-700">Warenort*</label>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={
                            selectedGoodsLocation
                              ? `${selectedGoodsLocation.name} ${selectedGoodsLocation.code ? `(${selectedGoodsLocation.code})` : ''}`
                              : ''
                          }
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={() => setIsGoodsLocationModalOpen(true)}
                          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                        >
                          Wählen
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-start gap-4">
                        <label className="w-48 text-sm font-medium text-gray-700 pt-2">
                          Bewilligungen*
                        </label>
                        <div className="flex-1 space-y-2">
                          {authorizations.map((auth) => (
                            <label
                              key={auth.id}
                              className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={formData.authorizationIds.includes(auth.id)}
                                onChange={() => toggleAuthorization(auth.id)}
                                className="w-4 h-4"
                              />
                              <div>
                                <div className="font-medium text-sm">{auth.name}</div>
                                <div className="text-xs text-gray-600">Code: {auth.code}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={handlePruefen}
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                >
                  Prüfen
                </button>
                <button
                  type="button"
                  onClick={handleSpeichern}
                  disabled={!anmeldungValidated || loading}
                  className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? 'Wird gespeichert...'
                    : savedAnmNr
                      ? 'Änderungen speichern'
                      : 'Speichern'}
                </button>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/clearances')}
                    className="px-6 py-3 border border-gray-300 rounded hover:bg-gray-50 font-medium"
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'positionen' && (
            <div>
              <h3 className="text-xl font-bold mb-6">Positionen</h3>
              <p className="text-gray-600">Dieser Bereich wird später für OCR-Upload entwickelt.</p>
              <button
                onClick={() => {
                  setPositionenSaved(true)
                  setActiveTab('zusammenfassung')
                }}
                className="mt-4 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Weiter zur Zusammenfassung
              </button>
            </div>
          )}

          {activeTab === 'zusammenfassung' && (
            <div>
              <h3 className="text-xl font-bold mb-6">Zusammenfassung</h3>
              <p className="text-gray-600">
                Komplette Übersicht und Download-Optionen kommen hier hin.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="w-80 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Arbeitsverlauf</h3>

        {errors.length > 0 && (
          <div className="mb-4 space-y-2">
            {errors.map((err, idx) => (
              <div key={idx} className="text-red-600 text-sm flex items-start gap-2">
                <span className="text-red-600">✗</span>
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {workflowItems.length > 0 && (
          <div className="space-y-2">
            {workflowItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-green-600 mt-0.5">✓</span>
                <div>
                  <span className="font-medium">{item.label}:</span>
                  <span className="ml-1 text-gray-700">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.length === 0 && workflowItems.length === 0 && (
          <p className="text-gray-400 text-sm italic">Noch keine Einträge</p>
        )}
      </div>

      {/* Company Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Transportunternehmen wählen</h3>
                <button
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full px-4 py-2 border rounded mb-4"
                placeholder="Firma suchen..."
              />
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => selectCompany(company)}
                    className="p-4 border rounded cursor-pointer hover:bg-blue-50"
                  >
                    <div className="font-bold">{company.name}</div>
                    <div className="text-sm text-gray-600">
                      {company.address}, {company.city}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guarantee Modal */}
      {isGuaranteeModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Bürgschaft auswählen</h3>
                <button
                  onClick={() => setIsGuaranteeModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {availableGuarantees.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {formData.companyId
                    ? 'Keine Bürgschaften verfügbar'
                    : 'Bitte zuerst Firma wählen'}
                </p>
              ) : (
                <div className="space-y-3">
                  {availableGuarantees.map((guarantee) => (
                    <button
                      key={guarantee.id}
                      type="button"
                      onClick={() => selectGuarantee(guarantee)}
                      className="w-full p-4 border-2 rounded-lg text-left hover:border-green-500 hover:bg-green-50"
                    >
                      {guarantee.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Route Modal */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Route & Transit konfigurieren</h3>
                <button
                  onClick={() => setIsRouteModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="font-bold mb-3">Gespeicherte Routen</h4>
                <div className="grid grid-cols-2 gap-3">
                  {routes.map((route) => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => selectRoute(route)}
                      className={`p-4 border-2 rounded-lg text-left ${
                        formData.routeId === route.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="font-bold text-lg">{route.name}</div>
                      <div className="text-sm text-gray-600">{route.countries.join(' → ')}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold">Länder auf der Route (Drag & Drop)</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={2}
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value.toUpperCase())}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && (e.preventDefault(), addCustomCountry())
                      }
                      className="px-3 py-1 border rounded text-sm w-20"
                      placeholder="DE"
                    />
                    <button
                      type="button"
                      onClick={addCustomCountry}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      + Land
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.customRouteCountries.map((country, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleCountryDragStart(index)}
                      onDragOver={(e) => handleCountryDragOver(e, index)}
                      onDragEnd={handleCountryDragEnd}
                      className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg cursor-move hover:bg-blue-200"
                    >
                      <svg
                        className="h-4 w-4 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                      <span className="font-bold">{country}</span>
                      <button
                        type="button"
                        onClick={() => removeCountry(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold">Durchgangszollstellen (Drag & Drop)</h4>
                  <div className="flex gap-2 relative flex-1 max-w-md ml-4">
                    <input
                      type="text"
                      value={transitSearch}
                      onChange={(e) => setTransitSearch(e.target.value)}
                      className="flex-1 px-3 py-1 border rounded text-sm"
                      placeholder="Mindestens 2 Zeichen..."
                    />
                    {transitSearch.length >= 2 && transitOfficesResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto z-10">
                        {transitOfficesResults.map((office) => (
                          <div
                            key={office.code}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              addTransitOffice(office)
                            }}
                            className="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-medium">
                              {office.code} - {transliterate(office.name)}
                            </div>
                            <div className="text-xs text-gray-500">{office.countryCode}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {formData.transitOffices.map((office, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleTransitDragStart(index)}
                      onDragOver={(e) => handleTransitDragOver(e, index)}
                      onDragEnd={handleTransitDragEnd}
                      className="flex items-center justify-between bg-purple-100 px-4 py-3 rounded-lg cursor-move hover:bg-purple-200"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className="h-4 w-4 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8h16M4 16h16"
                          />
                        </svg>
                        <span className="font-mono font-bold">{office}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTransitOffice(index)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {formData.transitOffices.length === 0 && (
                    <p className="text-gray-500 text-sm italic text-center py-4">
                      Keine Durchgangszollstellen
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => setIsRouteModalOpen(false)}
                className="w-full bg-orange-600 text-white px-6 py-3 rounded hover:bg-orange-700 font-medium"
              >
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goods Location Modal */}
      {isGoodsLocationModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Warenort auswählen</h3>
                <button
                  onClick={() => setIsGoodsLocationModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {goodsLocations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => selectGoodsLocation(location)}
                    className={`p-4 border-2 rounded-lg text-left ${
                      formData.goodsLocationId === location.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="font-bold">{location.name}</div>
                    {location.code && (
                      <div className="text-sm text-gray-600">Code: {location.code}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
