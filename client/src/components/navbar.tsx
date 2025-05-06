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
import { Menu, LogOut, User, BookOpen, PenTool, FileText, Brain } from "lucide-react";
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
        { href: "/educator/create", label: "Create List", icon: <PenTool className="h-4 w-4 mr-2" /> },
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
              <Link href="/">
                <h1 className="text-xl font-bold text-primary cursor-pointer">Checkit</h1>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                    location === link.href
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
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
                  <Button variant="ghost" className="relative rounded-full" aria-label="User menu">
                    <Avatar className={cn(
                      "h-8 w-8 text-white",
                      isEducator ? "bg-primary" : "bg-secondary"
                    )}>
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                      <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={isEducator ? "/educator/dashboard" : "/learner/dashboard"} className="cursor-pointer flex w-full items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
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
                          href="/"
                          className="text-xl font-bold text-primary"
                          onClick={() => setOpen(false)}
                        >
                          Checkit
                        </Link>
                      </div>
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                            location === link.href
                              ? "bg-primary/10 text-primary"
                              : "text-gray-700 hover:bg-gray-50"
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
                            "h-8 w-8 mr-2 text-white",
                            isEducator ? "bg-primary" : "bg-secondary"
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
                          className="flex w-full items-center justify-start text-red-600 px-3" 
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
