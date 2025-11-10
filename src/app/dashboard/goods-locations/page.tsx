import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'
import GoodsLocationList from './GoodsLocationList'
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

async function getGoodsLocations() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    const response = await fetch(`${baseUrl}/api/goods-locations`, {
      headers: {
        Cookie: `auth-token=${token?.value}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.goodsLocations || []
  } catch (error) {
    console.error('Fehler beim Laden der Warenorte:', error)
    return []
  }
}

export default async function GoodsLocationsPage() {
  const user = await getUser()
  const goodsLocations = await getGoodsLocations()

  const canEdit = user.role === 'admin' || user.role === 'schichtleiter'

  return (
    <>
      {/* Subheader mit Titel */}
      <SubHeader
        title={`Warenort-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <GoodsLocationList
            initialGoodsLocations={goodsLocations}
            canEdit={canEdit}
            userRole={user.role}
          />
        </div>
      </div>
    </>
  )
}
