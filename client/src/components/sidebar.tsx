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
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
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
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  StickyNote,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { collapsed, toggleCollapsed } = useSidebar();
  const isMobile = useMobile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showToggleButton, setShowToggleButton] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

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
        { href: "/educator/classes", label: "Classes", icon: <School className="h-5 w-5" /> },
        { href: "/educator/assignments", label: "Assignments", icon: <ClipboardList className="h-5 w-5" /> },
        { href: "/educator/statistics", label: "Statistics", icon: <BarChart className="h-5 w-5" /> },
      ]
    : [
        { href: "/learner/dashboard", label: "My Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
        { href: "/explore", label: "Glossary", icon: <Lightbulb className="h-5 w-5" /> },
        { href: "/sticky-notes", label: "My Canvas", icon: <StickyNote className="h-5 w-5" /> },
        { href: "/learner/flashcards", label: "Flashcards", icon: <Brain className="h-5 w-5" /> },
        { href: "/learner/analysis", label: "Analysis", icon: <ChartNoAxesCombinedIcon className="h-5 w-5" /> },
      ];

  // Sidebar content - shared between mobile and desktop
  const SidebarContent = ({ isCollapsed = false }) => (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with Logo */}
      <div className={cn(
        "flex items-center p-4 border-b border-gray-100 relative transition-all duration-300",
        isCollapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {isCollapsed ? (
          // Collapsed state: Show "C" with hover effect to reveal toggle button
          (<div 
            className="relative flex items-center justify-center w-full"
            onMouseEnter={() => setShowToggleButton(true)}
            onMouseLeave={() => setShowToggleButton(false)}
          >
            <Link to="/" className="flex items-center">
              <span className={cn(
                "text-primary font-brand font-semibold transition-all duration-300 ease-in-out text-3xl",
                showToggleButton ? "opacity-0" : "opacity-100"
              )}>
                L
              </span>
            </Link>
            {/* Toggle button appears on hover over "C" */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className={cn(
                "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 transition-all duration-300 ease-in-out hover:bg-gray-100 hover:text-black text-gray-700",
                showToggleButton ? "opacity-100 visible" : "opacity-0 invisible"
              )}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>)
        ) : (
          // Extended state: Left-aligned "checkit" with right-aligned toggle button
          (<>
            <Link to="/" className="flex items-center">
              <span className="text-primary font-brand font-semibold text-4xl transition-all duration-300 ease-in-out">
                lexible
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="h-8 w-8 transition-all duration-300 ease-in-out hover:bg-gray-100 hover:text-black text-gray-700"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </>)
        )}
      </div>

      {/* Search section */}
      {!isCollapsed && (
        <div className="p-3 border-b border-gray-100">
          <GlobalSearch />
        </div>
      )}

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
                  "group flex items-center rounded-lg text-sm font-medium transition-all duration-200 relative",
                  isCollapsed ? "mx-auto p-2.5 w-10 h-10 justify-center" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => isMobile && setOpen(false)}
              >
                <div className={cn(
                  "flex items-center justify-center h-5 w-5 transition-colors duration-200",
                  isCollapsed ? "" : "mr-3"
                )}>
                  {link.icon}
                </div>
                
                {!isCollapsed && (
                  <span className="truncate">{link.label}</span>
                )}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[200]">
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
              <ThemeToggle />
              
              <DropdownMenu onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right" className="w-56 ml-2 z-[100]" sideOffset={8}>
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
              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize mt-1 text-secondary bg-[#1f66f4]">
                {user.role}
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <NotificationCenter onOpenChange={setIsNotificationOpen} />
              <ThemeToggle />
              
              <DropdownMenu onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[100]" sideOffset={8}>
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
      className={cn(
        "fixed left-0 top-0 bottom-0 bg-white shadow-lg flex flex-col border-r border-gray-200 z-30 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ overflow: "visible" }}
    >
      <div className="h-full overflow-hidden">
        <SidebarContent isCollapsed={collapsed} />
      </div>
    </div>
  );
}