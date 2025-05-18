import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const isMobile = useMobile();

  // If there's no user (not logged in), don't show the sidebar
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className={`flex-1 ${!isMobile ? "ml-64" : ""}`}> {/* Only add margin on desktop */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}