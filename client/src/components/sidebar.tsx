import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
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
  LogOut, 
  BookOpen, 
  Brain, 
  School, 
  User, 
  Home,
  GraduationCap,
  Library,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

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
        { href: "/", label: "Home", icon: <Home className="h-5 w-5" /> },
        { href: "/educator/dashboard", label: "Dashboard", icon: <BookOpen className="h-5 w-5" /> },
        { href: "/educator/create", label: "Classes", icon: <School className="h-5 w-5" /> },
      ]
    : [
        { href: "/", label: "Home", icon: <Home className="h-5 w-5" /> },
        { href: "/learner/dashboard", label: "Dashboard", icon: <BookOpen className="h-5 w-5" /> },
        { href: "/learner/flashcards", label: "Flashcards", icon: <Brain className="h-5 w-5" /> },
      ];

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-md flex flex-col border-r border-gray-200 z-30">
      {/* Logo */}
      <div className="p-6">
        <Link to="/" className="flex items-center justify-center">
          <GraduationCap className="h-8 w-8 text-primary mr-2" />
          <span className="text-2xl font-bold text-primary">Checkit</span>
        </Link>
      </div>

      {/* Divider */}
      <div className="px-6">
        <div className="h-[1px] bg-gray-200"></div>
      </div>

      {/* Navigation links */}
      <div className="flex-1 px-3 py-6">
        <div className="space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200",
                location === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-gray-700 hover:bg-primary/5 hover:text-primary"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-md mr-3",
                location === link.href ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
              )}>
                {link.icon}
              </div>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* User profile section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center p-2">
          <Avatar className={cn(
            "h-10 w-10 text-white ring-2 ring-offset-2 mr-3",
            isEducator ? "ring-primary bg-primary" : "ring-secondary bg-secondary"
          )}>
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email}
            </p>
            <p className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full w-fit capitalize mt-1">
              {user.role}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}