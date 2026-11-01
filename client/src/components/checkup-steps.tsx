import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckupStepsProps {
  steps: readonly string[];
  currentStep: number;
  onStepChange: (step: number) => void;
  canVisitStep: (step: number) => boolean;
  disabled?: boolean;
}

export function CheckupSteps({ steps, currentStep, onStepChange, canVisitStep, disabled }: CheckupStepsProps) {
  return (
    <nav aria-label="Checkup progress">
      <ol className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
        {steps.map((label, index) => (
          <li key={label} className="min-w-0 flex-1">
            <button type="button" aria-current={index === currentStep ? "step" : undefined} disabled={disabled || !canVisitStep(index)} onClick={() => onStepChange(index)}
              className={cn("flex w-full items-center gap-2.5 rounded-xl border p-3 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default", index === currentStep ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground", index < currentStep && "bg-muted/40 text-foreground", !canVisitStep(index) && "opacity-50")}>
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]", index === currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {index < currentStep ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
