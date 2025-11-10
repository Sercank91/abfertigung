'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  startDate: string;
  endDate: string | null;
  monthlyGross: number;
  createdAt: string;
  updatedAt: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    startDate: '',
    endDate: '',
    monthlyGross: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Fehler beim Laden der Mitarbeiter');
      }

      const data = await response.json();
      setEmployees(data.employees);
    } catch (err) {
      setError('Fehler beim Laden der Mitarbeiter');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      startDate: '',
      endDate: '',
      monthlyGross: ''
    });
    setEditingEmployee(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      startDate: employee.startDate ? employee.startDate.split('T')[0] : '',
      endDate: employee.endDate ? employee.endDate.split('T')[0] : '',
      monthlyGross: employee.monthlyGross.toString()
    });
    setEditingEmployee(employee);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = editingEmployee
        ? `/api/employees/${editingEmployee.id}`
        : '/api/employees';
      
      const method = editingEmployee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      setSuccess(
        editingEmployee
          ? 'Mitarbeiter erfolgreich aktualisiert'
          : 'Mitarbeiter erfolgreich angelegt'
      );
      
      resetForm();
      fetchEmployees();

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Möchten Sie ${name} wirklich löschen?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      setSuccess(data.message);
      fetchEmployees();

    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Mitarbeiter...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Mitarbeiter-Verwaltung
              </h1>
              <p className="text-gray-600 mt-1">
                {employees.length} Mitarbeiter gesamt
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Neuer Mitarbeiter
            </button>
          </div>
        </div>

        {/* Erfolgsmeldung */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Fehler */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Formular Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                {editingEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vorname *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nachname *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Startdatum *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enddatum (optional)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monatsgehalt (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monthlyGross}
                    onChange={(e) => setFormData({ ...formData, monthlyGross: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {editingEmployee ? 'Aktualisieren' : 'Anlegen'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mitarbeiter-Liste */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Startdatum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enddatum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monatsgehalt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Noch keine Mitarbeiter angelegt
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(employee.startDate).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.endDate
                        ? new Date(employee.endDate).toLocaleDateString('de-DE')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(employee.monthlyGross)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(
                            employee.id,
                            `${employee.firstName} ${employee.lastName}`
                          )
                        }
                        className="text-red-600 hover:text-red-900"
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}