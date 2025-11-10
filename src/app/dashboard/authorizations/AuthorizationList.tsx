'use client';

import React, { useState, useMemo, useCallback, useTransition, useRef, useEffect } from 'react';

// Types
interface Authorization {
  id: string;
  name: string;
  description: string | null;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialAuthorizations: Authorization[];
  canEdit: boolean;
}

interface FormData {
  name: string;
  description: string;
  code: string;
  isActive: boolean;
}

interface ApiError {
  error: string;
  details?: Record<string, string>;
}

// Constants
const DEBOUNCE_DELAY = 300;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MIN_CODE_LENGTH = 3;
const MAX_CODE_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 500;

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Validation
const validateForm = (data: FormData): string[] => {
  const errors: string[] = [];
  
  // Name validation
  if (data.name.length < MIN_NAME_LENGTH) {
    errors.push(`Name muss mindestens ${MIN_NAME_LENGTH} Zeichen haben`);
  }
  if (data.name.length > MAX_NAME_LENGTH) {
    errors.push(`Name darf maximal ${MAX_NAME_LENGTH} Zeichen haben`);
  }
  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(data.name)) {
    errors.push('Name enthält ungültige Zeichen');
  }
  
  // Code validation
  if (data.code.length < MIN_CODE_LENGTH) {
    errors.push(`Code muss mindestens ${MIN_CODE_LENGTH} Zeichen haben`);
  }
  if (data.code.length > MAX_CODE_LENGTH) {
    errors.push(`Code darf maximal ${MAX_CODE_LENGTH} Zeichen haben`);
  }
  if (!/^[A-Z0-9]+$/.test(data.code)) {
    errors.push('Code darf nur Großbuchstaben und Zahlen enthalten');
  }
  
  // Description validation
  if (data.description && data.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Beschreibung darf maximal ${MAX_DESCRIPTION_LENGTH} Zeichen haben`);
  }
  
  return errors;
};

// Sanitize input
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export default function AuthorizationList({ initialAuthorizations, canEdit }: Props) {
  const [authorizations, setAuthorizations] = useState<Authorization[]>(initialAuthorizations);
  const [searchInput, setSearchInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<Authorization | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    code: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchInput, DEBOUNCE_DELAY);

  // Memoized filter with sanitized search
  const filteredAuthorizations = useMemo(() => {
    if (!debouncedSearchTerm) return authorizations;
    
    const sanitizedTerm = sanitizeInput(debouncedSearchTerm).toLowerCase();
    return authorizations.filter(auth =>
      auth.name.toLowerCase().includes(sanitizedTerm) ||
      auth.code.toLowerCase().includes(sanitizedTerm) ||
      (auth.description && auth.description.toLowerCase().includes(sanitizedTerm))
    );
  }, [authorizations, debouncedSearchTerm]);

  // Modal handlers
  const openModal = useCallback((auth?: Authorization) => {
    if (auth) {
      setEditingAuth(auth);
      setFormData({
        name: auth.name,
        description: auth.description || '',
        code: auth.code,
        isActive: auth.isActive
      });
    } else {
      setEditingAuth(null);
      setFormData({
        name: '',
        description: '',
        code: '',
        isActive: true
      });
    }
    setErrors([]);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingAuth(null);
    setFormData({
      name: '',
      description: '',
      code: '',
      isActive: true
    });
    setErrors([]);
  }, []);

  // Submit handler with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    // Client-side validation
    const validationErrors = validateForm(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors([]);

    // Sanitize data
    const sanitizedData: FormData = {
      name: sanitizeInput(formData.name),
      description: sanitizeInput(formData.description),
      code: sanitizeInput(formData.code).toUpperCase(),
      isActive: formData.isActive
    };

    try {
      const url = editingAuth
        ? `/api/authorizations/${editingAuth.id}`
        : '/api/authorizations';
      
      const method = editingAuth ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // CSRF protection
        },
        body: JSON.stringify(sanitizedData),
        credentials: 'same-origin' // Include cookies
      });

      const data: ApiError | { authorization: Authorization } = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.error || 'Fehler beim Speichern');
      }

      const result = data as { authorization: Authorization };

      // Optimistic update
      if (editingAuth) {
        setAuthorizations(prev => prev.map(auth =>
          auth.id === editingAuth.id ? result.authorization : auth
        ));
      } else {
        setAuthorizations(prev => [...prev, result.authorization]);
      }

      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten';
      setErrors([message]);
    } finally {
      setLoading(false);
    }
  };

  // Delete handler with confirmation
  const handleDelete = useCallback(async (id: string, name: string) => {
    // Custom confirm dialog würde hier besser sein
    if (!confirm(`Möchten Sie die Bewilligung "${name}" wirklich löschen?`)) {
      return;
    }

    setDeleteLoadingId(id);

    try {
      const response = await fetch(`/api/authorizations/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Requested-With': 'XMLHttpRequest' // CSRF protection
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const data: ApiError = await response.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      // Optimistic update
      setAuthorizations(prev => prev.filter(auth => auth.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Löschen';
      // Bessere Error-Anzeige statt alert
      alert(message);
    } finally {
      setDeleteLoadingId(null);
    }
  }, []);

  // Form input handler mit Validation
  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user types
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [errors.length]);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      setSearchInput(e.target.value);
    });
  }, []);

  return (
    <>
      {/* Search Bar & Add Button */}
      <div className="bg-white mb-4 p-3 border border-[#c6c6c6] rounded-sm">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Bewilligungen suchen..."
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm pr-8 focus:border-[#0076bc] focus:outline-none"
              maxLength={100}
              aria-label="Bewilligungen suchen"
            />
            <svg
              className="absolute right-2 top-1.5 text-gray-400 pointer-events-none"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Counter */}
          <div className="text-xs text-[#525252] whitespace-nowrap" role="status" aria-live="polite">
            {isPending ? (
              <span className="opacity-50">Suche...</span>
            ) : (
              `${filteredAuthorizations.length} ${filteredAuthorizations.length === 1 ? 'Bewilligung' : 'Bewilligungen'}`
            )}
          </div>

          {/* Add Button */}
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0076bc] focus:ring-offset-1"
              aria-label="Neue Bewilligung hinzufügen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Bewilligung
            </button>
          )}
        </div>
      </div>

      {/* Authorizations Table */}
      <div className="bg-white border border-[#c6c6c6] rounded-sm overflow-hidden">
        {filteredAuthorizations.length === 0 ? (
          <div className="text-center py-12 text-[#525252] text-sm">
            {searchInput ? 'Keine Bewilligungen gefunden' : 'Noch keine Bewilligungen erstellt'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full" role="table">
              <thead className="bg-[#f2f2f2] border-b border-[#c6c6c6]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Beschreibung
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Status
                  </th>
                  {canEdit && (
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[#525252] uppercase tracking-wider">
                      Aktionen
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredAuthorizations.map((auth, index) => (
                  <tr 
                    key={auth.id} 
                    className={`${index !== filteredAuthorizations.length - 1 ? 'border-b border-[#e6e6e6]' : ''} hover:bg-[#f9f9f9] transition-colors`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold text-sm text-[#525252]">{auth.name}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-[#525252] font-mono">{auth.code}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-[#525252]">{auth.description || '-'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded ${
                        auth.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {auth.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => openModal(auth)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white mr-2 focus:outline-none focus:ring-2 focus:ring-[#0076bc] focus:ring-offset-1"
                          aria-label={`Bewilligung ${auth.name} bearbeiten`}
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(auth.id, auth.name)}
                          disabled={deleteLoadingId === auth.id}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#d32f2f] text-[#d32f2f] bg-transparent transition-all hover:bg-[#d32f2f] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#d32f2f] focus:ring-offset-1"
                          aria-label={`Bewilligung ${auth.name} löschen`}
                        >
                          {deleteLoadingId === auth.id ? 'Löscht...' : 'Löschen'}
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
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            className="bg-white rounded-sm border border-[#c6c6c6] max-w-md w-full shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <h2 id="modal-title" className="text-lg font-bold text-[#525252] mb-4">
                {editingAuth ? 'Bewilligung bearbeiten' : 'Neue Bewilligung'}
              </h2>

              {errors.length > 0 && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-sm text-sm" role="alert">
                  <ul className="list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                {/* Name */}
                <div>
                  <label htmlFor="auth-name" className="block font-semibold text-sm mb-1 text-[#525252]">
                    Name *
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                    placeholder="z.B. C521"
                    maxLength={MAX_NAME_LENGTH}
                    aria-required="true"
                    aria-describedby="name-hint"
                  />
                  <span id="name-hint" className="text-xs text-gray-500">
                    {formData.name.length}/{MAX_NAME_LENGTH}
                  </span>
                </div>

                {/* Code */}
                <div>
                  <label htmlFor="auth-code" className="block font-semibold text-sm mb-1 text-[#525252]">
                    Code *
                  </label>
                  <input
                    id="auth-code"
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none font-mono"
                    placeholder="z.B. ATACRD002Q81"
                    maxLength={MAX_CODE_LENGTH}
                    pattern="[A-Z0-9]+"
                    aria-required="true"
                    aria-describedby="code-hint"
                  />
                  <span id="code-hint" className="text-xs text-gray-500">
                    Nur Großbuchstaben und Zahlen • {formData.code.length}/{MAX_CODE_LENGTH}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="auth-description" className="block font-semibold text-sm mb-1 text-[#525252]">
                    Beschreibung (optional)
                  </label>
                  <textarea
                    id="auth-description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm min-h-[60px] focus:border-[#0076bc] focus:outline-none"
                    rows={3}
                    placeholder="z.B. Vereinfachtes Verfahren AT"
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    aria-describedby="description-hint"
                  />
                  <span id="description-hint" className="text-xs text-gray-500">
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>

                {/* Active Checkbox (nur beim Bearbeiten) */}
                {editingAuth && (
                  <div>
                    <label htmlFor="auth-active" className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="auth-active"
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        className="w-4 h-4 rounded border-[#c6c6c6] text-[#0076bc] focus:ring-[#0076bc] cursor-pointer"
                        aria-describedby="active-description"
                      />
                      <span className="text-sm text-[#525252]">Aktiv</span>
                    </label>
                    <span id="active-description" className="text-xs text-gray-500 ml-6">
                      Deaktivierte Bewilligungen können nicht verwendet werden
                    </span>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-[#525252] text-[#525252] bg-transparent transition-all hover:bg-[#525252] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#525252] focus:ring-offset-1"
                    disabled={loading}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0076bc] focus:ring-offset-1"
                    disabled={loading}
                  >
                    {loading ? 'Speichert...' : 'Speichern'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}