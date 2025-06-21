import { useEffect, useState } from "react";
import { AlertTriangle, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FullscreenWarningProps {
  isVisible: boolean;
  onReturnToFullscreen: () => void;
}

export function FullscreenWarning({ isVisible, onReturnToFullscreen }: FullscreenWarningProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-500 bg-red-50 dark:bg-red-950">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900 p-3">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-red-800 dark:text-red-200">
            Fullscreen Mode Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-red-700 dark:text-red-300 text-sm">
            You have exited fullscreen mode. To continue with your test, you must return to fullscreen mode.
          </p>
          <p className="text-red-600 dark:text-red-400 text-xs font-medium">
            Test interactions are disabled until you return to fullscreen.
          </p>
          <Button
            onClick={onReturnToFullscreen}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <Maximize className="mr-2 h-4 w-4" />
            Return to Fullscreen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}