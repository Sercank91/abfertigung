'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { showSuccess, showError, showWarning } from '@/lib/utils/toast';
import { formatAnmNr, getCountryName } from '@/lib/utils';

// Import all our new components
import CompanySelector from './components/selectors/CompanySelector';
import GuaranteeSelector from './components/selectors/GuaranteeSelector';
import CustomsOfficeSelector from './components/selectors/CustomsOfficeSelector';
import RouteSelector from './components/selectors/RouteSelector';
import GoodsLocationSelector from './components/selectors/GoodsLocationSelector';
import AuthorizationSelector from './components/selectors/AuthorizationSelector';
import LRNInput from './components/inputs/LRNInput';
import DateInputs from './components/inputs/DateInputs';
import LicensePlateInput from './components/inputs/LicensePlateInput';
import SimplifiedProcedureSection from './components/sections/SimplifiedProcedureSection';
import WorkflowSidebar from './components/WorkflowSidebar';
import PositionenTab from './components/tabs/PositionenTab';
import ZusammenfassungTab from './components/tabs/ZusammenfassungTab';

// Types
interface Company {
  id: string;
  name: string;
  country: string;
  address: string;
  postalCode: string;
  city: string;
  guarantees: Array<{ id: string; name: string }>;
}

interface Route {
  id: string;
  name: string;
  countries: string[];
  transitOffices?: Array<{
    id: string;
    order: number;
    customsOffice: {
      id: string;
      code: string;
      name: string;
      countryCode: string;
    };
  }>;
}

interface CustomsOffice {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  city?: string;
}

interface GoodsLocation {
  id: string;
  name: string;
  code: string | null;
}

interface Authorization {
  id: string;
  name: string;
  code: string;
}

interface ClearanceFormProps {
  anmNr?: string;
  userId: string;
}

