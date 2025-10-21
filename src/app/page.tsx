export default function Home() {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🇦🇹 Abfertigungsrechner
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Berechnen Sie Ihre Abfertigung nach österreichischem Recht
          </p>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Willkommen! 🎉
            </h2>
            <p className="text-gray-600">
              Die Anwendung wird geladen...
            </p>
          </div>
        </div>
      </main>
    )
  }