import { useState, FormEvent, ChangeEvent } from 'react';
import { docuSignService } from '../../services/docusign';

export function SignatureRequest() {
  const [file, setFile] = useState<File | null>(null);
  const [signerEmail, setSignerEmail] = useState('');
  const [signerName, setSignerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ envelopeId: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!file) {
        throw new Error('Please select a document to send');
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          const response = await docuSignService.sendDocumentForSignature({
            documentPath: base64String.split(',')[1], // Remove data URL prefix
            signerEmail,
            signerName,
            documentName: file.name
          });
          
          if (response.envelopeId && response.status) {
            setResult({
              envelopeId: response.envelopeId,
              status: response.status
            });
          } else {
            throw new Error('Invalid response from DocuSign');
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to send document for signature');
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read the file');
        setIsLoading(false);
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send document for signature');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Send Document for Signature</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700">
            Document
          </label>
          <input
            type="file"
            id="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label htmlFor="signerEmail" className="block text-sm font-medium text-gray-700">
            Signer Email
          </label>
          <input
            type="email"
            id="signerEmail"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm
                     focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="signerName" className="block text-sm font-medium text-gray-700">
            Signer Name
          </label>
          <input
            type="text"
            id="signerName"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm
                     focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md
                   shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                   disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send for Signature'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">
            Document sent successfully!<br />
            Envelope ID: {result.envelopeId}<br />
            Status: {result.status}
          </p>
        </div>
      )}
    </div>
  );
} 