export default function ClearanceForm({ anmNr, userId }: ClearanceFormProps) {
  const router = useRouter();
  const isEditMode = !!anmNr;

  // Tab State
  const [activeTab, setActiveTab] = useState<'anmeldung' | 'positionen' | 'zusammenfassung'>(
    'anmeldung'
  );
  const [anmeldungValidated, setAnmeldungValidated] = useState(false);
  const [anmeldungSaved, setAnmeldungSaved] = useState(false);

  // Form Data State
  const [formData, setFormData] = useState({
    lrn: '',
    declarationDate: new Date().toISOString().split('T')[0],
    arrivalDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

    // Company
    companyId: '',
    companyName: '',
    companyAddress: '',
    companyPostalCode: '',
    companyCity: '',
    companyCountry: '',

    // Guarantee
    guaranteeId: '',

    // License Plates
    licensePlateType: '' as '30' | '40' | '',
    licensePlate: '',
    licensePlateCountry: '',
    hasSecondPlate: false,
    secondLicensePlate: '',
    secondPlateCountry: '',

    // Customs Offices
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

    // Route
    routeId: '',
    customRouteCountries: [] as string[],
    transitOffices: [] as string[],

    // Simplified Procedure
    simplifiedProcedure: false,
    goodsLocationId: '',
    authorizationIds: [] as string[],
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [workflowItems, setWorkflowItems] = useState<Array<{ label: string; value: string }>>([]);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [savedAnmNr, setSavedAnmNr] = useState(anmNr);

  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [goodsLocations, setGoodsLocations] = useState<GoodsLocation[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [customsOffices, setCustomsOffices] = useState<CustomsOffice[]>([]);

  // Derived Data
  const selectedCompany = companies.find((c) => c.id === formData.companyId);
  const selectedGuarantee = selectedCompany?.guarantees.find((g) => g.id === formData.guaranteeId);
  const selectedRoute = routes.find((r) => r.id === formData.routeId);
  const selectedGoodsLocation = goodsLocations.find((g) => g.id === formData.goodsLocationId);
  const availableGuarantees = selectedCompany?.guarantees || [];

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load clearance data if editing
  useEffect(() => {
    if (anmNr) {
      loadClearanceData(anmNr);
    }
  }, [anmNr]);

  const loadInitialData = async () => {
    try {
      const [companiesRes, routesRes, goodsLocRes, authsRes, officesRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/routes'),
        fetch('/api/goods-locations'),
        fetch('/api/authorizations'),
        fetch('/api/customs-offices'),
      ]);

      const [companiesData, routesData, goodsLocData, authsData, officesData] = await Promise.all([
        companiesRes.json(),
        routesRes.json(),
        goodsLocRes.json(),
        authsRes.json(),
        officesRes.json(),
      ]);

      setCompanies(companiesData.companies || []);
      setRoutes(routesData.routes || []);
      setGoodsLocations(goodsLocData.goodsLocations || []);
      setAuthorizations(authsData.authorizations || []);
      setCustomsOffices(officesData.offices || []);
    } catch (err) {
      console.error('Error loading initial data:', err);
      showError('Fehler beim Laden der Stammdaten');
    }
  };

  const loadClearanceData = async (anmNr: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/clearances/${anmNr}`);
      if (!response.ok) throw new Error('Clearance nicht gefunden');

      const data = await response.json();

      setFormData({
        lrn: data.lrn || '',
        declarationDate: data.registrationDate
          ? new Date(data.registrationDate).toISOString().split('T')[0]
          : '',
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate).toISOString().split('T')[0] : '',

        companyId: data.companyId || '',
        companyName: data.company?.name || '',
        companyAddress: data.company?.address || '',
        companyPostalCode: data.company?.postalCode || '',
        companyCity: data.company?.city || '',
        companyCountry: data.company?.country || '',

        guaranteeId: data.guaranteeId || '',

        licensePlateType: (data.licensePlate?.startsWith('30') ? '30' : '40') as '30' | '40',
        licensePlate: data.licensePlate || '',
        licensePlateCountry: data.licensePlateCountry || '',
        hasSecondPlate: data.hasSecondPlate || false,
        secondLicensePlate: data.secondLicensePlate || '',
        secondPlateCountry: data.secondPlateCountry || '',

        departureOfficeId: data.departureOfficeId || '',
        departureOffice: data.departureOffice?.code || '',
        departureOfficeName: data.departureOffice?.name || '',
        departureOfficeCountry: data.departureOffice?.countryCode || '',

        dispatchOfficeId: data.dispatchOfficeId || '',
        dispatchOffice: data.dispatchOffice?.code || '',
        dispatchOfficeName: data.dispatchOffice?.name || '',
        dispatchOfficeCountry: data.dispatchOffice?.countryCode
          ? getCountryName(data.dispatchOffice.countryCode)
          : '',
        dispatchOfficeCountryCode: data.dispatchOffice?.countryCode || '',

        destinationOfficeId: data.destinationOfficeId || '',
        destinationOffice: data.destinationOffice?.code || '',
        destinationOfficeName: data.destinationOffice?.name || '',
        destinationOfficeCountry: data.destinationOffice?.countryCode
          ? getCountryName(data.destinationOffice.countryCode)
          : '',
        destinationOfficeCountryCode: data.destinationOffice?.countryCode || '',

        routeId: data.routeId || '',
        customRouteCountries: data.route?.countries || [],
        transitOffices: data.route?.transitOffices?.map((t: any) => t.customsOffice.code) || [],

        simplifiedProcedure: data.simplifiedProcedure || false,
        goodsLocationId: data.goodsLocationId || '',
        authorizationIds: data.authorizationId ? [data.authorizationId] : [],
      });

      setSavedAnmNr(data.anmNr);
    } catch (err: any) {
      console.error('Error loading clearance:', err);
      setErrors([err.message || 'Fehler beim Laden']);
      showError('Fehler beim Laden der Clearance');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Company
  const handleCompanySelect = (company: Company) => {
    setFormData({
      ...formData,
      companyId: company.id,
      companyName: company.name,
      companyAddress: company.address,
      companyPostalCode: company.postalCode,
      companyCity: company.city,
      companyCountry: company.country,
      guaranteeId: '', // Reset guarantee when company changes
    });
  };

  const handleCompanyFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // Handlers for Guarantee
  const handleGuaranteeSelect = (guarantee: { id: string; name: string }) => {
    setFormData({ ...formData, guaranteeId: guarantee.id });
  };

  // Handlers for Customs Offices
  const handleDepartureOfficeSelect = (office: CustomsOffice) => {
    setFormData({
      ...formData,
      departureOfficeId: office.id,
      departureOffice: office.code,
      departureOfficeName: office.name,
      departureOfficeCountry: office.countryCode,
    });
  };

  const handleDepartureOfficeClear = () => {
    setFormData({
      ...formData,
      departureOfficeId: '',
      departureOffice: '',
      departureOfficeName: '',
      departureOfficeCountry: '',
    });
  };

  const handleDispatchOfficeSelect = (office: CustomsOffice) => {
    setFormData({
      ...formData,
      dispatchOfficeId: office.id,
      dispatchOffice: office.code,
      dispatchOfficeName: office.name,
      dispatchOfficeCountry: getCountryName(office.countryCode), // Voller Ländername
      dispatchOfficeCountryCode: office.countryCode,
    });
  };

  const handleDispatchOfficeClear = () => {
    setFormData({
      ...formData,
      dispatchOfficeId: '',
      dispatchOffice: '',
      dispatchOfficeName: '',
      dispatchOfficeCountry: '',
      dispatchOfficeCountryCode: '',
    });
  };

  const handleDestinationOfficeSelect = (office: CustomsOffice) => {
    setFormData({
      ...formData,
      destinationOfficeId: office.id,
      destinationOffice: office.code,
      destinationOfficeName: office.name,
      destinationOfficeCountry: getCountryName(office.countryCode), // Voller Ländername
      destinationOfficeCountryCode: office.countryCode,
    });
  };

  const handleDestinationOfficeClear = () => {
    setFormData({
      ...formData,
      destinationOfficeId: '',
      destinationOffice: '',
      destinationOfficeName: '',
      destinationOfficeCountry: '',
      destinationOfficeCountryCode: '',
    });
  };

  // Handlers for Route
  const handleRouteSelect = (route: Route) => {
    setFormData({
      ...formData,
      routeId: route.id,
      customRouteCountries: route.countries,
      transitOffices: route.transitOffices
        ? route.transitOffices.sort((a, b) => a.order - b.order).map((t) => t.customsOffice.code)
        : [],
    });
  };

  const handleCountriesChange = (countries: string[]) => {
    setFormData({ ...formData, customRouteCountries: countries });
  };

  const handleTransitOfficesChange = (offices: string[]) => {
    setFormData({ ...formData, transitOffices: offices });
  };

  // Handlers for Goods Location & Authorization
  const handleGoodsLocationSelect = (location: GoodsLocation) => {
    setFormData({ ...formData, goodsLocationId: location.id });
  };

  const handleAuthorizationChange = (ids: string[]) => {
    setFormData({ ...formData, authorizationIds: ids });
  };

  // Validation
  const handlePruefen = () => {
    const newErrors: string[] = [];

    if (!formData.lrn) newErrors.push('LRN fehlt');
    if (!formData.declarationDate) newErrors.push('Anmeldedatum fehlt');
    if (!formData.arrivalDate) newErrors.push('Ankunftsdatum fehlt');
    if (!formData.companyId) newErrors.push('Transportunternehmen wurde nicht gewählt');
    if (!formData.guaranteeId) newErrors.push('Bürgschaft fehlt');
    if (!formData.licensePlate) newErrors.push('Kennzeichen fehlt');
    if (!formData.licensePlateCountry) newErrors.push('Kennzeichen-Land fehlt');
    if (!formData.departureOffice) newErrors.push('Grenzzollstelle fehlt');
    if (!formData.dispatchOffice) newErrors.push('Versandzollstelle fehlt');
    if (!formData.destinationOffice) newErrors.push('Ankunftszollstelle fehlt');

    if (formData.simplifiedProcedure) {
      if (!formData.goodsLocationId) newErrors.push('Warenort fehlt (vereinfachtes Verfahren)');
      if (formData.authorizationIds.length === 0)
        newErrors.push('Bewilligung fehlt (vereinfachtes Verfahren)');
    }

    setErrors(newErrors);
    if (newErrors.length === 0) {
      setAnmeldungValidated(true);
      showSuccess('Prüfung erfolgreich! Sie können jetzt speichern.');
    } else {
      setAnmeldungValidated(false);
      showError('Bitte alle Pflichtfelder ausfüllen!');
    }
  };

  // Save
  const handleSpeichern = async () => {
    if (!anmeldungValidated) {
      showWarning('Bitte zuerst prüfen!');
      return;
    }

    setLoading(true);
    try {
      const method = savedAnmNr ? 'PUT' : 'POST';
      const url = savedAnmNr ? `/api/clearances/${savedAnmNr}` : '/api/clearances';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          departureOfficeId: formData.departureOfficeId || null,
          dispatchOfficeId: formData.dispatchOfficeId || null,
          destinationOfficeId: formData.destinationOfficeId || null,
          createdById: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!savedAnmNr && data.clearance?.anmNr) {
        setSavedAnmNr(data.clearance.anmNr);
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
      ];

      if (selectedRoute) {
        items.push({ label: 'Route', value: selectedRoute.name });
      }
      if (formData.simplifiedProcedure && selectedGoodsLocation) {
        items.push({ label: 'Warenort', value: selectedGoodsLocation.name });
      }
      if (formData.authorizationIds.length > 0) {
        const authNames = authorizations
          .filter((a) => formData.authorizationIds.includes(a.id))
          .map((a) => a.code)
          .join(', ');
        items.push({ label: 'Bewilligung', value: authNames });
      }

      setWorkflowItems(items);
      setAnmeldungSaved(true);
      setErrors([]);

      const successMessage = savedAnmNr
        ? 'Änderungen erfolgreich gespeichert!'
        : 'Clearance erfolgreich gespeichert!';

      showSuccess(successMessage);

      if (isEditMode) {
        // Bleibe auf der Edit-Seite
      } else {
        // Bei neuer Clearance: Redirect zur Edit-Seite
        router.push(`/dashboard/clearances/${data.clearance.anmNr}`);
      }
    } catch (err: any) {
      console.error('Fehler beim Speichern:', err);
      setErrors([err.message || 'Unbekannter Fehler beim Speichern']);
      showError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? `Clearance bearbeiten: ${formatAnmNr(savedAnmNr || '')}` : 'Neue Clearance'}
          </h2>
          {isEditMode && savedAnmNr && (
            <p className="text-sm text-gray-600 mt-1">AnmNr: {formatAnmNr(savedAnmNr)}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('anmeldung')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'anmeldung'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              1. Anmeldung
            </button>
            <button
              onClick={() => setActiveTab('positionen')}
              disabled={!anmeldungSaved}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'positionen'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : anmeldungSaved
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              2. Positionen
            </button>
            <button
              onClick={() => setActiveTab('zusammenfassung')}
              disabled={!anmeldungSaved}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'zusammenfassung'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : anmeldungSaved
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              3. Zusammenfassung
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'anmeldung' && (
          <div className="space-y-6">
            {/* LRN */}
            <LRNInput
              value={formData.lrn}
              onChange={(value) => setFormData({ ...formData, lrn: value })}
            />

            {/* Dates */}
            <DateInputs
              declarationDate={formData.declarationDate}
              arrivalDate={formData.arrivalDate}
              onDeclarationDateChange={(value) =>
                setFormData({ ...formData, declarationDate: value })
              }
              onArrivalDateChange={(value) => setFormData({ ...formData, arrivalDate: value })}
            />

            {/* Company */}
            <CompanySelector
              companyId={formData.companyId}
              companyName={formData.companyName}
              companyAddress={formData.companyAddress}
              companyPostalCode={formData.companyPostalCode}
              companyCity={formData.companyCity}
              companyCountry={formData.companyCountry}
              onSelect={handleCompanySelect}
              onFieldChange={handleCompanyFieldChange}
              companies={companies}
              isEditing={isEditingCompany}
              onEditToggle={() => setIsEditingCompany(!isEditingCompany)}
            />

            {/* Guarantee */}
            <GuaranteeSelector
              guaranteeId={formData.guaranteeId}
              guaranteeName={selectedGuarantee?.name}
              onSelect={handleGuaranteeSelect}
              availableGuarantees={availableGuarantees}
              hasCompanySelected={!!formData.companyId}
            />

            {/* License Plate */}
            <LicensePlateInput
              licensePlateType={formData.licensePlateType}
              licensePlate={formData.licensePlate}
              licensePlateCountry={formData.licensePlateCountry}
              hasSecondPlate={formData.hasSecondPlate}
              secondLicensePlate={formData.secondLicensePlate}
              secondPlateCountry={formData.secondPlateCountry}
              onTypeChange={(type) => setFormData({ ...formData, licensePlateType: type })}
              onPlateChange={(value) => setFormData({ ...formData, licensePlate: value })}
              onCountryChange={(value) =>
                setFormData({ ...formData, licensePlateCountry: value })
              }
              onSecondPlateToggle={() =>
                setFormData({ ...formData, hasSecondPlate: !formData.hasSecondPlate })
              }
              onSecondPlateChange={(value) =>
                setFormData({ ...formData, secondLicensePlate: value })
              }
              onSecondCountryChange={(value) =>
                setFormData({ ...formData, secondPlateCountry: value })
              }
            />

            {/* Customs Offices */}
            <CustomsOfficeSelector
              type="departure"
              selectedCode={formData.departureOffice}
              selectedName={formData.departureOfficeName}
              selectedCountry={formData.departureOfficeCountry}
              selectedId={formData.departureOfficeId}
              onSelect={handleDepartureOfficeSelect}
              onClear={handleDepartureOfficeClear}
              labelWidth="w-48"
            />

            <CustomsOfficeSelector
              type="dispatch"
              selectedCode={formData.dispatchOffice}
              selectedName={formData.dispatchOfficeName}
              selectedCountry={formData.dispatchOfficeCountry}
              selectedCountryCode={formData.dispatchOfficeCountryCode}
              selectedId={formData.dispatchOfficeId}
              onSelect={handleDispatchOfficeSelect}
              onClear={handleDispatchOfficeClear}
              onCountryChange={(country) => setFormData({ ...formData, dispatchOfficeCountry: country })}
              onCountryCodeChange={(code) => setFormData({ ...formData, dispatchOfficeCountryCode: code })}
              labelWidth="w-48"
            />

            <CustomsOfficeSelector
              type="destination"
              selectedCode={formData.destinationOffice}
              selectedName={formData.destinationOfficeName}
              selectedCountry={formData.destinationOfficeCountry}
              selectedCountryCode={formData.destinationOfficeCountryCode}
              selectedId={formData.destinationOfficeId}
              onSelect={handleDestinationOfficeSelect}
              onClear={handleDestinationOfficeClear}
              onCountryChange={(country) => setFormData({ ...formData, destinationOfficeCountry: country })}
              onCountryCodeChange={(code) => setFormData({ ...formData, destinationOfficeCountryCode: code })}
              labelWidth="w-48"
            />

            {/* Route */}
            <RouteSelector
              selectedRouteId={formData.routeId}
              selectedRouteName={selectedRoute?.name}
              customRouteCountries={formData.customRouteCountries}
              transitOffices={formData.transitOffices}
              onRouteSelect={handleRouteSelect}
              onCountriesChange={handleCountriesChange}
              onTransitOfficesChange={handleTransitOfficesChange}
              availableRoutes={routes}
            />

            {/* Simplified Procedure */}
            <SimplifiedProcedureSection
              isEnabled={formData.simplifiedProcedure}
              onToggle={() =>
                setFormData({ ...formData, simplifiedProcedure: !formData.simplifiedProcedure })
              }
            />

            {/* Goods Location & Authorization (conditional) */}
            {formData.simplifiedProcedure && (
              <>
                <GoodsLocationSelector
                  goodsLocationId={formData.goodsLocationId}
                  goodsLocationName={selectedGoodsLocation?.name}
                  onSelect={handleGoodsLocationSelect}
                  goodsLocations={goodsLocations}
                  isEnabled={formData.simplifiedProcedure}
                />

                <AuthorizationSelector
                  selectedIds={formData.authorizationIds}
                  onSelectionChange={handleAuthorizationChange}
                  authorizations={authorizations}
                  isEnabled={formData.simplifiedProcedure}
                />
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handlePruefen}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                disabled={loading}
              >
                Prüfen
              </button>
              <button
                type="button"
                onClick={handleSpeichern}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                disabled={!anmeldungValidated || loading}
              >
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/clearances')}
                  className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'positionen' && (
          <PositionenTab onNext={() => setActiveTab('zusammenfassung')} />
        )}

        {activeTab === 'zusammenfassung' && (
          <ZusammenfassungTab anmNr={savedAnmNr ? formatAnmNr(savedAnmNr) : undefined} lrn={formData.lrn} />
        )}
      </div>

      {/* Workflow Sidebar */}
      <div className="w-80">
        <WorkflowSidebar errors={errors} savedItems={workflowItems} />
      </div>
    </div>
  );
}
