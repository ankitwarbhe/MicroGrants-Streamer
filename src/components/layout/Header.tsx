import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircleDollarSign } from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <CircleDollarSign className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">MicroGrants</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <nav className="flex items-center gap-4">
                  <Link
                    to="/dashboard"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                </nav>
                <ProfileMenu />
              </>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}