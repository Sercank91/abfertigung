import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'
import CompanyList from './CompanyList'
import SubHeader from '@/components/SubHeader'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

async function getUser() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')
  if (!token) redirect('/')

  try {
    const { payload } = await jwtVerify(token.value, SECRET)
    return payload as any
  } catch (error) {
    redirect('/')
  }
}

async function getCompanies() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    const response = await fetch(`${baseUrl}/api/companies`, {
      headers: {
        Cookie: `auth-token=${token?.value}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return Array.isArray(data.companies) ? data.companies : Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Fehler beim Laden der Firmen:', error)
    return []
  }
}

async function getGuarantees() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    const response = await fetch(`${baseUrl}/api/guarantees`, {
      headers: {
        Cookie: `auth-token=${token?.value}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return Array.isArray(data.guarantees) ? data.guarantees : Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Fehler beim Laden der Bürgschaften:', error)
    return []
  }
}

export default async function CompaniesPage() {
  const user = await getUser()
  const companies = await getCompanies()
  const guarantees = await getGuarantees()

  const canEdit = user.role === 'admin' || user.role === 'schichtleiter'

  return (
    <>
      {/* Subheader mit Titel */}
      <SubHeader
        title={`Firmen-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <CompanyList
            initialCompanies={companies}
            availableGuarantees={guarantees}
            canEdit={canEdit}
            userRole={user.role}
          />
        </div>
      </div>
    </>
  )
}
