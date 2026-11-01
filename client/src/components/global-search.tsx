import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Search, 
  BookOpen, 
  Users, 
  FileText, 
  User,
  GraduationCap,
  Brain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface SearchResult {
  id: number;
  title: string;
  type: 'vocabulary_list' | 'class' | 'student' | 'submission';
  description?: string;
  url: string;
}

export function GlobalSearch() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search API call
  const { data: searchResults = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ["global-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const response = await apiRequest("GET", `/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      return response.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Handle keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'vocabulary_list':
        return <BookOpen className="h-4 w-4" />;
      case 'class':
        return <Users className="h-4 w-4" />;
      case 'student':
        return <User className="h-4 w-4" />;
      case 'submission':
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vocabulary_list':
        return 'Vocabulary List';
      case 'class':
        return 'Class';
      case 'student':
        return 'Student';
      case 'submission':
        return 'Submission';
      default:
        return 'Item';
    }
  };

  if (!user) return null;

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Search your workspace"
            className={cn(
              "h-9 w-10 justify-center gap-0 rounded-lg border-border bg-background px-0 text-left text-xs font-normal sm:w-full sm:justify-start sm:gap-2 sm:px-3",
              "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden truncate sm:block">Search your workspace</span>
            <div className="ml-auto hidden items-center gap-1 lg:flex">
              <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span>Ctrl</span>K
              </kbd>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="end">
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef}
              placeholder="Search vocabulary lists, classes, students..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9"
            />
            <CommandList>
              {isLoading && searchQuery.length >= 2 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                  Searching...
                </div>
              )}
              
              {!isLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                <CommandEmpty>No results found for "{searchQuery}"</CommandEmpty>
              )}

              {searchQuery.length < 2 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              )}
              
              {searchResults.length > 0 && (
                <CommandGroup>
                  {searchResults.map((result) => (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      value={`${result.title} ${result.description || ''}`}
                      onSelect={() => {
                        setOpen(false);
                        setSearchQuery("");
                        // Navigation will be handled by the Link component
                      }}
                    >
                      <Link to={result.url} className="flex items-center w-full">
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-shrink-0">
                            {getIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{result.title}</div>
                            {result.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {result.description}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex-shrink-0">
                            {getTypeLabel(result.type)}
                          </div>
                        </div>
                      </Link>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
