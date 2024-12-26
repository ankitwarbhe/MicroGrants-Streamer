import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserApplications } from '../../services/applications';
import type { Application } from '../../types';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, ChevronLeft, PenTool } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatBot } from '../chat/ChatBot';

const STATUS_BADGES = {
  draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  submitted: { color: 'bg-blue-100 text-blue-800', icon: FileText },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
  pending_signature: { color: 'bg-purple-100 text-purple-800', icon: PenTool }
};

const PAGE_SIZE = 5;

export function ApplicationsList() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | Application['status']>('all');

  useEffect(() => {
    async function fetchApplications() {
      try {
        const response = await getUserApplications(currentPage, PAGE_SIZE, statusFilter);
        setApplications(response.data);
        setTotalCount(response.count);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [currentPage, statusFilter]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <div className="relative inline-block text-left">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setCurrentPage(1); // Reset to first page when filter changes
            }}
            className="block w-48 rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">All Applications</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="pending_signature">Pending Signature</option>
          </select>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter === 'all' 
              ? 'Get started by creating a new application.'
              : `No ${statusFilter} applications found.`}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden bg-white shadow sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {applications.map((application) => {
                const statusBadge = STATUS_BADGES[application.status] || STATUS_BADGES.draft;
                const StatusIcon = statusBadge.icon;
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
                                <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.color}`}>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((currentPage - 1) * PAGE_SIZE) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, totalCount)}</span> of{' '}
                    <span className="font-medium">{totalCount}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          page === currentPage
                            ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {user && (
        <ChatBot 
          userId={user.id} 
          isAdmin={false}
        />
      )}
    </div>
  );
} 