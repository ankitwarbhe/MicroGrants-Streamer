import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApplicationsList } from '../components/applications/ApplicationsList';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { PlusCircle } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.user_metadata.role === 'admin';

  return (
    <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? 'Admin Dashboard' : 'My Applications'}
        </h1>
        {!isAdmin && (
          <Link
            to="/applications/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            New Application
          </Link>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {isAdmin ? <AdminDashboard /> : <ApplicationsList />}
      </div>
    </div>
  );
}