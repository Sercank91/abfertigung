import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import Link from 'next/link';

// Sichere Secret-Behandlung
const getSecret = () => getJwtSecret();

interface UserPayload {
  userId?: string;
  tenantId?: string;
  tenantName?: string;
  username?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

async function getUser(): Promise<UserPayload> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token');
  
  if (!token?.value) {
    redirect('/');
  }
  
  try {
    const { payload } = await jwtVerify(token.value, getSecret());
    return payload as UserPayload;
  } catch (error) {
    console.error('Auth error:', error);
    redirect('/');
  }
}

// Dashboard Cards Daten
const QUICK_ACCESS_CARDS = [
  {
    href: '/dashboard/clearances/new',
    title: 'Neue Abfertigung',
    icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'
  },
  {
    href: '/dashboard/clearances',
    title: 'NCTS Abgang',
    icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'
  }
];

const ADMIN_CARDS = [
  {
    href: '/dashboard/users',
    title: 'Benutzer-Verwaltung',
    icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'
  },
  {
    href: '/dashboard/guarantees',
    title: 'Bürgschaft-Verwaltung',
    icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z'
  },
  {
    href: '/dashboard/companies',
    title: 'Firmen-Verwaltung',
    icon: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z'
  },
  {
    href: '/dashboard/routes',
    title: 'Routen-Verwaltung',
    icon: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z'
  },
  {
    href: '/dashboard/goods-locations',
    title: 'Warenort-Verwaltung',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'
  },
  {
    href: '/dashboard/authorizations',
    title: 'Bewilligungs-Verwaltung',
    icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
  }
];

export default async function DashboardPage() {
  const user = await getUser();
  const isAdminOrShiftLeader = user.role === 'admin' || user.role === 'schichtleiter';
  
  return (
    <>
      {/* Subheader mit Titel */}
      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <h2 className="text-gray-800 text-xl font-normal leading-none">
          Startseite - {user.tenantName || 'System'}
        </h2>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {QUICK_ACCESS_CARDS.map((card) => (
              <Link key={card.href} href={card.href} className="dashboard-card">
                <div className="flex items-center gap-4">
                  <div className="card-icon">
                    <svg className="w-8 h-8" width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
                      <path d={card.icon}/>
                    </svg>
                  </div>
                  <div className="card-title">{card.title}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Admin & Schichtleiter Cards */}
          {isAdminOrShiftLeader && (
            <>
              {/* Trennlinie */}
              <div className="separator-line mb-6"></div>

              {/* Verwaltungs-Reihe */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {ADMIN_CARDS.map((card) => (
                  <Link key={card.href} href={card.href} className="dashboard-card">
                    <div className="flex items-center gap-4">
                      <div className="card-icon">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d={card.icon}/>
                        </svg>
                      </div>
                      <div className="card-title">{card.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Styles für Dashboard Cards */}
      <style dangerouslySetInnerHTML={{__html: `
        .separator-line {
          width: 100%;
          height: 1px;
          background-color: #e5e7eb;
          margin: 1.5rem 0;
        }
        
        .dashboard-card {
          display: flex;
          align-items: center;
          padding: 1.5rem 1rem;
          background-color: #fff;
          border: 1px solid #c6c6c6;
          border-radius: 0.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          text-decoration: none;
          color: #1f2937;
        }
        
        .dashboard-card:hover {
          background-image: linear-gradient(#0090e5, #0076bc 60%, #0069a8);
          color: #fff;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(0, 118, 188, 0.3);
          transform: translateY(-2px);
        }
        
        .card-icon {
          color: #0076bc;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        
        .dashboard-card:hover .card-icon {
          color: #fff;
        }
        
        .card-title {
          font-size: 1rem;
          font-weight: 500;
        }
      `}} />
    </>
  );
}