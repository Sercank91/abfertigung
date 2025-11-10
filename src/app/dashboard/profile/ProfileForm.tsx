'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  tenantId: string
  tenantName: string
  role: string
}

export default function ProfileForm({ user }: { user: User }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // Formular-States
  const [email, setEmail] = useState(user.email || '')
  const [phone, setPhone] = useState(user.phone || '')

  // Passwort-Modal States
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Profil speichern (E-Mail & Telefon)
  const handleSave = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ Profil erfolgreich gespeichert!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('❌ ' + (data.error || 'Fehler beim Speichern'))
      }
    } catch (error) {
      setMessage('❌ Fehler beim Speichern')
    } finally {
      setIsLoading(false)
    }
  }

  // Passwort ändern
  const handlePasswordChange = async () => {
    setPasswordError('')

    // Validierung
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Bitte alle Felder ausfüllen')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Die neuen Passwörter stimmen nicht überein')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Das neue Passwort muss mindestens 6 Zeichen lang sein')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ Passwort erfolgreich geändert!')
        setShowPasswordModal(false)
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setPasswordError(data.error || 'Fehler beim Ändern des Passworts')
      }
    } catch (error) {
      setPasswordError('Fehler beim Ändern des Passworts')
    } finally {
      setIsLoading(false)
    }
  }

  // Seite neu laden
  const handleReload = () => {
    router.refresh()
    setEmail(user.email || '')
    setPhone(user.phone || '')
    setMessage('✅ Daten neu geladen')
    setTimeout(() => setMessage(''), 2000)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        {/* Header mit Buttons */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Profil bearbeiten</h3>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512">
                <path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z" />
              </svg>
              Speichern
            </button>

            <button
              onClick={handleReload}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 512 512">
                <path d="M449.9 39.96l-48.5 48.53C362.5 53.19 311.4 32 256 32C161.5 32 78.59 92.34 49.58 182.2c-5.438 16.81 3.797 34.88 20.61 40.28c16.89 5.5 34.88-3.812 40.3-20.59C130.9 138.5 189.4 96 256 96c37.96 0 73 14.18 100.2 37.8L311.1 178C295.1 194.8 306.8 223.4 330.4 224h146.9C487.7 223.7 496 215.3 496 204.9V59.04C496 34.99 466.9 22.95 449.9 39.96zM441.8 289.6c-16.94-5.438-34.88 3.812-40.3 20.59C381.1 373.5 322.6 416 256 416c-37.96 0-73-14.18-100.2-37.8L200 334C216.9 317.2 205.2 288.6 181.6 288H34.66C24.32 288.3 16 296.7 16 307.1v145.9c0 24.04 29.07 36.08 46.07 19.07l48.5-48.53C149.5 458.8 200.6 480 255.1 480c94.45 0 177.4-60.34 206.4-150.2C467.9 313 458.6 294.1 441.8 289.6z" />
              </svg>
              Neu laden
            </button>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3 rounded ${message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
          >
            {message}
          </div>
        )}

        {/* Formular */}
        <div className="p-6 space-y-4">
          {/* Benutzername - Disabled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Benutzername</label>
            <input
              type="text"
              value={user.username}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Vorname - Disabled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vorname</label>
            <input
              type="text"
              value={user.firstName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Nachname - Disabled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nachname</label>
            <input
              type="text"
              value={user.lastName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Kennwort - Button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kennwort</label>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Kennwort ändern
            </button>
          </div>

          {/* E-Mail - Editierbar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail Adresse</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="beispiel@email.com"
            />
          </div>

          {/* Telefonnummer - Editierbar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefonnummer</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+43 123 456789"
            />
          </div>
        </div>
      </div>

      {/* Passwort-Änderung Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Kennwort ändern</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setOldPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError('')
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-100 text-red-800 rounded">{passwordError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altes Kennwort
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Aktuelles Kennwort eingeben"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Neues Kennwort
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Neues Kennwort eingeben"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Neues Kennwort bestätigen
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Neues Kennwort erneut eingeben"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setOldPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError('')
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Abbrechen
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Kennwort ändern
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
