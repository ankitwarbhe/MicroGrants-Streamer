import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import { ApplicationDetailsPage } from './pages/ApplicationDetailsPage';
import { SignatureRequest } from './components/docusign/SignatureRequest';
import { DropboxCallback } from './components/auth/DropboxCallback';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications/new"
            element={
              <ProtectedRoute>
                <NewApplicationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications/:id"
            element={
              <ProtectedRoute>
                <ApplicationDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sign-document"
            element={
              <ProtectedRoute>
                <div className="container mx-auto py-8">
                  <SignatureRequest />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requireAdmin>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auth/dropbox/callback"
            element={
              <ProtectedRoute>
                <DropboxCallback />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}