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
import { 
  HelpCircle,
  Info,
  X
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
                      Select one or more classes to assign this vocabulary list.
                      Students will only see lists assigned to their classes.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FormLabel>
            <FormControl>
              <div className="space-y-3">
                {/* Selected classes display */}
                {field.value && field.value.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.value.map((classId: number) => {
                      const selectedClass = classes.find((cls: any) => cls.id === classId);
                      return selectedClass ? (
                        <Badge key={classId} variant="secondary" className="flex items-center gap-1">
                          {selectedClass.name}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => {
                              const newValue = field.value.filter((id: number) => id !== classId);
                              field.onChange(newValue);
                            }}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
                
                {/* Class selection checkboxes */}
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading classes...</p>
                  ) : classes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No classes available</p>
                  ) : (
                    classes.map((cls: any) => (
                      <div key={cls.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`class-${cls.id}`}
                          checked={field.value?.includes(cls.id) || false}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value || [];
                            if (checked) {
                              field.onChange([...currentValue, cls.id]);
                            } else {
                              field.onChange(currentValue.filter((id: number) => id !== cls.id));
                            }
                          }}
                        />
                        <label 
                          htmlFor={`class-${cls.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {cls.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
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