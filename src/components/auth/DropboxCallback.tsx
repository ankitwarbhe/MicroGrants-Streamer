import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { docuSignService } from '../../services/docusign';

export function DropboxCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get access token from URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');

        if (!accessToken) {
          throw new Error('No access token received from Dropbox');
        }

        // Get the pending document ID from localStorage
        const applicationId = localStorage.getItem('pendingSaveDocumentId');
        if (!applicationId) {
          throw new Error('No pending document to save');
        }

        // Get the document content
        const documentBase64 = await docuSignService.getSignedDocument(applicationId);
        if (!documentBase64) {
          throw new Error('Could not fetch document content');
        }

        // Upload to Dropbox
        const filename = `grant_agreement_${applicationId}.pdf`;
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
        <p className="text-gray-600">Please wait while we save your document to Dropbox.</p>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    </div>
  );
} 