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
import { 
  HelpCircle,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Control } from "react-hook-form";

interface ClassSelectProps {
  formControl: Control<any>;
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string | null;
  required?: boolean;
}

export function ClassSelect({
  formControl,
  name,
  label,
  description,
  placeholder = "Select a class...",
  defaultValue,
  required = false,
}: ClassSelectProps) {
  // Fetch the educator's classes
  const { data: classes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/educator/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/classes");
      return response.json();
    },
  });

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
              value={field.value ? field.value.toString() : ""}
              onValueChange={(value) => {
                // Convert to number or null
                field.onChange(value ? parseInt(value) : null);
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No class restriction</SelectItem>
                {classes?.map((cls: any) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}