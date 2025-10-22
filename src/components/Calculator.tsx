'use client'

import { useState } from 'react'

export default function Calculator() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthlyGross, setMonthlyGross] = useState('')
  const [result, setResult] = useState<number | null>(null)

  const calculateAbfertigung = () => {
    if (!startDate || !endDate || !monthlyGross) return

    const start = new Date(startDate)
    const end = new Date(endDate)
    const gross = parseFloat(monthlyGross)

    // Berechne Jahre
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

    // Abfertigung alt (vor 2003)
    // 2 Monatsbezüge nach 3 Jahren
    // + 1 Monatsbezug pro weiteren 5 Jahre
    let abfertigung = 0

    if (years >= 3) {
      abfertigung = gross * 2 // Grundbetrag nach 3 Jahren
      
      const additionalYears = years - 3
      const additionalPayments = Math.floor(additionalYears / 5)
      abfertigung += additionalPayments * gross
    }

    setResult(abfertigung)
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        📊 Abfertigungsrechner
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dienstbeginn
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dienstende
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monatliches Bruttogehalt (€)
          </label>
          <input
            type="number"
            value={monthlyGross}
            onChange={(e) => setMonthlyGross(e.target.value)}
            placeholder="z.B. 3500"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={calculateAbfertigung}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-lg"
        >
          Berechnen
        </button>

        {result !== null && (
          <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Geschätzte Abfertigung:</p>
            <p className="text-4xl font-bold text-green-600">
              € {result.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              * Berechnung nach Abfertigungssystem alt (vor 2003)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}