import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { 
  HelpCircle,
  Info,
  X,
  Check,
  ChevronsUpDown
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Control } from "react-hook-form";
import { cn } from "@/lib/utils";

interface ClassSelectProps {
  formControl: Control<any>;
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string | null;
  required?: boolean;
  multiple?: boolean;
}

export function ClassSelect({
  formControl,
  name,
  label,
  description,
  placeholder = "Select a class...",
  defaultValue,
  required = false,
  multiple = false,
}: ClassSelectProps) {
  // Fetch the educator's classes
  const { data: classes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/educator/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/classes");
      return response.json();
    },
  });

  if (multiple) {
    return (
      <FormField
        control={formControl}
        name={name}
        render={({ field }) => {
          const [open, setOpen] = useState(false);
          const selectedClasses = field.value || [];
          
          return (
            <FormItem>
              <FormLabel className="flex items-center">
                {label}
                {!required && (
                  <span className="ml-1 text-muted-foreground">(Optional)</span>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Select one or more classes to assign this vocabulary list.
                        Students will only see lists assigned to their classes.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <div className="space-y-2">
                  {/* Selected classes display */}
                  {selectedClasses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedClasses.map((classId: number) => {
                        const selectedClass = classes.find((cls: any) => cls.id === classId);
                        return selectedClass ? (
                          <Badge key={classId} variant="secondary" className="flex items-center gap-1">
                            {selectedClass.name}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => {
                                const newValue = selectedClasses.filter((id: number) => id !== classId);
                                field.onChange(newValue);
                              }}
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  
                  {/* Multi-select dropdown */}
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                        disabled={isLoading}
                      >
                        {selectedClasses.length === 0 
                          ? placeholder
                          : `${selectedClasses.length} class${selectedClasses.length === 1 ? '' : 'es'} selected`
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search classes..." />
                        <CommandEmpty>
                          {isLoading ? "Loading classes..." : "No classes found."}
                        </CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {classes.map((cls: any) => (
                            <CommandItem
                              key={cls.id}
                              onSelect={() => {
                                const currentValue = field.value || [];
                                if (currentValue.includes(cls.id)) {
                                  field.onChange(currentValue.filter((id: number) => id !== cls.id));
                                } else {
                                  field.onChange([...currentValue, cls.id]);
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedClasses.includes(cls.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {cls.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </FormControl>
              {description && <FormDescription>{description}</FormDescription>}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }

  return (
    <FormField
      control={formControl}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center">
            {label}
            {!required && (
              <span className="ml-1 text-muted-foreground">(Optional)</span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Assigning to a class restricts visibility to just students in that class.
                    Leave empty to make visible to all students.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </FormLabel>
          <FormControl>
            <Select
              value={field.value ? field.value.toString() : "null"}
              onValueChange={(value) => {
                // Convert to number or null
                field.onChange(value === "null" ? null : parseInt(value));
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">No class restriction</SelectItem>
                {classes?.map((cls: any) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </>
        </FormItem>
      )}
    />
  );
}