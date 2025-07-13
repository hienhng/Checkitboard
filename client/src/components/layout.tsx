import { ReactNode, useContext } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { useSidebarOptional } from "@/hooks/use-sidebar";

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
    <LayoutWithSidebar>{children}</LayoutWithSidebar>
  );
}

function LayoutWithSidebar({ children }: LayoutProps) {
  const sidebarContext = useSidebarOptional();
  const isMobile = useMobile();
  
  const collapsed = sidebarContext?.collapsed || false;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div 
        className={`flex-1 transition-all duration-300 ease-in-out ${
          !isMobile 
            ? collapsed 
              ? "ml-16" 
              : "ml-64" 
            : ""
        }`}
      >
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}