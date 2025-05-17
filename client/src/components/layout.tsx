import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  // If there's no user (not logged in), don't show the sidebar
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64"> {/* This matches the sidebar width of 64 (w-64) */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}