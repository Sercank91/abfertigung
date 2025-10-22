import Calculator from '@/components/Calculator'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🇦🇹 Abfertigungsrechner
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Berechnen Sie Ihre Abfertigung nach österreichischem Recht
        </p>
        
        <Calculator />
      </div>
    </main>
  )
}