'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SubHeaderProps {
  title: string;
  userRole: string;
  tenantName: string;
}

export default function SubHeader({ title, userRole, tenantName }: SubHeaderProps) {
  const pathname = usePathname(); // ✅ Direkt hier aufrufen!
  
  const canAccessAdmin = userRole === 'admin' || userRole === 'schichtleiter';

  const managementLinks = [
    { path: '/dashboard/clearances', label: 'NCTS Abgang', icon: 'M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zM332.1 128H256V51.9l76.1 76.1zM48 464V48h160v104c0 13.3 10.7 24 24 24h104v288H48z' },
    { path: '/dashboard/companies', label: 'Firmen', icon: 'M320 336c0 8.84-7.16 16-16 16h-96c-8.84 0-16-7.16-16-16v-48H0v144c0 25.6 22.4 48 48 48h416c25.6 0 48-22.4 48-48V288H320v48zm144-208h-80V80c0-25.6-22.4-48-48-48H176c-25.6 0-48 22.4-48 48v48H48c-25.6 0-48 22.4-48 48v80h512v-80c0-25.6-22.4-48-48-48zm-144 0H192V96h128v32z' },
    { path: '/dashboard/guarantees', label: 'Bürgschaften', icon: 'M280 240H168c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h112c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8zm0 96H168c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8h112c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8zM496 80V48c0-8.84-7.16-16-16-16H32C23.16 32 16 39.16 16 48v32c0 8.84 7.16 16 16 16h16v336c0 17.67 14.33 32 32 32h128v-64c0-17.67 14.33-32 32-32s32 14.33 32 32v64h128c17.67 0 32-14.33 32-32V96h16c8.84 0 16-7.16 16-16zm-176 0H192V56h128v24z' },
    { path: '/dashboard/routes', label: 'Routen', icon: 'M504.971 359.029c9.373 9.373 9.373 24.569 0 33.941l-80 79.984c-15.01 15.01-40.971 4.49-40.971-16.971V416h-58.785a12.004 12.004 0 0 1-8.773-3.812l-70.556-75.596 53.333-57.143L352 336h32v-39.981c0-21.438 25.943-31.998 40.971-16.971l80 79.981zM12 176h84l52.781 56.551 53.333-57.143-70.556-75.596A11.999 11.999 0 0 0 122.785 96H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12zm372 0v39.984c0 21.46 25.961 31.98 40.971 16.971l80-79.984c9.373-9.373 9.373-24.569 0-33.941l-80-79.981C409.943 24.021 384 34.582 384 56.019V96h-58.785a12.004 12.004 0 0 0-8.773 3.812L96 336H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h110.785c3.326 0 6.503-1.381 8.773-3.812L352 176h32z' },
    { path: '/dashboard/goods-locations', label: 'Warenorte', icon: 'M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z' },
    { path: '/dashboard/authorizations', label: 'Bewilligungen', icon: 'M336 0H176c-26.5 0-48 21.5-48 48v92.1C59.4 145 0 198.4 0 267.9c0 38.8 21.9 72.3 54 87.5-24.6 37.1-45 82.3-52.7 128.2-1.3 7.7 5.5 14.4 13.3 14.4h81.7c6.9 0 12.8-5.3 13.4-12.2 5.1-56.8 31.6-105.2 70.3-105.2s65.2 48.4 70.3 105.2c.5 6.9 6.5 12.2 13.4 12.2h81.7c7.8 0 14.6-6.7 13.3-14.4-7.7-45.9-28.1-91.1-52.7-128.2 32.1-15.3 54-48.7 54-87.5 0-69.5-59.4-122.9-128-127.9V48c0-26.5-21.5-48-48-48zm-96 384c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm16-128c-52.9 0-96-43.1-96-96s43.1-96 96-96 96 43.1 96 96-43.1 96-96 96z' },
    { path: '/dashboard/users', label: 'Benutzer', icon: 'M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z' },
  ];

  const isActive = (path: string) => pathname?.startsWith(path) || false;

  if (!canAccessAdmin) {
    return (
      <div className="w-full pb-1 bg-[#f2f2f2]">
        <div className="px-1 flex flex-row flex-nowrap justify-between">
          <h2 className="text-gray-800 text-[1.8rem] font-normal leading-none">
            {title}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-1 bg-[#f2f2f2]">
      <div className="px-1 flex flex-row flex-nowrap justify-between">
        <h2 className="text-gray-800 text-[1.8rem] font-normal leading-none">
          {title}
        </h2>
        
        <div className="flex gap-2">
          {managementLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded border transition-all ${
                isActive(link.path)
                  ? 'bg-[#0076bc] text-white border-[#0076bc] hover:bg-[#005a92] hover:border-[#005a92]'
                  : 'bg-transparent text-[#525252] border-[#525252] hover:bg-[#525252] hover:text-white'
              }`}
              title={link.label}
            >
              <svg className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 512 512">
                <path d={link.icon} />
              </svg>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}