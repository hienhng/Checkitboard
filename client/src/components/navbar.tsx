import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Menu, 
  LogOut, 
  User, 
  BookOpen, 
  PenTool, 
  FileText, 
  Brain, 
  Search, 
  School,
  LayoutDashboard,
  BookMarked,
  Calendar,
  BookText,
  BarChart3,
  MessageSquare,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

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
        { href: "/educator/classes", label: "Classes", icon: <BookMarked className="h-5 w-5" /> },
        { href: "/educator/schedule", label: "Schedule", icon: <Calendar className="h-5 w-5" /> },
        { href: "/educator/homeworks", label: "Homeworks", icon: <BookText className="h-5 w-5" /> },
        { href: "/educator/analysis", label: "Analysis", icon: <BarChart3 className="h-5 w-5" /> },
        { href: "/educator/messages", label: "Messages", icon: <MessageSquare className="h-5 w-5" /> },
      ]
    : [
        { href: "/learner/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
        { href: "/learner/flashcards", label: "Flashcards", icon: <Brain className="h-5 w-5" /> },
        { href: "/learner/schedule", label: "Schedule", icon: <Calendar className="h-5 w-5" /> },
        { href: "/learner/homeworks", label: "Homeworks", icon: <BookText className="h-5 w-5" /> },
      ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white rounded-tr-3xl rounded-br-3xl shadow-sm">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo */}
          <div className="px-6 pt-6 pb-4">
            <Link to="/" className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M20 4L16 8M16 4L20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-2 text-xl font-bold text-blue-500">Octavia</span>
            </Link>
          </div>
          
          {/* Navigation links */}
          <div className="px-4 py-2 mt-2">
            <nav className="flex-1 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 group",
                    location === link.href
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  )}
                >
                  <div className={cn(
                    "mr-3",
                    location === link.href
                      ? "text-blue-600"
                      : "text-gray-500 group-hover:text-blue-600"
                  )}>
                    {link.icon}
                  </div>
                  {link.label}
                  {link.label === "Messages" && (
                    <div className="ml-auto bg-blue-100 text-blue-600 text-xs font-medium rounded-full px-2 py-0.5">
                      27
                    </div>
                  )}
                  {link.label === "Analysis" && (
                    <div className="ml-auto bg-blue-100 text-blue-600 text-xs font-medium rounded-full px-2 py-0.5">
                      New
                    </div>
                  )}
                </Link>
              ))}
            </nav>
          </div>
          
          {/* Settings and Logout */}
          <div className="px-4 py-2 mt-auto mb-2">
            <Link
              to="/settings"
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 group"
            >
              <Settings className="h-5 w-5 mr-3 text-gray-500 group-hover:text-blue-600" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 group"
            >
              <LogOut className="h-5 w-5 mr-3 text-gray-500 group-hover:text-blue-600" />
              Log out
            </button>
          </div>
          
          {/* Premium Banner */}
          <div className="mx-4 mb-6 p-4 bg-[#192c53] text-white rounded-xl">
            <h3 className="font-bold text-sm">Buy Premium and Get Access to New Courses</h3>
            <div className="mt-6 flex items-center text-xs">
              <span>More Details</span>
              <div className="ml-1 p-1 rounded-full bg-white/20">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3L14 8L8 13M14 8H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 z-10 p-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] rounded-r-2xl">
            <div className="py-4">
              <div className="px-2 pb-3 pt-2 flex flex-col space-y-1">
                <div className="mb-4">
                  <Link 
                    to="/"
                    className="flex items-center"
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                      <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M20 4L16 8M16 4L20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="ml-2 text-xl font-bold text-blue-500">Octavia</span>
                  </Link>
                </div>
                
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 group",
                      location === link.href
                        ? "bg-blue-100 text-blue-600"
                        : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <div className={cn(
                      "mr-3",
                      location === link.href
                        ? "text-blue-600"
                        : "text-gray-500 group-hover:text-blue-600"
                    )}>
                      {link.icon}
                    </div>
                    {link.label}
                    {link.label === "Messages" && (
                      <div className="ml-auto bg-blue-100 text-blue-600 text-xs font-medium rounded-full px-2 py-0.5">
                        27
                      </div>
                    )}
                    {link.label === "Analysis" && (
                      <div className="ml-auto bg-blue-100 text-blue-600 text-xs font-medium rounded-full px-2 py-0.5">
                        New
                      </div>
                    )}
                  </Link>
                ))}
                
                <div className="pt-4 mt-4 space-y-1">
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 group"
                    onClick={() => setOpen(false)}
                  >
                    <Settings className="h-5 w-5 mr-3 text-gray-500 group-hover:text-blue-600" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setOpen(false);
                    }}
                    className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 group"
                  >
                    <LogOut className="h-5 w-5 mr-3 text-gray-500 group-hover:text-blue-600" />
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
