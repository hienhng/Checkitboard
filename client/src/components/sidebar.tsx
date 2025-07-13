import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/notifications";
import { 
  LogOut, 
  BookOpen, 
  Brain, 
  School, 
  User, 
  Home,
  GraduationCap,
  Menu,
  X,
  LineChart as LineChartIcon,
  BarChart as ChartNoAxesCombinedIcon,
  BarChart,
  House,
  LayoutDashboard,
  Settings,
  ChevronDown,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { collapsed, toggleCollapsed } = useSidebar();
  const isMobile = useMobile();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Handle hover to expand
  const handleMouseEnter = () => {
    if (isMobile || !collapsed) return;
    
    // Clear any leave timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Expand the sidebar
    toggleCollapsed();
  };

  // Handle mouse leave to collapse
  const handleMouseLeave = () => {
    if (isMobile || collapsed || isDropdownOpen || isNotificationOpen) return;
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set timeout to collapse after 200ms delay
    hoverTimeoutRef.current = setTimeout(() => {
      // Double check that dropdowns are still closed before collapsing
      if (!isDropdownOpen && !isNotificationOpen) {
        toggleCollapsed();
      }
    }, 200);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const isEducator = user.role === "educator";
  const isLearner = user.role === "learner";

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const navLinks = isEducator
    ? [
        { href: "/educator/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
        { href: "/educator/assignments", label: "Assignments", icon: <ClipboardList className="h-5 w-5" /> },
        { href: "/educator/statistics", label: "Statistics", icon: <BarChart className="h-5 w-5" /> },
       
      ]
    : [
        { href: "/learner/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
        { href: "/learner/flashcards", label: "Flashcards", icon: <Brain className="h-5 w-5" /> },
        { href: "/learner/analysis", label: "Analysis", icon: <ChartNoAxesCombinedIcon className="h-5 w-5" /> },
      ];

  // Sidebar content - shared between mobile and desktop
  const SidebarContent = ({ isCollapsed = false }) => (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with Logo */}
      <div className={cn(
        "flex items-center p-4 border-b border-gray-100 relative transition-all duration-300",
        isCollapsed ? "justify-center px-2" : "justify-center"
      )}>
        <Link to="/" className="flex items-center">
          <span className={cn(
            "text-primary font-modak transition-all duration-500 ease-in-out",
            isCollapsed ? "text-3xl transform rotate-135" : "text-4xl"
          )}>
            {isCollapsed ? "C" : "checkit"}
          </span>
        </Link>
      </div>

      {/* Navigation links */}
      <div className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
        <nav className="space-y-1">
          {navLinks.map((link) => {
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => isMobile && setOpen(false)}
              >
                <div className={cn(
                  "flex items-center justify-center h-5 w-5 transition-colors duration-200",
                  isCollapsed ? "mx-auto" : "mr-3"
                )}>
                  {link.icon}
                </div>
                
                {!isCollapsed && (
                  <span className="truncate">{link.label}</span>
                )}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {link.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile section */}
      <div className={cn("border-t border-gray-100 p-3 flex-shrink-0", isCollapsed && "p-2")}>
        {isCollapsed ? (
          <div className="flex flex-col items-center space-y-2">
            <Avatar className={cn(
              "h-8 w-8 text-white",
              isEducator ? "bg-primary" : "bg-secondary"
            )}>
              <AvatarImage src={user.profilePicture || undefined} />
              <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col items-center space-y-1">
              <NotificationCenter onOpenChange={setIsNotificationOpen} />
              
              <DropdownMenu onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="right" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-gray-500 font-normal">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <Avatar className={cn(
              "h-10 w-10 text-white",
              isEducator ? "bg-primary" : "bg-secondary"
            )}>
              <AvatarImage src={user.profilePicture || undefined} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
              <div className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize mt-1",
                isEducator ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
              )}>
                {user.role}
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <NotificationCenter onOpenChange={setIsNotificationOpen} />
              
              <DropdownMenu onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile sidebar with Sheet component
  if (isMobile) {
    return (
      <>
        {/* Mobile menu button */}
        <div className="fixed top-4 left-4 z-40">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white shadow-lg border-gray-200">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-white">
              <div className="h-full flex flex-col overflow-hidden">
                <SidebarContent isCollapsed={false} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </>
    );
  }

  // Desktop sidebar with collapse functionality
  return (
    <div 
      ref={sidebarRef}
      className={cn(
        "fixed left-0 top-0 bottom-0 bg-white shadow-lg flex flex-col border-r border-gray-200 z-30 transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-16" : "w-64"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarContent isCollapsed={collapsed} />
    </div>
  );
}