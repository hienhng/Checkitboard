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
import { Menu, LogOut, User, BookOpen, PenTool, FileText, Brain, Search, School } from "lucide-react";
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
        { href: "/educator/dashboard", label: "Dashboard", icon: <BookOpen className="h-4 w-4 mr-2" /> },
        { href: "/educator/create", label: "Classes", icon: <School className="h-4 w-4 mr-2" /> },
      ]
    : [
        { href: "/learner/dashboard", label: "Dashboard", icon: <BookOpen className="h-4 w-4 mr-2" /> },
        { href: "/learner/flashcards", label: "Flashcards", icon: <Brain className="h-4 w-4 mr-2" /> },
      ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold text-primary cursor-pointer">
                Checkit
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "inline-flex items-center px-3 py-2 text-sm font-medium nav-link",
                    location === link.href
                      ? "text-primary active"
                      : "text-gray-600 hover:text-primary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <div className="hidden md:ml-4 md:flex-shrink-0 md:flex md:items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative rounded-full hover:bg-primary/5 transition-colors duration-200" aria-label="User menu">
                    <Avatar className={cn(
                      "h-9 w-9 text-white ring-2 ring-offset-2",
                      isEducator ? "ring-primary bg-primary" : "ring-secondary bg-secondary"
                    )}>
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1 p-1">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full w-fit capitalize">{user.role}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 mr-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <div className="py-4">
                    <div className="px-2 pb-3 pt-2 flex flex-col space-y-1">
                      <div className="mb-4">
                        <Link 
                          to="/"
                          className="text-2xl font-bold text-primary"
                          onClick={() => setOpen(false)}
                        >
                          Checkit
                        </Link>
                      </div>
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          className={cn(
                            "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                            location === link.href
                              ? "bg-primary/10 text-primary"
                              : "text-gray-700 hover:bg-primary/5 hover:text-primary"
                          )}
                          onClick={() => setOpen(false)}
                        >
                          {link.icon}
                          {link.label}
                        </Link>
                      ))}
                      <div className="pt-4 mt-4 border-t border-gray-200">
                        <div className="flex items-center px-3 mb-2">
                          <Avatar className={cn(
                            "h-8 w-8 mr-2 text-white ring-2 ring-offset-1",
                            isEducator ? "ring-primary bg-primary" : "ring-secondary bg-secondary"
                          )}>
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          className="flex w-full items-center justify-start text-red-600 px-3 hover:bg-red-50 transition-colors duration-200" 
                          onClick={() => {
                            handleLogout();
                            setOpen(false);
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign out
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
