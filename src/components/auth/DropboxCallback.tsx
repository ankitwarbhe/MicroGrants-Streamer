import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { docuSignService } from '../../services/docusign';
import { getApplicationById } from '../../services/applications';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function DropboxCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Initializing...');
  const { user } = useAuth();

  useEffect(() => {
    async function handleCallback() {
      console.log('DropboxCallback: Starting callback handler');
      try {
        // Check if user is authenticated
        if (!user) {
          console.log('DropboxCallback: No user found, checking session');
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('DropboxCallback: No session found, redirecting to auth');
            localStorage.setItem('dropboxCallbackUrl', window.location.href);
            navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
            return;
          }
        }

        setStatus('Getting authorization code...');
        // Get authorization code from URL search params
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const returnedState = searchParams.get('state');
        const storedState = localStorage.getItem('dropboxAuthState');

        console.log('DropboxCallback: Received params:', {
          code: code ? 'present' : 'missing',
          returnedState,
          storedState,
          fullUrl: window.location.href
        });

        // Verify state to prevent CSRF attacks
        if (!returnedState || returnedState !== storedState) {
          throw new Error('Invalid state parameter. Please try again.');
        }

        // Clean up state
        localStorage.removeItem('dropboxAuthState');

        if (!code) {
          console.error('Auth response:', {
            params: Object.fromEntries(searchParams.entries())
          });
          throw new Error('No authorization code received from Dropbox. Please try again.');
        }

        setStatus('Exchanging code for access token...');
        // Exchange code for access token
        const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: import.meta.env.VITE_DROPBOX_CLIENT_ID,
            client_secret: import.meta.env.VITE_DROPBOX_CLIENT_SECRET,
            redirect_uri: `${window.location.origin}/auth/dropbox/callback`,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => null);
          console.error('Token exchange failed:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            error: errorData
          });
          throw new Error('Failed to exchange authorization code for access token');
        }

        const { access_token: accessToken } = await tokenResponse.json();
        console.log('DropboxCallback: Successfully obtained access token');

        setStatus('Fetching application details...');
        // Get the pending document ID from localStorage
        const applicationId = localStorage.getItem('pendingSaveDocumentId');
        if (!applicationId) {
          throw new Error('No pending document to save');
        }

        // Get application details to include title in filename
        const application = await getApplicationById(applicationId);
        if (!application) {
          throw new Error('Could not fetch application details');
        }

        if (!application.envelope_id) {
          throw new Error('No envelope ID found for this application');
        }

        setStatus('Fetching signed document...');
        console.log('Fetching document for envelope:', application.envelope_id);
        
        // Get the document content
        let documentBase64: string;
        try {
          documentBase64 = await docuSignService.getSignedDocument(application.envelope_id);
          if (!documentBase64) {
            throw new Error('Document content is empty');
          }
          console.log('Document fetched successfully, content length:', documentBase64.length);
        } catch (docError) {
          console.error('Error fetching document:', docError);
          throw new Error(`Failed to fetch document: ${docError instanceof Error ? docError.message : 'Unknown error'}`);
        }

        setStatus('Creating filename...');
        // Create filename with title
        const sanitizedTitle = application.title
          .replace(/[^a-zA-Z0-9-_]/g, '_')
          .replace(/_+/g, '_')
          .toLowerCase();
        const filename = `grant_agreement_${sanitizedTitle}_${applicationId}.pdf`;

        setStatus('Uploading to Dropbox...');
        // Upload to Dropbox
        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Dropbox-API-Arg': JSON.stringify({
              path: `/${filename}`,
              mode: 'add',
              autorename: true,
              mute: false,
              strict_conflict: false
            }),
            'Content-Type': 'application/octet-stream'
          },
          body: Buffer.from(documentBase64, 'base64')
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('Dropbox upload failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error('Failed to upload file to Dropbox');
        }

        // Clear the pending document ID
        localStorage.removeItem('pendingSaveDocumentId');

        // Redirect back to the application page
        navigate(`/applications/${applicationId}?saved=true`);
      } catch (err) {
        console.error('Error in Dropbox callback:', err);
        setError(err instanceof Error ? err.message : 'Failed to save document to Dropbox');
      }
    }

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Saving Document</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-gray-500 mb-4">
            Please make sure:
            <ul className="list-disc pl-5 mt-2">
              <li>The document has been fully signed</li>
              <li>You have admin access to the application</li>
              <li>The DocuSign integration is properly configured</li>
            </ul>
          </div>
          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Saving Document...</h2>
        <p className="text-gray-600">{status}</p>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    </div>
  );
} 