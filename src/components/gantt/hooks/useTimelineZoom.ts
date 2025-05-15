"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ViewMode } from "../types";

const VIEW_MODE_SCALES: Record<ViewMode, number> = {
  day: 50,
  week: 10,
  month: 2,
  quarter: 0.5,
  year: 0.1,
};

const MIN_SCALE = 0.05;
const MAX_SCALE = 200;

interface UseTimelineZoomProps {
  initialViewMode: ViewMode;
  initialScale?: number; // Optional override for initial scale
}

export function useTimelineZoom({
  initialViewMode,
  initialScale,
}: UseTimelineZoomProps) {
  const [currentViewMode, setCurrentViewMode] =
    useState<ViewMode>(initialViewMode);
  const [currentScale, setCurrentScale] = useState<number>(
    initialScale ?? VIEW_MODE_SCALES[initialViewMode]
  );
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Update scale when view mode changes programmatically
  useEffect(() => {
    if (!initialScale) {
      // Only if not overridden by initialScale prop
      setCurrentScale(VIEW_MODE_SCALES[currentViewMode]);
    }
  }, [currentViewMode, initialScale]);

  const handleWheelZoom = useCallback((event: WheelEvent) => {
    if (event.ctrlKey) {
      event.preventDefault();
      const zoomIntensity = 0.1;
      const direction = event.deltaY < 0 ? 1 : -1;

      setCurrentScale((prevScale) => {
        let newScale = prevScale * (1 + direction * zoomIntensity);
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        return newScale;
      });
    }
  }, []);

  useEffect(() => {
    const container = timelineContainerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheelZoom, { passive: false });
      return () => {
        container.removeEventListener("wheel", handleWheelZoom);
      };
    }
  }, [handleWheelZoom]);

  return {
    timelineContainerRef, // To be attached to the scrollable timeline container
    currentViewMode,
    setCurrentViewMode, // Allow parent to change view mode
    currentScale,
    setCurrentScale, // Allow parent to manually set scale if needed
    VIEW_MODE_SCALES, // Export scales if parent wants to use them for UI
  };
}
