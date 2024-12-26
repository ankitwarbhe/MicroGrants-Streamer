import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplicationById, updateApplication, submitApplication, approveApplication, rejectApplication } from '../../services/applications';
import type { Application } from '../../types';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Calendar, DollarSign, Edit2, Send, PenTool } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatBot } from '../chat/ChatBot';

const STATUS_BADGES = {
  draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  submitted: { color: 'bg-blue-100 text-blue-800', icon: FileText },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
  pending_signature: { color: 'bg-purple-100 text-purple-800', icon: PenTool }
};

export function ApplicationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Application>>({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const { user } = useAuth();

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin';

  useEffect(() => {
    async function fetchApplication() {
      if (!id) return;
      try {
        const data = await getApplicationById(id);
        setApplication(data);
        setEditedData({
          title: data.title,
          description: data.description,
          amount_requested: data.amount_requested,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load application details');
      } finally {
        setLoading(false);
      }
    }

    fetchApplication();
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (application) {
      setEditedData({
        title: application.title,
        description: application.description,
        amount_requested: application.amount_requested,
      });
    }
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedData(prev => ({
      ...prev,
      [name]: name === 'amount_requested' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !application) return;

    setUpdateLoading(true);
    try {
      const updated = await updateApplication(id, editedData);
      setApplication(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update application');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!id || !application) return;

    setUpdateLoading(true);
    try {
      const submitted = await submitApplication(id);
      setApplication(submitted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setUpdateLoading(true);
    try {
      const updated = await approveApplication(id, feedback);
      setApplication(updated);
      setShowFeedbackModal(false);
      setFeedback('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve application');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id || !feedback.trim()) return;
    setUpdateLoading(true);
    try {
      const updated = await rejectApplication(id, feedback);
      setApplication(updated);
      setShowFeedbackModal(false);
      setFeedback('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject application');
    } finally {
      setUpdateLoading(false);
    }
  };

  const openFeedbackModal = (type: 'approve' | 'reject') => {
    setActionType(type);
    setShowFeedbackModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error || 'Application not found'}
      </div>
    );
  }

  const statusBadge = STATUS_BADGES[application.status] || STATUS_BADGES.draft;
  const StatusIcon = statusBadge.icon;
  const isDraft = application.status === 'draft';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <div className="flex items-center gap-4">
          {isDraft && !isEditing && (
            <>
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleSubmitApplication}
                disabled={updateLoading}
                className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit
              </button>
            </>
          )}
          {isAdmin && application?.status === 'submitted' && (
            <div className="flex gap-2">
              <button
                onClick={() => openFeedbackModal('approve')}
                disabled={updateLoading}
                className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </button>
              <button
                onClick={() => openFeedbackModal('reject')}
                disabled={updateLoading}
                className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </button>
            </div>
          )}
          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusBadge.color}`}>
            <StatusIcon className="mr-2 h-5 w-5" />
            {application.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {actionType === 'approve' ? 'Approve Application' : 'Reject Application'}
            </h3>
            <div className="mb-4">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Feedback {actionType === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                id="feedback"
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={actionType === 'approve' ? 'Optional feedback for approval' : 'Required feedback for rejection'}
                required={actionType === 'reject'}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedback('');
                }}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={actionType === 'approve' ? handleApprove : handleReject}
                disabled={actionType === 'reject' && !feedback.trim()}
                className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                } disabled:opacity-50`}
              >
                {updateLoading
                  ? 'Processing...'
                  : actionType === 'approve'
                  ? 'Approve'
                  : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <input
                type="text"
                name="title"
                value={editedData.title}
                onChange={handleChange}
                required
                className="block w-full text-lg font-medium text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1">
                    <textarea
                      name="description"
                      value={editedData.description}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Amount Requested
                  </dt>
                  <dd className="mt-1">
                    <input
                      type="number"
                      name="amount_requested"
                      value={editedData.amount_requested}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </dd>
                </div>

                <div className="sm:col-span-2 flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {updateLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </dl>
            </div>
          </form>
        ) : (
          <>
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {application.title}
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {application.description}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Amount Requested
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    ${application.amount_requested.toLocaleString()}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Submission Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(application.created_at).toLocaleDateString()}
                  </dd>
                </div>

                {application.feedback && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Feedback</dt>
                    <dd className="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md p-4">
                      {application.feedback}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </>
        )}
      </div>

      {user && (
        <ChatBot 
          userId={user.id} 
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
} 