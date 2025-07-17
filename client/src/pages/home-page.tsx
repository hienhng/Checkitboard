import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function HomePage() {
  const { user } = useAuth();

  // Redirect based on user role
  if (user) {
    if (user.role === "educator") {
      return <Redirect to="/educator/dashboard" />;
    } else if (user.role === "learner") {
      return <Redirect to="/learner/dashboard" />;
    }
  }

  // This shouldn't be reached due to ProtectedRoute wrapper,
  // but added for safety - redirect to hero page for marketing
  return <Redirect to="/hero" />;
}
