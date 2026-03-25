import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, UserPlus, UserMinus, Edit2 } from 'lucide-react';

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    // Note: Assuming a 'users' or 'employees' table exists in Supabase
    // If using Supabase Auth, custom profiles table is normally used
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.warn('Error fetching employees. Table might not exist.', error);
      setEmployees([]);
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-xl flex flex-col justify-between hidden md:flex min-h-screen">
        <div>
          <div className="h-16 flex items-center px-8 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">LeaveGo Admin</h1>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => navigate('/admin/dashboard')} className="w-full flex items-center text-gray-600 hover:bg-gray-50 px-4 py-3 rounded-lg font-medium transition-colors">
              Dashboard
            </button>
            <button className="w-full flex items-center bg-blue-50 text-blue-700 px-4 py-3 rounded-lg font-medium transition-colors">
              Employees
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/admin/dashboard')} className="md:hidden p-2 bg-white rounded-full shadow-sm text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-3xl font-bold text-gray-900">Manage Employees</h2>
          </div>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
            <UserPlus className="w-4 h-4 mr-2" /> Add Employee
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
             {employees.length === 0 ? (
               <div className="p-12 text-center text-gray-500">
                 No employees found. Please ensure the 'users' table exists.
               </div>
             ) : (
               <ul className="divide-y divide-gray-200">
                 {employees.map((emp) => (
                   <li key={emp.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition">
                     <div>
                       <p className="font-semibold text-gray-900">{emp.name || 'Unnamed Employee'}</p>
                       <p className="text-sm text-gray-500">{emp.email}</p>
                     </div>
                     <div className="flex space-x-3">
                       <button className="text-blue-600 hover:text-blue-800 p-2"><Edit2 className="w-5 h-5"/></button>
                       <button className="text-red-600 hover:text-red-800 p-2"><UserMinus className="w-5 h-5"/></button>
                     </div>
                   </li>
                 ))}
               </ul>
             )}
          </div>
        )}
      </main>
    </div>
  );
}
