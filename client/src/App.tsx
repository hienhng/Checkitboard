import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import VerifyEmail from "@/pages/verify-email";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import EducatorDashboard from "@/pages/educator-dashboard";
import LearnerDashboard from "@/pages/learner-dashboard";
import VocabularyCheckup from "@/pages/vocabulary-checkup";
import VocabularyView from "@/pages/vocabulary-view";
import FlashcardsPage from "@/pages/flashcards-page";
import ClassListsPage from "@/pages/class-lists-page";
import LearnerAnalysis from "@/pages/learner-analysis";
import EducatorStatisticsPage from "@/pages/educator-statistics-page";
import { SettingsPage } from "@/pages/settings";
import { Layout } from "@/components/layout";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmail} />
      {/* Vocabulary checkup without layout/sidebar */}
      <ProtectedRoute path="/learner/checkup/:id" component={VocabularyCheckup} />
      
      {/* All other routes with layout/sidebar */}
      <Layout>
        <ProtectedRoute path="/" component={HomePage} />
        <ProtectedRoute path="/educator/dashboard" component={EducatorDashboard} />
        <ProtectedRoute path="/educator/statistics" component={EducatorStatisticsPage} />
        <ProtectedRoute path="/learner/dashboard" component={LearnerDashboard} />
        <ProtectedRoute path="/learner/vocabulary/:listId" component={VocabularyView} />
        <ProtectedRoute path="/learner/flashcards" component={FlashcardsPage} />
        <ProtectedRoute path="/learner/class/:classId" component={ClassListsPage} />
        <ProtectedRoute path="/learner/analysis" component={LearnerAnalysis} />
        <ProtectedRoute path="/settings" component={SettingsPage} />
      </Layout>
      
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
