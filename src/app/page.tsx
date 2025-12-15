import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSubdomainFromHost } from '@/lib/tenant';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';

// Firmenlogos basierend auf Subdomain
function getCompanyLogo(subdomain: string) {
  const logos: { [key: string]: string } = {
    'verag': 'https://verag.ag/templates/ut_lawstudio/images/presets/preset1/logo.svg',
    'dsv': 'https://dsv-media-premium.azureedge.net/~/media/corporate/global/logo/dsv-logo-small.svg?iar=0&rev=391728928e824eef9247d3d041620943'
  };
  return logos[subdomain] || null;
}

// Client-Komponente für Login-Formular
function LoginForm({ tenantName, logoUrl }: { tenantName: string; logoUrl: string | null }) {
  return (
    <>
      {/* Header - Dunkelgrau wie TeloWeb mit fester Höhe */}
      <header 
        style={{ 
          backgroundColor: '#393939',
          height: '55px',
          minHeight: '56px',
          maxHeight: '56px'
        }} 
        className="w-full px-8 shadow-md flex items-center"
      >
        <h1 className="text-white text-3xl font-light tracking-wide">MAS Project</h1>
      </header>

      {/* Subheader mit Firmennamen OHNE Logo */}
      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <div className="flex items-end gap-3">
          <h2 className="text-gray-800 text-xl font-normal leading-none">
            Anmelden - {tenantName}
          </h2>
          <span className="text-gray-600 text-sm leading-none mb-0.5">
            MAS Project Webapplikation für Speditionen
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#ffffff' }}>
        <div className="w-full max-w-md">
          {/* Firmenlogo - Groß und zentriert über dem Login-Formular */}
          {logoUrl && (
            <div className="flex justify-center mb-8">
              <img 
                src={logoUrl} 
                alt={tenantName}
                className="object-contain"
                style={{ maxHeight: '80px', maxWidth: '250px' }}
              />
            </div>
          )}

          {/* Login Form */}
          <form id="loginForm" className="space-y-6" noValidate>
            {/* Loginname Field - TeloWeb Style mit Label auf Border */}
            <div>
              <fieldset className="border border-gray-300 rounded px-3 pt-2 pb-3 relative">
                <legend className="text-md font-medium text-gray-900 px-1">Loginname</legend>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  className="w-full px-2 border-0 focus:outline-none focus:ring-0 text-base bg-white text-gray-900"
                  placeholder="Personal ID"
                  autoComplete="username"
                />
              </fieldset>
              <div id="usernameError" className="hidden text-red-600 text-sm mt-1 px-1">
                Loginname muss eingegeben werden
              </div>
            </div>

            {/* Kennwort Field - TeloWeb Style mit Label auf Border */}
            <div>
              <fieldset className="border border-gray-300 rounded px-3 pt-2 pb-3 relative">
                <legend className="text-md font-medium text-gray-900 px-1">Kennwort</legend>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="w-full px-2 border-0 focus:outline-none focus:ring-0 text-base bg-white text-gray-900"
                  placeholder=""
                  autoComplete="current-password"
                />
              </fieldset>
              <div id="passwordError" className="hidden text-red-600 text-sm mt-1 px-1">
                Kennwort muss eingegeben werden
              </div>
            </div>

            {/* Allgemeiner Error */}
            <div id="generalError" className="hidden bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded text-sm"></div>

            {/* Submit Button mit CSS Gradient */}
            <button
              type="submit"
              className="login-button w-full py-3 text-white rounded font-medium text-base transition-all"
            >
              Anmelden
            </button>
          </form>
        </div>
      </div>

      {/* Footer - Wie TeloWeb */}
      <footer 
        style={{ 
          backgroundColor: '#f2f2f2',
          borderTop: '1px solid #c6c6c6'
        }} 
        className="w-full py-4 px-8 text-right"
      >
        <p className="text-gray-600 text-xs">
          1.0.5v © 2025 MAS Project für Speditionen
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        /* Button Gradient Styles */
        .login-button {
          background-image: linear-gradient(#0090e5, #0076bc 60%, #0069a8);
          border: none;
          box-shadow: 0 0 0 0 transparent;
          cursor: pointer;
        }
        
        .login-button:hover {
          background-image: linear-gradient(#0070b2, #005689 60%, #004975);
        }
        
        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        /* Fieldset Error Styles */
        fieldset.error-border {
          border-color: #dc3545 !important;
          border-width: 2px !important;
        }
        
        fieldset.error-border legend {
          color: #dc3545 !important;
        }
        
        /* Focus Styles für Fieldsets */
        fieldset:focus-within {
          border-color: #0076bc;
          box-shadow: 0 0 0 2px rgba(0, 118, 188, 0.1);
        }
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        // Warte bis DOM geladen ist
        document.addEventListener('DOMContentLoaded', function() {
          const form = document.getElementById('loginForm');
          const usernameInput = document.getElementById('username');
          const passwordInput = document.getElementById('password');
          const usernameError = document.getElementById('usernameError');
          const passwordError = document.getElementById('passwordError');
          const generalError = document.getElementById('generalError');
          
          // Check if elements exist
          if (!form || !usernameInput || !passwordInput) {
            console.error('Form elements not found');
            return;
          }
          
          const usernameFieldset = usernameInput.closest('fieldset');
          const passwordFieldset = passwordInput.closest('fieldset');
          
          // Reset error states
          function clearErrors() {
            if (usernameError) usernameError.classList.add('hidden');
            if (passwordError) passwordError.classList.add('hidden');
            if (generalError) generalError.classList.add('hidden');
            if (usernameFieldset) usernameFieldset.classList.remove('error-border');
            if (passwordFieldset) passwordFieldset.classList.remove('error-border');
          }
          
          // Show validation errors
          function validateForm() {
            clearErrors();
            let isValid = true;
            
            if (!usernameInput.value.trim()) {
              if (usernameError) usernameError.classList.remove('hidden');
              if (usernameFieldset) usernameFieldset.classList.add('error-border');
              isValid = false;
            }
            
            if (!passwordInput.value.trim()) {
              if (passwordError) passwordError.classList.remove('hidden');
              if (passwordFieldset) passwordFieldset.classList.add('error-border');
              isValid = false;
            }
            
            return isValid;
          }
          
          // Clear error on input
          usernameInput.addEventListener('input', function() {
            if (usernameInput.value.trim()) {
              if (usernameError) usernameError.classList.add('hidden');
              if (usernameFieldset) usernameFieldset.classList.remove('error-border');
            }
          });
          
          passwordInput.addEventListener('input', function() {
            if (passwordInput.value.trim()) {
              if (passwordError) passwordError.classList.add('hidden');
              if (passwordFieldset) passwordFieldset.classList.remove('error-border');
            }
          });
          
          // Form submit
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!validateForm()) {
              return;
            }
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const username = usernameInput.value;
            const password = passwordInput.value;
            
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.textContent = 'Anmeldung läuft...';
            }
            
            try {
              const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Login fehlgeschlagen');
              }
              
              window.location.href = '/dashboard';
            } catch (err) {
              if (generalError) {
                generalError.textContent = err.message;
                generalError.classList.remove('hidden');
              }
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Anmelden';
              }
            }
          });
        });
      `}} />
    </>
  );
}

export default async function Home() {
  // Cookie-Check mit Validierung
  const token = cookies().get('auth-token');
  if (token) {
    try {
      const getSecret = () => getJwtSecret();
      await jwtVerify(token.value, getSecret());
      redirect('/dashboard');
    } catch (error) {
      // Token ungültig - ignorieren und Login-Seite anzeigen
      // Cookie wird beim nächsten erfolgreichen Login überschrieben
    }
  }

  // Subdomain aus Header holen
  const headersList = headers();
  // Cloudflare/Proxy Support: X-Forwarded-Host bevorzugen
  const forwardedHost = headersList.get('x-forwarded-host');
  const hostHeader = headersList.get('host');
  const host = forwardedHost?.split(',')[0] || hostHeader || '';
  
  const subdomain = getSubdomainFromHost(host);
  
  if (subdomain) {
    // Prüfe ob Tenant existiert
    const tenant = await prisma.tenant.findUnique({
      where: { domain: subdomain },
      select: { id: true, name: true, domain: true }
    });
    
    if (!tenant) {
      // Tenant existiert nicht!
      return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
          <header 
            style={{ 
              backgroundColor: '#393939',
              height: '55px',
              minHeight: '56px',
              maxHeight: '56px'
            }} 
            className="w-full px-8 shadow-md flex items-center"
          >
            <h1 className="text-white text-3xl font-light tracking-wide">MAS Project</h1>
          </header>
          
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Firma nicht gefunden
              </h2>
              <p className="text-gray-600 mb-4">
                Die Subdomain <strong>{subdomain}</strong> ist nicht registriert.
              </p>
              <p className="text-sm text-gray-500">
                Bitte überprüfen Sie die URL oder kontaktieren Sie den Administrator.
              </p>
            </div>
          </div>

          <footer 
            style={{ 
              backgroundColor: '#f2f2f2',
              borderTop: '1px solid #c6c6c6'
            }} 
            className="w-full py-4 px-8 text-right"
          >
            <p className="text-gray-600 text-xs">
              1.0.5v © 2025 MAS Project für Speditionen
            </p>
          </footer>
        </div>
      );
    }

    // Logo für die Firma holen
    const logoUrl = getCompanyLogo(subdomain);

    // Tenant existiert - zeige Login mit Firmenname und Logo
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
        <LoginForm tenantName={tenant.name} logoUrl={logoUrl} />
      </div>
    );
  }

  // Hauptdomain (localhost:3000) - Landing Page
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
      <header 
        style={{ 
          backgroundColor: '#393939',
          height: '55px',
          minHeight: '56px',
          maxHeight: '56px'
        }} 
        className="w-full px-8 shadow-md flex items-center"
      >
        <h1 className="text-white text-3xl font-light tracking-wide">MAS Project</h1>
      </header>

      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <div className="flex items-end gap-3">
          <h2 className="text-gray-800 text-xl font-normal leading-none">
            MAS Project für Speditionen
          </h2>
          <span className="text-gray-600 text-sm leading-none mb-0.5">
            Professionelles Zollabfertigungsmanagement
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-6 text-center">
            <h3 className="font-semibold text-gray-900 mb-3 text-lg">Für Mitarbeiter:</h3>
            <p className="text-gray-600 text-sm mb-4">
              Bitte verwenden Sie die Subdomain Ihrer Firma:
            </p>
            <div className="space-y-2">
              <p className="text-blue-600 font-mono text-sm">
                verag.localhost:3000
              </p>
              <p className="text-blue-600 font-mono text-sm">
                dsv.localhost:3000
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer 
        style={{ 
          backgroundColor: '#f2f2f2',
          borderTop: '1px solid #c6c6c6'
        }} 
        className="w-full py-4 px-8 text-right"
      >
        <p className="text-gray-600 text-xs">
          1.0.5v © 2025 MAS Project für Speditionen
        </p>
      </footer>
    </div>
  );
}
