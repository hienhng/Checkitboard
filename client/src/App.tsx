import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HeroPage from "@/pages/hero-page";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import VerifyEmail from "@/pages/verify-email";
import Verify from "@/pages/verify";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { SidebarProvider } from "@/hooks/use-sidebar";
import EducatorDashboard from "@/pages/educator-dashboard";
import LearnerDashboard from "@/pages/learner-dashboard";
import VocabularyCheckup from "@/pages/vocabulary-checkup";
import TestPreview from "@/pages/test-preview";
import TestResults from "@/pages/test-results";
import VocabularyView from "@/pages/vocabulary-view";
import FlashcardsPage from "@/pages/flashcards-page";
import ClassListsPage from "@/pages/class-lists-page";
import LearnerAnalysis from "@/pages/learner-analysis";
import EducatorStatisticsPage from "@/pages/educator-statistics-page";
import VocabularyManagement from "@/pages/vocabulary-management";
import VocabularyDetails from "@/pages/vocabulary-details";
import { SettingsPage } from "@/pages/settings";
import { Layout } from "@/components/layout";
import { EmailVerificationGuard, withEmailVerification } from "@/components/email-verification-guard";

function Router() {
  return (
    <Switch>
      {/* Root route shows hero page for unauthenticated users, redirects authenticated users */}
      <Route path="/" component={HeroPage} />
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/verify" component={Verify} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Test preview and vocabulary checkup without layout/sidebar - requires verification */}
      <ProtectedRoute path="/learner/test-preview/:id" component={withEmailVerification(TestPreview)} />
      <ProtectedRoute path="/vocabulary-checkup/:id" component={withEmailVerification(VocabularyCheckup)} />
      <ProtectedRoute path="/test-results/:submissionId" component={withEmailVerification(TestResults)} />
      
      {/* All other routes with layout/sidebar */}
      <SidebarProvider>
        <Layout>
          <EmailVerificationGuard showBanner={true}>
            <ProtectedRoute path="/home" component={HomePage} />
            <ProtectedRoute path="/educator/dashboard" component={withEmailVerification(EducatorDashboard)} />
            <ProtectedRoute path="/educator/statistics" component={withEmailVerification(EducatorStatisticsPage)} />
            <ProtectedRoute path="/educator/assignments" component={withEmailVerification(VocabularyManagement)} />
            <ProtectedRoute path="/educator/vocabulary/:listId" component={withEmailVerification(VocabularyDetails)} />
            <ProtectedRoute path="/learner/dashboard" component={withEmailVerification(LearnerDashboard)} />
            <ProtectedRoute path="/learner/vocabulary/:listId" component={withEmailVerification(VocabularyView)} />
            <ProtectedRoute path="/learner/flashcards" component={withEmailVerification(FlashcardsPage)} />
            <ProtectedRoute path="/learner/class/:classId" component={withEmailVerification(ClassListsPage)} />
            <ProtectedRoute path="/learner/analysis" component={withEmailVerification(LearnerAnalysis)} />
            <ProtectedRoute path="/settings" component={SettingsPage} />
          </EmailVerificationGuard>
        </Layout>
      </SidebarProvider>
      
      {/* Catch all unmatched routes */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
