import { useEffect, useState, useRef } from "react";

interface UseFullscreenOptions {
  onExitFullscreen?: () => void;
  onEnterFullscreen?: () => void;
  trackExits?: boolean;
  submissionId?: number;
}

export function useFullscreen(options: UseFullscreenOptions = {}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exitCount, setExitCount] = useState(0);
  const elementRef = useRef<HTMLElement | null>(null);

  const enterFullscreen = async () => {
    try {
      const element = elementRef.current || document.documentElement;
      
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error("Failed to exit fullscreen:", error);
    }
  };

  const logFullscreenExit = async () => {
    if (!options.trackExits || !options.submissionId) return;

    try {
      await fetch("/api/fullscreen-exit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId: options.submissionId,
          exitedAt: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to log fullscreen exit:", error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );

      setIsFullscreen(isCurrentlyFullscreen);

      if (isCurrentlyFullscreen) {
        options.onEnterFullscreen?.();
      } else {
        setExitCount(prev => prev + 1);
        logFullscreenExit();
        options.onExitFullscreen?.();
      }
    };

    // Add event listeners for different browsers
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    // Check initial state
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
    };
  }, [options.onEnterFullscreen, options.onExitFullscreen, options.submissionId, options.trackExits]);

  return {
    isFullscreen,
    exitCount,
    enterFullscreen,
    exitFullscreen,
    elementRef,
  };
}