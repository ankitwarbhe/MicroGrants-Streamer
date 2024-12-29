# MicroGrants Streamer

A modern web application for managing and streamlining the grant application process, featuring document signing integration and automated disbursement tracking.

## Features

- **User Authentication**: Secure login and role-based access control (Admin/User)
- **Grant Application Management**:
  - Create and edit grant applications
  - Track application status
  - View application history
  - Submit supporting documents
  
- **Document Signing Integration**:
  - DocuSign integration for digital signatures
  - Automated document routing
  - Real-time signature status tracking
  
- **Payment Processing**:
  - UPI payment integration
  - Bank account details collection
  - Payment status tracking
  
- **Disbursement Tracking**:
  - Multi-step disbursement process
  - Real-time status updates
  - Admin verification steps
  
- **AI-Powered Chat Assistant**:
  - Context-aware responses
  - Document content analysis
  - Application status queries
  - Real-time assistance

## Technology Stack

- **Frontend**:
  - React with TypeScript
  - Tailwind CSS for styling
  - Lucide icons
  
- **Backend**:
  - Supabase for database and authentication
  - Node.js server for API integrations
  
- **Integrations**:
  - DocuSign API for document signing
  - Google's Gemini AI for chat assistance
  - UPI for payments
  
## Getting Started

1. **Prerequisites**:
   - Node.js (v14 or higher)
   - npm or yarn
   - Supabase account
   - DocuSign developer account
   - Google AI API key

2. **Environment Setup**:
   Create a `.env` file with the following variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_DOCUSIGN_AUTH_SERVER=your_docusign_auth_server
   VITE_DOCUSIGN_INTEGRATION_KEY=your_docusign_key
   VITE_DOCUSIGN_USER_ID=your_docusign_user_id
   VITE_DOCUSIGN_ACCOUNT_ID=your_docusign_account_id
   VITE_DOCUSIGN_TEMPLATE_ID=your_docusign_template_id
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_API_URL=your_api_url
   ```

3. **Installation**:
   ```bash
   # Install dependencies
   npm install

   # Start development server
   npm run dev
   ```

## Project Structure

```
src/
├── components/         # React components
│   ├── admin/         # Admin-specific components
│   ├── applications/  # Application-related components
│   ├── chat/         # Chat interface components
│   ├── disbursement/ # Disbursement tracking components
│   └── layout/       # Layout components
├── contexts/         # React contexts
├── lib/             # Utility libraries
├── pages/           # Page components
├── services/        # API services
└── types/           # TypeScript type definitions
```

## Key Features Documentation

### AI Chat Assistant
The chat assistant uses Google's Gemini AI to provide context-aware responses about applications and documents. It can:
- Answer questions about application status
- Explain document content
- Provide guidance on next steps
- Help with payment and disbursement queries

### Document Signing Flow
1. Admin approves application
2. System generates agreement document
3. Document sent for signatures (applicant first, then admin)
4. Status tracked in real-time
5. Signed document available for download

### Payment Processing
1. Applicant submits payment details
2. Admin verifies details
3. UPI payment initiated
4. Payment status tracked
5. Disbursement process begins

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
