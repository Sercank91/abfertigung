'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface User {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  initialUsers: User[];
  canEdit: boolean;
  userRole: string;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}

// Constants
const DEBOUNCE_DELAY = 300;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 100;
const MAX_PHONE_LENGTH = 20;

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

// Validation functions
const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return !email || re.test(email);
};

const validatePhone = (phone: string): boolean => {
  const re = /^[\d\s\-+()]+$/;
  return !phone || re.test(phone);
};

const validateUsername = (username: string): boolean => {
  const re = /^[a-zA-Z0-9._-]+$/;
  return re.test(username);
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

const validateForm = (data: FormData, isEdit: boolean): string[] => {
  const errors: string[] = [];
  
  // Username validation
  if (!isEdit) {
    if (data.username.length < MIN_USERNAME_LENGTH) {
      errors.push(`Benutzername muss mindestens ${MIN_USERNAME_LENGTH} Zeichen haben`);
    }
    if (data.username.length > MAX_USERNAME_LENGTH) {
      errors.push(`Benutzername darf maximal ${MAX_USERNAME_LENGTH} Zeichen haben`);
    }
    if (!validateUsername(data.username)) {
      errors.push('Benutzername darf nur Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich enthalten');
    }
  }
  
  // Password validation
  if (!isEdit && data.password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben`);
  }
  
  // Name validation
  if (!data.firstName.trim() || !data.lastName.trim()) {
    errors.push('Vor- und Nachname sind erforderlich');
  }
  if (data.firstName.length > MAX_NAME_LENGTH || data.lastName.length > MAX_NAME_LENGTH) {
    errors.push(`Name darf maximal ${MAX_NAME_LENGTH} Zeichen haben`);
  }
  
  // Email validation
  if (data.email && !validateEmail(data.email)) {
    errors.push('Ungültige E-Mail-Adresse');
  }
  if (data.email.length > MAX_EMAIL_LENGTH) {
    errors.push(`E-Mail darf maximal ${MAX_EMAIL_LENGTH} Zeichen haben`);
  }
  
  // Phone validation
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Ungültige Telefonnummer');
  }
  
  return errors;
};

// Role configuration
const ROLES = [
  {
    value: 'mitarbeiter',
    label: '👤 Mitarbeiter',
    description: 'Standard-Benutzer',
    color: 'gray',
    borderColor: '#525252',
    bgColor: '#f9f9f9',
    hoverBg: '#f9f9f9',
    badgeClass: 'bg-gray-100 text-gray-800'
  },
  {
    value: 'schichtleiter',
    label: '👔 Schichtleiter',
    description: 'Kann Benutzer, Firmen und Bürgschaften verwalten',
    color: 'blue',
    borderColor: '#0076bc',
    bgColor: 'rgb(239 246 255)',
    hoverBg: 'rgb(239 246 255)',
    badgeClass: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'admin',
    label: '👑 Admin',
    description: 'Volle Berechtigung',
    color: 'red',
    borderColor: '#d32f2f',
    bgColor: 'rgb(254 242 242)',
    hoverBg: 'rgb(254 242 242)',
    badgeClass: 'bg-red-100 text-red-800'
  }
];

export default function UserList({ initialUsers, canEdit, userRole }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchInput, setSearchInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'mitarbeiter',
  });

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchInput, DEBOUNCE_DELAY);

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    if (!debouncedSearchTerm) return users;
    
    const sanitizedTerm = sanitizeInput(debouncedSearchTerm).toLowerCase();
    return users.filter((u) =>
      u.username.toLowerCase().includes(sanitizedTerm) ||
      u.firstName.toLowerCase().includes(sanitizedTerm) ||
      u.lastName.toLowerCase().includes(sanitizedTerm) ||
      (u.email && u.email.toLowerCase().includes(sanitizedTerm))
    );
  }, [users, debouncedSearchTerm]);

  // Get role config
  const getRoleConfig = useCallback((role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[0];
  }, []);

  // Modal handlers
  const openModal = useCallback((user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email || '',
        password: '',
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'mitarbeiter',
      });
    }
    setErrors([]);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingUser(null);
    setErrors([]);
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'mitarbeiter',
    });
  }, []);

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    // Validation
    const validationErrors = validateForm(formData, !!editingUser);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    // Sanitize data
    const sanitizedData: FormData = {
      username: sanitizeInput(formData.username),
      email: sanitizeInput(formData.email),
      password: formData.password, // Don't sanitize password
      firstName: sanitizeInput(formData.firstName),
      lastName: sanitizeInput(formData.lastName),
      phone: sanitizeInput(formData.phone),
      role: formData.role,
    };

    try {
      const url = editingUser 
        ? `/api/users/${editingUser.id}`
        : '/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // CSRF protection
        },
        body: JSON.stringify(sanitizedData),
        credentials: 'same-origin'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      // Optimistic update
      if (editingUser) {
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id ? data.user : u
        ));
      } else {
        setUsers(prev => [...prev, data.user]);
      }

      closeModal();
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Netzwerkfehler';
      setErrors([message]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle active status
  const handleToggleActive = useCallback(async (user: User) => {
    const action = user.isActive ? 'deaktivieren' : 'aktivieren';
    if (!confirm(`Möchten Sie ${user.firstName} ${user.lastName} wirklich ${action}?`)) return;

    setActionLoadingId(user.id);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          ...user,
          isActive: !user.isActive,
        }),
        credentials: 'same-origin'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Ändern des Status');
      }

      // Optimistic update
      setUsers(prev => prev.map(u => 
        u.id === user.id ? data.user : u
      ));
      
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Ändern des Status';
      alert(message);
    } finally {
      setActionLoadingId(null);
    }
  }, [router]);

  // Delete handler
  const handleDelete = useCallback(async (user: User) => {
    if (!confirm(`Möchten Sie ${user.firstName} ${user.lastName} wirklich löschen?`)) return;

    setActionLoadingId(user.id);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      // Optimistic update
      setUsers(prev => prev.filter(u => u.id !== user.id));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Löschen';
      alert(message);
    } finally {
      setActionLoadingId(null);
    }
  }, [router]);

  // Form input handler
  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user types
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [errors.length]);

  return (
    <>
      {/* Search Bar & Add Button */}
      <div className="bg-white mb-4 p-3 border border-[#c6c6c6] rounded-sm">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Benutzer suchen..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm pr-8 bg-white text-gray-900 focus:border-[#0076bc] focus:outline-none"
              maxLength={100}
              aria-label="Benutzer suchen"
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
          <div className="text-xs text-[#525252] whitespace-nowrap" role="status">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'Benutzer' : 'Benutzer'}
          </div>

          {/* Add Button */}
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0076bc] focus:ring-offset-1"
              aria-label="Neuen Benutzer hinzufügen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neuer Benutzer
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#c6c6c6] rounded-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-[#525252] text-sm">
            {searchInput ? 'Keine Benutzer gefunden' : 'Noch keine Benutzer vorhanden'}
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
                    Benutzername
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    E-Mail
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Telefon
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Rolle
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
                {filteredUsers.map((user, index) => {
                  const roleConfig = getRoleConfig(user.role);
                  return (
                    <tr 
                      key={user.id} 
                      className={`${index !== filteredUsers.length - 1 ? 'border-b border-[#e6e6e6]' : ''} hover:bg-[#f9f9f9] transition-colors`}
                    >
                      <td className="px-3 py-2">
                        <div className="font-semibold text-sm text-[#525252]">
                          {user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-[#525252]">{user.username}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-[#525252]">{user.email || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-[#525252]">{user.phone || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded ${roleConfig.badgeClass}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => openModal(user)}
                            className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white mr-1 focus:outline-none focus:ring-2 focus:ring-[#0076bc] focus:ring-offset-1"
                            disabled={actionLoadingId === user.id}
                            aria-label={`${user.firstName} ${user.lastName} bearbeiten`}
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={actionLoadingId === user.id}
                            className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#f59e0b] text-[#f59e0b] bg-transparent transition-all hover:bg-[#f59e0b] hover:text-white mr-1 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#f59e0b] focus:ring-offset-1"
                            aria-label={`${user.firstName} ${user.lastName} ${user.isActive ? 'deaktivieren' : 'aktivieren'}`}
                          >
                            {actionLoadingId === user.id 
                              ? 'Lädt...' 
                              : (user.isActive ? 'Deaktivieren' : 'Aktivieren')}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={actionLoadingId === user.id}
                            className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#d32f2f] text-[#d32f2f] bg-transparent transition-all hover:bg-[#d32f2f] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#d32f2f] focus:ring-offset-1"
                            aria-label={`${user.firstName} ${user.lastName} löschen`}
                          >
                            {actionLoadingId === user.id ? 'Löscht...' : 'Löschen'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            className="bg-white rounded-sm border border-[#c6c6c6] w-full max-w-2xl shadow-lg my-8"
          >
            <div className="p-4 max-h-[85vh] overflow-y-auto">
              <h2 id="modal-title" className="text-lg font-bold text-[#525252] mb-4">
                {editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
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

              <form onSubmit={handleSave} className="space-y-3" noValidate>
                {/* Benutzername */}
                <div>
                  <label htmlFor="user-username" className="block font-semibold text-sm mb-1 text-[#525252]">
                    Benutzername *
                  </label>
                  <input
                    id="user-username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm bg-white text-gray-900 focus:border-[#0076bc] focus:outline-none"
                    placeholder="z.B. jdoe"
                    maxLength={MAX_USERNAME_LENGTH}
                    disabled={!!editingUser}
                    aria-required="true"
                    aria-describedby="username-hint"
                  />
                  {editingUser ? (
                    <p id="username-hint" className="text-xs text-gray-500 mt-1">
                      Benutzername kann nicht geändert werden
                    </p>
                  ) : (
                    <p id="username-hint" className="text-xs text-gray-500 mt-1">
                      {formData.username.length}/{MAX_USERNAME_LENGTH} • Nur Buchstaben, Zahlen, ._-
                    </p>
                  )}
                </div>

                {/* Vorname & Nachname */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="user-firstname" className="block font-semibold text-sm mb-1 text-[#525252]">
                      Vorname *
                    </label>
                    <input
                      id="user-firstname"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm bg-white text-gray-900 focus:border-[#0076bc] focus:outline-none"
                      maxLength={MAX_NAME_LENGTH}
                      aria-required="true"
                    />
                    <span className="text-xs text-gray-500">
                      {formData.firstName.length}/{MAX_NAME_LENGTH}
                    </span>
                  </div>
                  <div>
                    <label htmlFor="user-lastname" className="block font-semibold text-sm mb-1 text-[#525252]">
                      Nachname *
                    </label>
                    <input
                      id="user-lastname"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm bg-white text-gray-900 focus:border-[#0076bc] focus:outline-none"
                      maxLength={MAX_NAME_LENGTH}
                      aria-required="true"
                    />
                    <span className="text-xs text-gray-500">
                      {formData.lastName.length}/{MAX_NAME_LENGTH}
                    </span>
                  </div>
                </div>

                {/* E-Mail & Telefon */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="user-email" className="block font-semibold text-sm mb-1 text-[#525252]">
                      E-Mail (optional)
                    </label>
                    <input
                      id="user-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm bg-white text-gray-900 focus:border-[#0076bc] focus:outline-none"
                      maxLength={MAX_EMAIL_LENGTH}
                      placeholder="name@beispiel.de"
                      aria-describedby="email-hint"
                    />
                    <span id="email-hint" className="text-xs text-gray-500">
                      {formData.email.length}/{MAX_EMAIL_LENGTH}
                    </span>
                  </div>
                  <div>
                    <label htmlFor="user-phone" className="block font-semibold text-sm mb-1 text-[#525252]">
                      Telefon (optional)
                    </label>
                    <input
                      id="user-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm bg-white text-gray-900 focus:border-[#0076bc] focus:outline-none"
                      maxLength={MAX_PHONE_LENGTH}
                      placeholder="+43 123 456789"
                      aria-describedby="phone-hint"
                    />
                    <span id="phone-hint" className="text-xs text-gray-500">
                      {formData.phone.length}/{MAX_PHONE_LENGTH}
                    </span>
                  </div>
                </div>

                {/* Passwort */}
                <div>
                  <label htmlFor="user-password" className="block font-semibold text-sm mb-1 text-[#525252]">
                    Passwort {editingUser ? '(leer lassen um nicht zu ändern)' : '*'}
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm bg-white text-gray-900 focus:border-[#0076bc] focus:outline-none"
                    minLength={MIN_PASSWORD_LENGTH}
                    aria-required={!editingUser}
                    aria-describedby="password-hint"
                  />
                  {!editingUser && (
                    <p id="password-hint" className="text-xs text-gray-500 mt-1">
                      Mindestens {MIN_PASSWORD_LENGTH} Zeichen
                    </p>
                  )}
                </div>

                {/* Rolle */}
                <div>
                  <label className="block font-semibold text-sm mb-2 text-[#525252]">
                    Rolle *
                  </label>
                  <div className="space-y-2" role="radiogroup" aria-required="true">
                    {ROLES.map((role) => (
                      <label 
                        key={role.value}
                        className={`flex items-center p-2 border rounded-sm cursor-pointer transition-all ${
                          formData.role === role.value 
                            ? `border-[${role.borderColor}]` 
                            : 'border-[#c6c6c6] bg-white hover:bg-gray-50'
                        }`}
                        style={formData.role === role.value ? { 
                          borderColor: role.borderColor,
                          backgroundColor: role.bgColor 
                        } : {}}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={formData.role === role.value}
                          onChange={(e) => handleInputChange('role', e.target.value)}
                          className="w-4 h-4 mr-2"
                          aria-label={role.label}
                        />
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${role.badgeClass}`}>
                          {role.label}
                        </span>
                        <span className="ml-auto text-xs text-gray-500">{role.description}</span>
                      </label>
                    ))}
                  </div>
                </div>

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