import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserApplications } from '../../services/applications';
import type { Application } from '../../types';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';

const STATUS_BADGES = {
  draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  submitted: { color: 'bg-blue-100 text-blue-800', icon: FileText },
  under_review: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
};

export function ApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchApplications() {
      try {
        const data = await getUserApplications();
        setApplications(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-6">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new application.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {applications.map((application) => {
          const StatusIcon = STATUS_BADGES[application.status].icon;
          return (
            <li key={application.id}>
              <Link
                to={`/applications/${application.id}`}
                className="block hover:bg-gray-50"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {application.title}
                        </p>
                        <div className="mt-1">
                          <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[application.status].color}`}>
                            <StatusIcon className="mr-1 h-4 w-4" />
                            {application.status.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-2 flex items-center">
                      <p className="text-sm text-gray-500 mr-4">
                        ${application.amount_requested.toLocaleString()}
                      </p>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {application.description}
                    </p>
                    <div className="mt-2 text-sm text-gray-500">
                      Submitted {new Date(application.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 