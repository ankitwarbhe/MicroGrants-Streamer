import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplicationById, updateApplication, submitApplication, approveApplication, rejectApplication, withdrawApplication } from '../../services/applications';
import { docuSignService } from '../../services/docusign.ts';
import type { Application, Currency } from '../../types';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Calendar, DollarSign, Edit2, Send, PenTool, FileSignature, Download, Undo, Eye, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatBot } from '../chat/ChatBot';
import { CURRENCY_SYMBOLS } from '../../types';
import { DisbursementTracker } from '../disbursement/DisbursementTracker';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_BADGES = {
  draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  submitted: { color: 'bg-blue-100 text-blue-800', icon: FileText },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
  pending_signature: { color: 'bg-purple-100 text-purple-800', icon: PenTool },
  signed: { color: 'bg-emerald-100 text-emerald-800', icon: FileSignature }
};

interface EditedData {
  title: string;
  description: string;
  amount_requested: number;
  first_name: string;
  last_name: string;
  currency: Currency;
}

interface PaymentDetails {
  beneficiary_name: string;
  bank_branch: string;
  ifsc_code: string;
  account_type: string;
  account_number: string;
  upi_id: string;
}

function formatAmount(amount: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;
  return `${symbol}${amount.toLocaleString()}`;
}

export function ApplicationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<EditedData>({
    title: '',
    description: '',
    amount_requested: 0,
    first_name: '',
    last_name: '',
    currency: 'USD'
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const { user } = useAuth();
  const [signedDocument, setSignedDocument] = useState<string | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    beneficiary_name: '',
    bank_branch: '',
    ifsc_code: '',
    account_type: '',
    account_number: '',
    upi_id: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [upiError, setUpiError] = useState<string>('');
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showUpiQR, setShowUpiQR] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>('');

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin';
  const isOwner = application?.user_id === user?.id;

  const fetchApplication = async () => {
    if (!id) return;
    try {
      const data = await getApplicationById(id);
      setApplication(data);
      setEditedData({
        title: data.title,
        description: data.description,
        amount_requested: data.amount_requested,
        first_name: data.first_name,
        last_name: data.last_name,
        currency: data.currency
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchApplication();
    }
  }, [id]);

  useEffect(() => {
    if (application) {
      setEditedData({
        title: application.title,
        description: application.description,
        amount_requested: application.amount_requested,
        first_name: application.first_name,
        last_name: application.last_name,
        currency: application.currency
      });
    }
  }, [application]);

  useEffect(() => {
    if (application?.payment_completed) {
      setPaymentCompleted(true);
    }
  }, [application?.payment_completed]);

  useEffect(() => {
    if (id) {
      fetchApplication();
    }
  }, [id]);

  useEffect(() => {
    // Fetch document content when application is loaded and has an envelope ID
    if (application?.envelope_id) {
      const fetchDocContent = async () => {
        try {
          if (!application.envelope_id) return;
          const documentBase64 = await docuSignService.getSignedDocument(application.envelope_id);
          
          if (!documentBase64) {
            console.warn('No document content received');
            setDocumentContent('');
            return;
          }

          // Create PDF data URL
          const pdfDataUrl = `data:application/pdf;base64,${documentBase64}`;
          console.log('📄 PDF data URL created for chatbot:', {
            dataUrlLength: pdfDataUrl.length,
            preview: pdfDataUrl.substring(0, 100) + '...'
          });
          
          setDocumentContent(pdfDataUrl);
        } catch (err) {
          console.error('Error fetching document content:', err);
          setDocumentContent('');
        }
      };
      fetchDocContent();
    }
  }, [application?.envelope_id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (application) {
      setEditedData({
        title: application.title,
        description: application.description,
        amount_requested: application.amount_requested,
        first_name: application.first_name,
        last_name: application.last_name,
        currency: application.currency
      });
    }
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handleSendForSignature = async () => {
    if (!id || !application || !user) return;
    setUpdateLoading(true);
    try {
      // Log the application data for debugging
      console.log('Application data:', application);

      // Create template roles for both signers
      const templateRoles = [
        // Applicant (Signer 1)
        {
          email: application.user_email || '',
          name: `${application.first_name} ${application.last_name}`,
          roleName: 'Signer 1',
          routingOrder: 1,
          tabs: {
            textTabs: [
              {
                tabLabel: 'Project_Title',
                value: application.title
              },
              {
                tabLabel: 'Project_Description',
                value: application.description
              },
              {
                tabLabel: 'Amount_Requested',
                value: formatAmount(application.amount_requested, application.currency)
              },
              {
                tabLabel: 'Submission_Date',
                value: new Date(application.created_at).toLocaleDateString()
              }
            ]
          }
        },
        // Admin (Signer 2)
        {
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email || '',
          roleName: 'Admin',
          routingOrder: 2
        }
      ];

      // Log the template roles for debugging
      console.log('Template roles:', templateRoles);

      // Send for signature using DocuSign template
      await docuSignService.sendDocumentForSignature({
        signerEmail: application.user_email || '',
        signerName: `${application.first_name} ${application.last_name}`,
        documentName: `${application.title} - Grant Agreement`,
        applicationId: id,
        templateId: import.meta.env.VITE_DOCUSIGN_TEMPLATE_ID,
        templateRoles: templateRoles
      });

      // Update application status
      const updated = await updateApplication(id, { status: 'pending_signature' });
      setApplication(updated);
    } catch (err) {
      console.error('DocuSign error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send for signature');
    } finally {
      setUpdateLoading(false);
    }
  };

  const openFeedbackModal = (type: 'approve' | 'reject') => {
    setActionType(type);
    setShowFeedbackModal(true);
  };

  const handleViewDocument = async () => {
    if (!application?.envelope_id) return;
    
    setLoadingDocument(true);
    setDocumentError(null);
    
    try {
      const documentBase64 = await docuSignService.getSignedDocument(application.envelope_id);
      
      if (!documentBase64) {
        throw new Error('No document content received');
      }

      // Clean up base64 string - remove data URL prefix if present
      const base64Clean = documentBase64.replace(/^data:application\/pdf;base64,/, '');
      
      try {
        // Create a Blob with PDF MIME type
        const byteCharacters = atob(base64Clean);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Create URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        console.log('📄 PDF URL created:', {
          base64Length: base64Clean.length,
          blobSize: blob.size,
          url: url
        });
        
        setPdfUrl(url);
        setShowPdfViewer(true);
        setSignedDocument(documentBase64);
      } catch (blobError) {
        console.error('❌ Error creating PDF blob:', blobError);
        
        // Fallback: Try creating blob directly from base64
        try {
          console.log('Attempting fallback PDF creation method...');
          const response = await fetch(`data:application/pdf;base64,${base64Clean}`);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          console.log('📄 PDF URL created (fallback method):', {
            blobSize: blob.size,
            url: url
          });
          
          setPdfUrl(url);
          setShowPdfViewer(true);
          setSignedDocument(documentBase64);
        } catch (fallbackError) {
          console.error('❌ Fallback method failed:', fallbackError);
          throw new Error('Failed to create viewable PDF document');
        }
      }
    } catch (error) {
      console.error('❌ Error loading document:', error);
      setDocumentError(error instanceof Error ? error.message : 'Failed to load PDF document');
    } finally {
      setLoadingDocument(false);
    }
  };

  // Add cleanup for PDF URL
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleWithdraw = async () => {
    if (!id || !application) return;

    setUpdateLoading(true);
    try {
      const withdrawn = await withdrawApplication(id);
      setApplication(withdrawn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw application');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !application) return;

    // Validate UPI ID
    if (!paymentDetails.upi_id.includes('@')) {
      setUpiError('UPI ID must contain @ symbol');
      return;
    }
    setUpiError('');

    // Show confirmation popup instead of submitting directly
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!id || !application) return;
    
    setSubmittingPayment(true);
    try {
      const updated = await updateApplication(id, {
        ...application,
        payment_details: paymentDetails,
        has_submitted_payment_details: true
      });
      setApplication(updated);
      setShowPaymentForm(false);
      setShowConfirmation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment details');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Add this function to generate UPI payment URL
  const generateUpiUrl = () => {
    if (!application?.payment_details) return '';
    
    const pa = application.payment_details.upi_id;
    const pn = application.payment_details.beneficiary_name;
    const am = application.amount_requested;
    
    return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&cu=INR&am=${am}`;
  };

  const handlePaymentComplete = async () => {
    if (!application) return;
    
    try {
      const updated = await updateApplication(application.id, {
        ...application,
        payment_completed: true
      });
      setApplication(updated);
      setPaymentCompleted(true);
      setShowUpiQR(false);
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
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
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-red-50 text-red-700 p-4 rounded-md max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium mb-2">Access Denied</h3>
          <p className="text-sm">
            {error?.includes('Access denied') 
              ? 'You do not have permission to view this application.'
              : error || 'Application not found'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = STATUS_BADGES[application.status] || STATUS_BADGES.draft;
  const StatusIcon = statusBadge.icon;
  const isDraft = application.status === 'draft';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <div className="flex items-center gap-4">
          {isDraft && !isEditing && isOwner && (
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
          {isOwner && application?.status === 'submitted' && (
            <button
              onClick={handleWithdraw}
              disabled={updateLoading}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Undo className="h-4 w-4 mr-2" />
              Withdraw
            </button>
          )}
          {isAdmin && (application?.status === 'submitted' || application?.status === 'pending_signature') && (
            <div className="flex gap-2">
              {application.status === 'submitted' && (
                <button
                  onClick={() => openFeedbackModal('approve')}
                  disabled={updateLoading}
                  className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </button>
              )}
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
          {isAdmin && application?.status === 'approved' && (
            <button
              onClick={handleSendForSignature}
              disabled={updateLoading}
              className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              <PenTool className="h-4 w-4 mr-2" />
              Send for Signature
            </button>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
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
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Currency</dt>
                    <dd className="mt-1">
                      <select
                        name="currency"
                        value={editedData.currency}
                        onChange={handleChange}
                        required
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                          <option key={code} value={code}>
                            {code} ({symbol})
                          </option>
                        ))}
                      </select>
                    </dd>
                  </div>
                </div>

                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">First Name</dt>
                    <dd className="mt-1">
                      <input
                        type="text"
                        name="first_name"
                        value={editedData.first_name}
                        onChange={handleChange}
                        required
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                    <dd className="mt-1">
                      <input
                        type="text"
                        name="last_name"
                        value={editedData.last_name}
                        onChange={handleChange}
                        required
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </dd>
                  </div>
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
              <div className="flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {application.title}
                </h3>
                {(isAdmin && application.status === 'signed' && application.has_submitted_payment_details) && (
                  <button
                    onClick={() => !application.payment_completed && setShowUpiQR(true)}
                    disabled={application.payment_completed}
                    className={`inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md 
                      ${application.payment_completed 
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                        : 'text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'}`}
                  >
                    {application.payment_completed ? 'Paid' : 'Pay Now'}
                  </button>
                )}
              </div>
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
                  <dt className="text-sm font-medium text-gray-500">
                    Amount Requested
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatAmount(application.amount_requested, application.currency)}
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

                <div>
                  <dt className="text-sm font-medium text-gray-500">Applicant Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {application.first_name} {application.last_name}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {application.user_email}
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

                {/* Document and Payment Details Section - Combined in one line */}
                {(isAdmin || application.status === 'signed' || application.has_submitted_payment_details) && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 mb-2">Actions</dt>
                    <dd className="flex items-center space-x-4">
                      {(isAdmin || application.status === 'signed') && application.envelope_id && (
                        <button
                          onClick={handleViewDocument}
                          disabled={loadingDocument}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {loadingDocument ? 'Loading...' : application.status === 'signed' ? 'View Signed Document' : 'View Document'}
                        </button>
                      )}
                      
                      {(isOwner || isAdmin) && application.status === 'signed' && (
                        application.has_submitted_payment_details ? (
                          <button
                            onClick={() => setShowPaymentDetails(true)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Payment Details
                          </button>
                        ) : isOwner ? (
                          <button
                            onClick={() => setShowPaymentForm(true)}
                            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Submit Payment Details
                          </button>
                        ) : (
                          <span className="text-sm text-gray-500 italic">Payment details not submitted yet</span>
                        )
                      )}
                    </dd>
                    {documentError && (
                      <p className="mt-2 text-sm text-red-600">{documentError}</p>
                    )}
                  </div>
                )}

                {/* Disbursement Tracker - Show when payment details are submitted */}
                {application.status === 'signed' && application.has_submitted_payment_details && (
                  <div className="sm:col-span-2 mt-6">
                    <DisbursementTracker
                      applicationId={application.id}
                      steps={application.disbursement_steps || undefined}
                      isAdmin={isAdmin}
                      onUpdate={(steps) => {
                        setApplication(prev => prev ? {
                          ...prev,
                          disbursement_steps: steps
                        } : null);
                      }}
                    />
                  </div>
                )}
              </dl>
            </div>
          </>
        )}
      </div>

      {/* Payment Details Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Payment Details</h3>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="beneficiary_name" className="block text-sm font-medium text-gray-700">
                    Beneficiary Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="beneficiary_name"
                    name="beneficiary_name"
                    required
                    placeholder="Enter full name as per bank account"
                    value={paymentDetails.beneficiary_name}
                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, beneficiary_name: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="bank_branch" className="block text-sm font-medium text-gray-700">
                    Bank Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="bank_branch"
                    name="bank_branch"
                    required
                    placeholder="Enter complete branch name"
                    value={paymentDetails.bank_branch}
                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, bank_branch: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ifsc_code" className="block text-sm font-medium text-gray-700">
                    IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="ifsc_code"
                    name="ifsc_code"
                    required
                    placeholder="11-character IFSC code (e.g., SBIN0001234)"
                    value={paymentDetails.ifsc_code}
                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="account_type" className="block text-sm font-medium text-gray-700">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="account_type"
                    name="account_type"
                    required
                    value={paymentDetails.account_type}
                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, account_type: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select your bank account type</option>
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="account_number" className="block text-sm font-medium text-gray-700">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="account_number"
                    name="account_number"
                    required
                    placeholder="Enter your bank account number"
                    value={paymentDetails.account_number}
                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, account_number: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="upi_id" className="block text-sm font-medium text-gray-700">
                    UPI ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="upi_id"
                    name="upi_id"
                    required
                    placeholder="Enter your UPI ID (e.g., name@bank)"
                    value={paymentDetails.upi_id}
                    onChange={(e) => {
                      setPaymentDetails(prev => ({ ...prev, upi_id: e.target.value }));
                      if (!e.target.value.includes('@') && e.target.value.length > 0) {
                        setUpiError('UPI ID must contain @ symbol');
                      } else {
                        setUpiError('');
                      }
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                      upiError ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {upiError && (
                    <p className="mt-1 text-sm text-red-600">{upiError}</p>
                  )}
                </div>
              </div>
              <div className="mt-5 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {submittingPayment ? 'Saving...' : 'Save Payment Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Payment Details Modal */}
      {showPaymentDetails && application?.payment_details && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Payment Details</h3>
              <button
                onClick={() => setShowPaymentDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Beneficiary Name
                </label>
                <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {application.payment_details.beneficiary_name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bank Branch Name
                </label>
                <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {application.payment_details.bank_branch}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  IFSC Code
                </label>
                <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {application.payment_details.ifsc_code}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Account Type
                </label>
                <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-900 capitalize">
                  {application.payment_details.account_type}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Account Number
                </label>
                <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {application.payment_details.account_number}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  UPI ID
                </label>
                <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-900">
                  {application.payment_details.upi_id}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowPaymentDetails(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Confirm Payment Details</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500">
                Please confirm your payment details. Once submitted, you won't be able to modify these details later.
              </p>
              <div className="mt-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Beneficiary Name:</span>{' '}
                  {paymentDetails.beneficiary_name}
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Bank Branch:</span>{' '}
                  {paymentDetails.bank_branch}
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">IFSC Code:</span>{' '}
                  {paymentDetails.ifsc_code}
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Account Type:</span>{' '}
                  {paymentDetails.account_type}
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Account Number:</span>{' '}
                  {paymentDetails.account_number}
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">UPI ID:</span>{' '}
                  {paymentDetails.upi_id}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Edit
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submittingPayment}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {submittingPayment ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfViewer && pdfUrl && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
            <div className="p-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-medium">
                {application?.status === 'signed' ? 'Signed Document' : 'Document Preview'}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  download="document.pdf"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
                <button
                  onClick={() => {
                    setShowPdfViewer(false);
                    setPdfUrl(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 bg-gray-100">
              <iframe
                src={pdfUrl}
                className="w-full h-full rounded-md border-2 border-gray-200 bg-white"
                title="PDF Viewer"
                style={{ minHeight: '600px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add UPI QR Code Modal */}
      {showUpiQR && application?.payment_details && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">UPI Payment</h3>
              <button
                onClick={() => setShowUpiQR(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">You are paying</p>
                <p className="font-medium text-lg">{application.payment_details.beneficiary_name}</p>
                <p className="text-2xl font-bold text-green-600">₹{application.amount_requested.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">UPI ID: {application.payment_details.upi_id}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <QRCodeSVG
                  value={generateUpiUrl()}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <p className="text-sm text-gray-500 text-center mt-4">
                Scan this QR code with any UPI app to make the payment
              </p>
            </div>
            <div className="p-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowUpiQR(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
              <button
                onClick={handlePaymentComplete}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ChatBot - Show only after send for signature status */}
      {user && application && ['pending_signature', 'signed'].includes(application.status) && (
        <div className="fixed bottom-4 right-4">
          <ChatBot 
            userId={user.id} 
            isAdmin={isAdmin} 
            envelopeId={application.envelope_id || undefined}
            documentContent={documentContent}
          />
        </div>
      )}
    </div>
  );
} 