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
    <div className="relative min-h-screen bg-background">
      <Sidebar />
      <div 
        className={`transition-all duration-300 ease-in-out ${
          !isMobile 
            ? collapsed 
              ? "ml-16" 
              : "ml-64" 
            : "ml-0"
        }`}
        style={{
          marginLeft: !isMobile ? (collapsed ? '4rem' : '16rem') : '0'
        }}
      >
        <main className="min-h-screen p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}