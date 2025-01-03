import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Application, DisbursementStep } from '../../types';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, DollarSign, ChevronLeft, ChevronRight, PenTool, FileSignature, BarChart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CURRENCY_SYMBOLS } from '../../types';
import { AnalyticsModal } from './AnalyticsModal';

const STATUS_BADGES = {
  draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  submitted: { color: 'bg-blue-100 text-blue-800', icon: FileText },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
  pending_signature: { color: 'bg-purple-100 text-purple-800', icon: PenTool },
  signed: { color: 'bg-emerald-100 text-emerald-800', icon: FileSignature }
};

// Add formatAmount helper function
function formatAmount(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;
  return `${symbol}${amount.toLocaleString()}`;
}

// Add this function to get the latest disbursement status
function getLatestDisbursementStatus(steps?: DisbursementStep[]) {
  if (!steps?.length) return null;
  
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  
  if (completedSteps === totalSteps) {
    return 'Completed';
  }
  
  const currentStep = steps.find(step => step.status !== 'completed');
  if (!currentStep) return null;
  
  return `${currentStep.label} (${currentStep.status})`;
}

export function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | Application['status']>('all');
  const { user } = useAuth();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    async function fetchApplications() {
      try {
        // Debug user data
        console.log('Full user object:', user);
        console.log('User metadata:', {
          id: user?.id,
          email: user?.email,
          user_metadata: user?.user_metadata,
          app_metadata: user?.app_metadata
        });

        // Check if user is admin from either metadata location
        const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin';
        if (!isAdmin) {
          setError('Access denied: Admin privileges required');
          return;
        }

        // Modify the fetch query to include pagination
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        // Build the query
        let query = supabase
          .from('applications')
          .select('*', { count: 'exact' });

        // Add status filter if not 'all'
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        // Get total count with filters
        const { count, error: countError } = await query;

        if (countError) throw countError;
        setTotalCount(count || 0);

        // Then fetch paginated data with the same filters
        let dataQuery = supabase
          .from('applications')
          .select('*')
          .order('created_at', { ascending: sortOrder === 'asc' });

        // Add status filter if not 'all'
        if (statusFilter !== 'all') {
          dataQuery = dataQuery.eq('status', statusFilter);
        }

        // Add pagination
        dataQuery = dataQuery.range(from, to);

        const { data, error: applicationsError } = await dataQuery;

        if (applicationsError) {
          console.error('Error details:', applicationsError);
          throw applicationsError;
        }

        console.log('Applications fetched:', data?.length || 0);
        setApplications(data || []);
      } catch (err) {
        console.error('Error fetching applications:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch applications');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchApplications();
    }
  }, [user, currentPage, statusFilter, sortOrder]);

  if (!user) {
    return (
      <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md">
        Please log in to access the dashboard
      </div>
    );
  }

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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Add this pagination controls component
  const PaginationControls = () => {
    // Helper function to generate page numbers array
    const getPageNumbers = () => {
      const pageNumbers = [];
      const maxVisiblePages = 5;
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      // Adjust start if we're near the end
      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      return pageNumbers;
    };

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700 px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}
              </span> of{' '}
              <span className="font-medium">{totalCount}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              
              {/* Page Numbers */}
              {getPageNumbers().map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    pageNum === currentPage
                      ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={() => setIsAnalyticsOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <BarChart className="h-5 w-5 mr-2" />
          View Analytics
        </button>
      </div>

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
            <option value="signed">Signed</option>
          </select>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are currently no {statusFilter !== 'all' ? statusFilter : ''} applications in the system.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Application
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Applicant
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Disbursement Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    <button 
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Date
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </th>
                  <th scope="col" className="relative px-4 py-3 w-16">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => {
                  const statusBadge = STATUS_BADGES[application.status] || STATUS_BADGES.draft;
                  const StatusIcon = statusBadge.icon;
                  const disbursementStatus = getLatestDisbursementStatus(application.disbursement_steps);
                  return (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{application.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-2 max-w-lg">{application.description}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {application.first_name} {application.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.user_email || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {formatAmount(application.amount_requested, application.currency)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                          <StatusIcon className="mr-1 h-4 w-4" />
                          {application.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {disbursementStatus ? (
                          <span className="text-sm text-gray-900 break-words">
                            {disbursementStatus}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 italic">
                            Not started
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(application.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium">
                        <Link
                          to={`/applications/${application.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls />
        </>
      )}

      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />
    </div>
  );
}
