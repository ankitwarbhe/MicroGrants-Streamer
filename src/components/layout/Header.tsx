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

          {user && (
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
              </nav>
              <ProfileMenu />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}