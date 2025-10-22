import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { pool } from '@/lib/db'  // ✅ GEÄNDERT!
import LoginForm from '@/components/LoginForm'

async function getTenantBySubdomain(subdomain: string) {
  try {
    const result = await pool.query(
      `SELECT id, name, domain FROM "Tenant" WHERE domain = $1`,
      [subdomain]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('Tenant lookup error:', error)
    return null
  }
}

export default async function Home() {
  // Cookie-Check
  const token = cookies().get('auth-token')
  if (token) {
    redirect('/dashboard')
  }

  // Subdomain aus Header holen
  const headersList = await import('next/headers').then(m => m.headers())
  const hostname = headersList.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // Prüfe ob es eine Subdomain ist (nicht localhost oder www)
  const isSubdomain = hostname.includes('.') && subdomain !== 'localhost' && subdomain !== 'www'
  
  if (isSubdomain) {
    // Prüfe ob Tenant existiert
    const tenant = await getTenantBySubdomain(subdomain)
    
    if (!tenant) {
      // Tenant existiert nicht!
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Firma nicht gefunden
            </h1>
            <p className="text-gray-600 mb-6">
              Die Subdomain <strong>{subdomain}</strong> ist nicht registriert.
            </p>
            <p className="text-sm text-gray-500">
              Bitte überprüfen Sie die URL oder kontaktieren Sie den Administrator.
            </p>
          </div>
        </div>
      )
    }

    // Tenant existiert - zeige Login mit Firmenname
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {tenant.name}
            </h2>
            <p className="text-gray-600 text-sm">Mitarbeiter-Portal</p>
          </div>
          <LoginForm />
        </div>
      </div>
    )
  }

  // Hauptdomain (localhost:3000) - Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🚚 Abfertigungs-Portal
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Professionelles Abfertigungsmanagement für Speditionen
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Für Mitarbeiter:</h3>
          <p className="text-gray-600 text-sm">
            Bitte verwenden Sie die Subdomain Ihrer Firma:
          </p>
          <p className="text-blue-600 font-mono text-sm mt-2">
            ihre-firma.localhost:3000
          </p>
        </div>
      </div>
    </div>
  )
}