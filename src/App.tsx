import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { Navbar, Footer } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignUpPage from '@/pages/SignUpPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import ResumeAnalyzerPage from '@/pages/ResumeAnalyzerPage';
import JobMatcherPage from '@/pages/JobMatcherPage';
import ResumeImprovementPage from '@/pages/ResumeImprovementPage';
import CoverLetterPage from '@/pages/CoverLetterPage';
import HistoryPage from '@/pages/HistoryPage';
import PricingPage from '@/pages/PricingPage';
import ProfilePage from '@/pages/ProfilePage';
import PaymentPage from '@/pages/PaymentPage';
import PaymentSuccessPage from '@/pages/PaymentSuccessPage';
import PaymentFailedPage from '@/pages/PaymentFailedPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analyzer"
                element={
                  <ProtectedRoute>
                    <ResumeAnalyzerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/matcher"
                element={
                  <ProtectedRoute>
                    <JobMatcherPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/improve"
                element={
                  <ProtectedRoute>
                    <ResumeImprovementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cover-letter"
                element={
                  <ProtectedRoute>
                    <CoverLetterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment"
                element={
                  <ProtectedRoute>
                    <PaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/success"
                element={
                  <ProtectedRoute>
                    <PaymentSuccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/failed"
                element={
                  <ProtectedRoute>
                    <PaymentFailedPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
