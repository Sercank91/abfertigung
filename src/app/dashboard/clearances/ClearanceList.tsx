'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ✅ Helper für AnmNr Formatierung
function formatAnmNr(anmNr: string): string {
  if (!anmNr || anmNr.length !== 5) return anmNr;
  return `${anmNr.slice(0, 2)}.${anmNr.slice(2)}`;
}

interface Clearance {
  id: string;
  anmNr: string;  // ✅ NEU!
  lrn: string;
  licensePlate: string;
  licensePlateCountry: string;
  status: string;
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
  };
  guarantee: {
    id: string;
    name: string;
  };
  route: {
    id: string;
    name: string;
  } | null;
  createdBy: {
    firstName: string;
    lastName: string;
  };
  updatedBy?: {
    firstName: string;
    lastName: string;
  } | null;
}

interface User {
  role: string;
  firstName: string;
  lastName: string;
}

export default function ClearanceList() {
  const router = useRouter();
  const [clearances, setClearances] = useState<Clearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  // Filter States
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAnmNr, setFilterAnmNr] = useState('');  // ✅ NEU!
  const [filterLRN, setFilterLRN] = useState('');
  const [filterLicensePlate, setFilterLicensePlate] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [filterUpdatedBy, setFilterUpdatedBy] = useState('');
  
  // Search in Dropdowns
  const [searchCreatedBy, setSearchCreatedBy] = useState('');
  const [searchUpdatedBy, setSearchUpdatedBy] = useState('');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  
  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clearanceToDelete, setClearanceToDelete] = useState<Clearance | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Dropdown States
  const [showErstellerDropdown, setShowErstellerDropdown] = useState(false);
  const [showBearbeiterDropdown, setShowBearbeiterDropdown] = useState(false);

  useEffect(() => {
    loadClearances();
    loadUser();
    
    // Setze Datum von auf 1 Woche zurück
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    setFilterDateFrom(oneWeekAgoStr);
    
    // Datum bis bleibt leer (zeigt tt.mm.jjjj)
    setFilterDateTo('');
  }, []);

  // Auto-reload when page gets focus (z.B. nach Rückkehr von /new)
  useEffect(() => {
    const handleFocus = () => {
      loadClearances();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der User-Daten:', error);
    }
  };

  const loadClearances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clearances');
      
      if (response.ok) {
        const data = await response.json();
        setClearances(data.clearances || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Abfertigungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadClearances();
  };

  const handleResetFilters = () => {
    // Alle Filter komplett zurücksetzen (auch Datum!)
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAnmNr('');
    setFilterLRN('');
    setFilterLicensePlate('');
    setFilterCompany('');
    setFilterCreatedBy('');
    setFilterUpdatedBy('');
    setSearchCreatedBy('');
    setSearchUpdatedBy('');
    setCurrentPage(1);
  };

  const openDeleteConfirm = (clearance: Clearance) => {
    setClearanceToDelete(clearance);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setClearanceToDelete(null);
  };

  const handleDelete = async () => {
    if (!clearanceToDelete) return;

    try {
      setDeleting(true);
      // ✅ NEU: Löschen mit AnmNr!
      const response = await fetch(`/api/clearances/${clearanceToDelete.anmNr}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen');
      }

      await loadClearances();
      closeDeleteConfirm();
      
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Filter Logic
  const filteredClearances = clearances.filter(clearance => {
    if (filterDateFrom) {
      const clearanceDate = new Date(clearance.registrationDate);
      const fromDate = new Date(filterDateFrom);
      if (clearanceDate < fromDate) return false;
    }
    if (filterDateTo) {
      const clearanceDate = new Date(clearance.registrationDate);
      const toDate = new Date(filterDateTo);
      if (clearanceDate > toDate) return false;
    }
    
    // ✅ NEU: Filter nach AnmNr (mit oder ohne Punkt)
    if (filterAnmNr) {
      const searchValue = filterAnmNr.replace('.', '');
      if (!clearance.anmNr.toLowerCase().includes(searchValue.toLowerCase())) {
        return false;
      }
    }
    
    if (filterLRN && !clearance.lrn.toLowerCase().includes(filterLRN.toLowerCase())) {
      return false;
    }
    
    if (filterLicensePlate && !clearance.licensePlate.toLowerCase().includes(filterLicensePlate.toLowerCase())) {
      return false;
    }
    
    if (filterCompany && !clearance.company.name.toLowerCase().includes(filterCompany.toLowerCase())) {
      return false;
    }
    
    if (filterCreatedBy) {
      const fullName = `${clearance.createdBy.firstName} ${clearance.createdBy.lastName}`.toLowerCase();
      if (!fullName.includes(filterCreatedBy.toLowerCase())) {
        return false;
      }
    }
    
    if (filterUpdatedBy && clearance.updatedBy) {
      const fullName = `${clearance.updatedBy.firstName} ${clearance.updatedBy.lastName}`.toLowerCase();
      if (!fullName.includes(filterUpdatedBy.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredClearances.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClearances = filteredClearances.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push(-1);
      }
      
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push(-1);
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_bearbeitung':
        return 'bg-yellow-100 text-yellow-800';
      case 'vorbereitet':
        return 'bg-blue-100 text-blue-800';
      case 'abgeschlossen_teloweb':
        return 'bg-green-100 text-green-800';
      case 'abgeschlossen_dakosy':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_bearbeitung':
        return 'In Bearbeitung';
      case 'vorbereitet':
        return 'Vorbereitet';
      case 'abgeschlossen_teloweb':
        return 'Abgeschlossen (Teloweb)';
      case 'abgeschlossen_dakosy':
        return 'Abgeschlossen (Dakosy)';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get unique creators and updaters
  const uniqueCreators = Array.from(
    new Set(clearances.map(c => ({
      id: `${c.createdBy.firstName}${c.createdBy.lastName}`,
      firstName: c.createdBy.firstName,
      lastName: c.createdBy.lastName,
      fullName: `${c.createdBy.firstName} ${c.createdBy.lastName}`
    })).map(u => JSON.stringify(u)))
  ).map(str => JSON.parse(str));

  const uniqueUpdaters = Array.from(
    new Set(clearances
      .filter(c => c.updatedBy)
      .map(c => ({
        id: `${c.updatedBy!.firstName}${c.updatedBy!.lastName}`,
        firstName: c.updatedBy!.firstName,
        lastName: c.updatedBy!.lastName,
        fullName: `${c.updatedBy!.firstName} ${c.updatedBy!.lastName}`
      })).map(u => JSON.stringify(u)))
  ).map(str => JSON.parse(str));

  // Filter creators/updaters by search
  const filteredCreators = uniqueCreators.filter(u =>
    u.fullName.toLowerCase().includes(searchCreatedBy.toLowerCase())
  );

  const filteredUpdaters = uniqueUpdaters.filter(u =>
    u.fullName.toLowerCase().includes(searchUpdatedBy.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Action Buttons - Rechts bündig */}
      <div className="mb-4 flex justify-between items-center">
        <button 
          onClick={handleResetFilters}
          className="btn btn-outline-secondary"
          title="Alle Filter zurücksetzen"
        >
          <svg className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 512 512">
            <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200zm101.8-262.2L295.6 256l62.2 62.2c4.7 4.7 4.7 12.3 0 17l-22.6 22.6c-4.7 4.7-12.3 4.7-17 0L256 295.6l-62.2 62.2c-4.7 4.7-12.3 4.7-17 0l-22.6-22.6c-4.7-4.7-4.7-12.3 0-17l62.2-62.2-62.2-62.2c-4.7-4.7-4.7-12.3 0-17l22.6-22.6c4.7-4.7 12.3-4.7 17 0l62.2 62.2 62.2-62.2c4.7-4.7 12.3-4.7 17 0l22.6 22.6c4.7 4.7 4.7 12.3 0 17z"/>
          </svg>
          Filter zurücksetzen
        </button>

        <div className="flex gap-2">
          <button className="btn btn-outline-primary">
            <svg className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 448 512">
              <path d="M433.941 65.941l-51.882-51.882A48 48 0 0 0 348.118 0H176c-26.51 0-48 21.49-48 48v48H48c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48v-48h80c26.51 0 48-21.49 48-48V99.882a48 48 0 0 0-14.059-33.941zM266 464H54a6 6 0 0 1-6-6V150a6 6 0 0 1 6-6h74v224c0 26.51 21.49 48 48 48h96v42a6 6 0 0 1-6 6zm128-96H182a6 6 0 0 1-6-6V54a6 6 0 0 1 6-6h106v88c0 13.255 10.745 24 24 24h88v202a6 6 0 0 1-6 6zm6-256h-64V48h9.632c1.591 0 3.117.632 4.243 1.757l48.368 48.368a6 6 0 0 1 1.757 4.243V112z"/>
            </svg>
            Muster
          </button>
          
          <button 
            onClick={() => router.push('/dashboard/clearances/new')}
            className="btn btn-outline-primary"
          >
            <svg className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 384 512">
              <path d="M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zM332.1 128H256V51.9l76.1 76.1zM48 464V48h160v104c0 13.3 10.7 24 24 24h104v288H48z"/>
            </svg>
            Neu
          </button>
          
          <button className="btn btn-outline-secondary">
            <svg className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 512 512">
              <path d="M448 192V77.25c0-8.49-3.37-16.62-9.37-22.63L393.37 9.37c-6-6-14.14-9.37-22.63-9.37H96C78.33 0 64 14.33 64 32v160c-35.35 0-64 28.65-64 64v112c0 8.84 7.16 16 16 16h48v96c0 17.67 14.33 32 32 32h320c17.67 0 32-14.33 32-32v-96h48c8.84 0 16-7.16 16-16V256c0-35.35-28.65-64-64-64zm-64 256H128v-96h256v96zm0-224H128V64h192v48c0 8.84 7.16 16 16 16h48v96zm48 72c-13.25 0-24-10.75-24-24 0-13.26 10.75-24 24-24s24 10.74 24 24c0 13.25-10.75 24-24 24z"/>
            </svg>
            Drucken
          </button>
          
          <button 
            onClick={handleRefresh}
            className="btn btn-outline-secondary"
            disabled={loading}
          >
            <svg className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 512 512">
              <path d="M370.72 133.28C339.458 104.008 298.888 87.962 255.848 88c-77.458.068-144.328 53.178-162.791 126.85-1.344 5.363-6.122 9.15-11.651 9.15H24.103c-7.498 0-13.194-6.807-11.807-14.176C33.933 94.924 134.813 8 256 8c66.448 0 126.791 26.136 171.315 68.685L463.03 40.97C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.749zM32 296h134.059c21.382 0 32.09 25.851 16.971 40.971l-41.75 41.75c31.262 29.273 71.835 45.319 114.876 45.28 77.418-.07 144.315-53.144 162.787-126.849 1.344-5.363 6.122-9.15 11.651-9.15h57.304c7.498 0 13.194 6.807 11.807 14.176C478.067 417.076 377.187 504 256 504c-66.448 0-126.791-26.136-171.315-68.685L48.97 471.03C33.851 486.149 8 475.441 8 454.059V320c0-13.255 10.745-24 24-24z"/>
            </svg>
            {loading ? 'Lädt...' : 'Aktualisieren'}
          </button>
        </div>
      </div>

      {/* Filter Section - EINE REIHE */}
      <div className="row gx-1 mb-4">
        <div className="col-auto">
          <label htmlFor="filter_datumVon" className="tt-label">Datum von</label>
          <input
            type="date"
            id="filter_datumVon"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="form-control form-control-sm"
            style={{ width: '140px' }}
          />
        </div>

        <div className="col-auto">
          <label htmlFor="filter_datumBis" className="tt-label">Datum bis</label>
          <input
            type="date"
            id="filter_datumBis"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="form-control form-control-sm"
            style={{ width: '140px' }}
          />
        </div>

        {/* ✅ NEU: AnmNr Filter */}
        <div className="col">
          <label htmlFor="filter_anmnr" className="tt-label">Anmelde Nummer</label>
          <input
            type="text"
            id="filter_anmnr"
            value={filterAnmNr}
            onChange={(e) => setFilterAnmNr(e.target.value)}
            className="form-control form-control-sm"
            placeholder="25.055"
          />
        </div>

        <div className="col">
          <label htmlFor="filter_lrn" className="tt-label">LRN</label>
          <input
            type="text"
            id="filter_lrn"
            value={filterLRN}
            onChange={(e) => setFilterLRN(e.target.value)}
            className="form-control form-control-sm"
            placeholder="LRN..."
          />
        </div>
        <div className="col">
          <label htmlFor="filter_kennzeichen" className="tt-label">Kennzeichen</label>
          <input
            type="text"
            id="filter_kennzeichen"
            value={filterLicensePlate}
            onChange={(e) => setFilterLicensePlate(e.target.value)}
            className="form-control form-control-sm"
            placeholder="Kennzeichen..."
          />
        </div>

        <div className="col">
          <label htmlFor="filter_transportunternehmen" className="tt-label">Transportunternehmen</label>
          <input
            type="text"
            id="filter_transportunternehmen"
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="form-control form-control-sm"
            placeholder="Firma..."
          />
        </div>

        <div className="col position-relative">
          <label htmlFor="filter_ersteller" className="tt-label">Ersteller</label>
          <div className="input-group input-group-sm">
            <input
              type="text"
              id="filter_ersteller"
              value={filterCreatedBy}
              onChange={(e) => setFilterCreatedBy(e.target.value)}
              onFocus={() => setShowErstellerDropdown(true)}
              className="form-control form-control-sm"
              placeholder="Ersteller..."
            />
            <span 
              className="input-group-text" 
              style={{ cursor: 'pointer' }}
              onClick={() => setShowErstellerDropdown(!showErstellerDropdown)}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 512 512">
                <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/>
              </svg>
            </span>
          </div>
          
          {showErstellerDropdown && (
            <div className="dropdown-popup">
              <div className="p-2 border-b bg-gray-50">
                <input
                  type="text"
                  value={searchCreatedBy}
                  onChange={(e) => setSearchCreatedBy(e.target.value)}
                  className="form-control form-control-sm"
                  placeholder="Suchen..."
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-xs">ID</th>
                    <th className="px-3 py-2 text-xs">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreators.map((creator) => (
                    <tr
                      key={creator.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFilterCreatedBy(creator.fullName);
                        setShowErstellerDropdown(false);
                        setSearchCreatedBy('');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="px-3 py-2 text-sm">{creator.firstName}</td>
                      <td className="px-3 py-2 text-sm">{creator.fullName}</td>
                    </tr>
                  ))}
                  {filteredCreators.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center py-3 text-gray-500 text-sm">
                        Keine Ersteller gefunden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="col position-relative">
          <label htmlFor="filter_bearbeiter" className="tt-label">Bearbeiter</label>
          <div className="input-group input-group-sm">
            <input
              type="text"
              id="filter_bearbeiter"
              value={filterUpdatedBy}
              onChange={(e) => setFilterUpdatedBy(e.target.value)}
              onFocus={() => setShowBearbeiterDropdown(true)}
              className="form-control form-control-sm"
              placeholder="Bearbeiter..."
            />
            <span 
              className="input-group-text" 
              style={{ cursor: 'pointer' }}
              onClick={() => setShowBearbeiterDropdown(!showBearbeiterDropdown)}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 512 512">
                <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/>
              </svg>
            </span>
          </div>
          
          {showBearbeiterDropdown && (
            <div className="dropdown-popup">
              <div className="p-2 border-b bg-gray-50">
                <input
                  type="text"
                  value={searchUpdatedBy}
                  onChange={(e) => setSearchUpdatedBy(e.target.value)}
                  className="form-control form-control-sm"
                  placeholder="Suchen..."
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-xs">ID</th>
                    <th className="px-3 py-2 text-xs">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUpdaters.map((updater) => (
                    <tr
                      key={updater.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFilterUpdatedBy(updater.fullName);
                        setShowBearbeiterDropdown(false);
                        setSearchUpdatedBy('');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="px-3 py-2 text-sm">{updater.firstName}</td>
                      <td className="px-3 py-2 text-sm">{updater.fullName}</td>
                    </tr>
                  ))}
                  {filteredUpdaters.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center py-3 text-gray-500 text-sm">
                        Keine Bearbeiter gefunden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Info */}
      {(filterDateFrom || filterAnmNr || filterLRN || filterLicensePlate || filterCompany || filterCreatedBy || filterUpdatedBy) && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              <strong>Aktive Filter:</strong> {' '}
              {filteredClearances.length} von {clearances.length} Abfertigungen werden angezeigt
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="tt-scroll-y-container flex-1">
        <table className="table table-sm table-striped tt-table-bordered tt-table-th-sticky tt-white-space-nowrap">
          <thead>
            <tr>
              {/* ✅ NEU: AnmNr Spalte */}
              <th>Anm. Nr.</th>
              <th>LRN</th>
              <th>Firmenname</th>
              <th>Kennzeichen</th>
              <th>Status</th>
              <th>Erstellt von</th>
              <th>Zuletzt bearbeitet</th>
              <th>Datum und Uhrzeit</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {currentClearances.map((clearance) => (
              <tr key={clearance.id}>
                {/* ✅ NEU: AnmNr mit Formatierung und Link */}
                <td className="text-center">
                  <a 
                    href={`/dashboard/clearances/${clearance.anmNr}`}
                    className="text-blue-600 hover:underline font-mono font-bold"
                  >
                    {formatAnmNr(clearance.anmNr)}
                  </a>
                </td>
                <td className="text-center">
                  <span className="font-mono text-sm">
                    {clearance.lrn}
                  </span>
                </td>
                <td>{clearance.company.name}</td>
                <td className="text-center">{clearance.licensePlate}</td>
                <td className="text-center">
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(clearance.status)}`}>
                    {getStatusText(clearance.status)}
                  </span>
                </td>
                <td className="text-center">
                  {clearance.createdBy.firstName} {clearance.createdBy.lastName}
                </td>
                <td className="text-center">
                  {clearance.updatedBy 
                    ? `${clearance.updatedBy.firstName} ${clearance.updatedBy.lastName}`
                    : '-'
                  }
                </td>
                <td className="text-center">{formatDateTime(clearance.updatedAt)}</td>
                <td className="text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/clearances/${clearance.id}`)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      History
                    </button>
                    {/* ✅ NEU: Bearbeiten-Link mit AnmNr */}
                    <button
                      onClick={() => router.push(`/dashboard/clearances/${clearance.anmNr}`)}
                      className="text-sm text-blue-600 hover:text-blue-900"
                    >
                      Bearbeiten
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => openDeleteConfirm(clearance)}
                        className="text-sm text-red-600 hover:text-red-900"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {currentClearances.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Keine Abfertigungen gefunden
          </div>
        )}
      </div>

      {/* Footer with Pagination */}
      <div className="tt-footer-bar">
        <span className="text-sm">Anzahl: {filteredClearances.length}</span>
        
        <div className="d-flex align-items-center gap-3">
          <label htmlFor="itemsPerPageSelect" className="text-sm mb-0">
            Zeilen pro Seite
          </label>
          <select
            id="itemsPerPageSelect"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="form-select form-select-sm"
            style={{ width: '70px' }}
          >
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
              </li>

              {getPageNumbers().map((page, index) => (
                page === -1 ? (
                  <li key={`ellipsis-${index}`} className="page-item disabled">
                    <span className="page-link">...</span>
                  </li>
                ) : (
                  <li
                    key={page}
                    className={`page-item ${currentPage === page ? 'active' : ''}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  </li>
                )
              ))}

              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteConfirmOpen && clearanceToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Abfertigung löschen?</h3>
            <p className="text-gray-600 mb-6">
              Möchten Sie die Abfertigung <strong>{formatAnmNr(clearanceToDelete.anmNr)}</strong> (LRN: {clearanceToDelete.lrn}) wirklich löschen?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className="px-6 py-3 border rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {deleting ? 'Wird gelöscht...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(showErstellerDropdown || showBearbeiterDropdown) && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowErstellerDropdown(false);
            setShowBearbeiterDropdown(false);
          }}
        />
      )}

      <style jsx>{`
        /* TeloWeb Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.75rem;
          font-size: 0.9rem;
          border-radius: 0.25rem;
          border: 1px solid;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-outline-primary {
          color: #0076bc;
          border-color: #0076bc;
        }
        .btn-outline-primary:hover {
          color: #fff;
          background-color: #0076bc;
        }
        .btn-outline-secondary {
          color: #525252;
          border-color: #525252;
        }
        .btn-outline-secondary:hover {
          color: #fff;
          background-color: #525252;
        }

        /* Forms */
        .tt-label {
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
          display: block;
        }
        .form-control-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.9rem;
          border: 1px solid #c6c6c6;
          border-radius: 0.2rem;
          width: 100%;
          height: 31px;
          line-height: 1.5;
        }
        .form-control-sm:focus {
          border-color: #0076bc;
          outline: 0;
        }
        .form-select-sm {
          height: 31px;
          padding: 0.25rem 0.5rem;
          font-size: 0.9rem;
          border: 1px solid #c6c6c6;
          border-radius: 0.2rem;
        }
        .input-group-sm {
          display: flex;
          height: 31px;
        }
        .input-group-sm .form-control-sm {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
        .input-group-text {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem 0.5rem;
          font-size: 0.9rem;
          background-color: #f2f2f2;
          border: 1px solid #c6c6c6;
          border-left: 0;
          border-radius: 0 0.25rem 0.25rem 0;
          height: 31px;
        }
        .input-group-text svg {
          display: block;
        }

        /* Dropdown */
        .dropdown-popup {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: #fff;
          border: 1px solid #3db7ff;
          border-radius: 0.25rem;
          box-shadow: 0 0 7px -2px #0077bc;
          z-index: 50;
          max-height: 300px;
          overflow-y: auto;
        }

        /* Table */
        .table {
          width: 100%;
          color: #333;
          border-collapse: collapse;
        }
        .table-sm th,
        .table-sm td {
          padding: 0.5rem;
          font-size: 0.9rem;
        }
        .table-striped tbody tr:nth-of-type(odd) {
          background-color: #f8f8f8;
        }
        .tt-table-bordered th,
        .tt-table-bordered td {
          border: 1px solid #e1e1e1;
        }
        .tt-table-th-sticky thead {
          position: sticky;
          top: 0;
          background: #fff;
          z-index: 10;
        }
        .tt-scroll-y-container {
          overflow-y: auto;
          flex: 1;
          min-height: 300px;
        }

        /* Footer */
        .tt-footer-bar {
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
          border-top: 1px solid #c6c6c6;
          background-color: #f2f2f2;
        }

        /* Pagination */
        .pagination {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: 2px;
        }
        .page-link {
          padding: 0.25rem 0.5rem;
          min-width: 32px;
          text-align: center;
          color: #0076bc;
          background: #fff;
          border: 1px solid #e1e1e1;
          border-radius: 0.25rem;
          cursor: pointer;
        }
        .page-item.active .page-link {
          color: #fff;
          background-color: #0076bc;
          border-color: #0076bc;
        }
        .page-item.disabled .page-link {
          color: #8d8d8d;
          pointer-events: none;
        }
        .page-link:hover:not(.disabled) {
          background-color: #f2f2f2;
        }

        /* Grid */
        .row {
          display: flex;
          flex-wrap: wrap;
          margin: -0.125rem;
        }
        .row > * {
          padding: 0.125rem;
        }
        .col-auto {
          flex: 0 0 auto;
        }
        .col {
          flex: 1;
        }

        /* Utilities */
        .d-flex { display: flex; }
        .align-items-center { align-items: center; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 1rem; }
        .justify-end { justify-content: flex-end; }
        .text-end { text-align: right; }
        .text-center { text-align: center; }
        .text-sm { font-size: 0.875rem; }
        .mb-0 { margin-bottom: 0; }
        .mb-4 { margin-bottom: 1.5rem; }
        .position-relative { position: relative; }
        .flex-1 { flex: 1; }

        /* Filter Info */
        .bg-blue-50 { background-color: #eff6ff; }
        .border-blue-200 { border-color: #bfdbfe; }
        .text-blue-800 { color: #1e40af; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .p-3 { padding: 1rem; }
        .border { border-width: 1px; border-style: solid; }
        .rounded { border-radius: 0.25rem; }
      `}</style>
    </>
  );
}