import { useState, useEffect, useCallback, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface FullscreenMonitorProps {
  children: ReactNode;
  submissionId: number;
  isActive: boolean;
  onFullscreenExit?: () => void;
}

export function FullscreenMonitor({ 
  children, 
  submissionId, 
  isActive,
  onFullscreenExit 
}: FullscreenMonitorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [exitCount, setExitCount] = useState(0);
  
  // Function to request fullscreen
  const enterFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setShowWarning(false);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    }
  }, []);
  
  // Function to log fullscreen exit
  const logFullscreenExit = useCallback(async () => {
    if (!isActive || !submissionId) return;
    
    try {
      // Log the fullscreen exit event to the server
      await apiRequest(
        'POST',
        `/api/submissions/${submissionId}/fullscreen-exit`,
        { timestamp: new Date().toISOString() }
      );
      
      // Update local exit count
      setExitCount(prev => prev + 1);
      
      // Call the callback if provided
      if (onFullscreenExit) {
        onFullscreenExit();
      }
    } catch (error) {
      console.error('Error logging fullscreen exit:', error);
    }
  }, [submissionId, isActive, onFullscreenExit]);
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // If we exited fullscreen and monitoring is active
      if (!isCurrentlyFullscreen && isActive && isFullscreen) {
        setShowWarning(true);
        logFullscreenExit();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Don't automatically enter fullscreen - it should be triggered by user gesture
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isActive, isFullscreen, logFullscreenExit, enterFullscreen]);
  
  return (
    <div className="fullscreen-container">
      {showWarning && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fullscreen mode exited!</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>You've exited fullscreen mode {exitCount} time{exitCount !== 1 ? 's' : ''}. This event has been recorded.</p>
            <Button size="sm" onClick={enterFullscreen}>
              Return to fullscreen
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {children}
    </div>
  );
}