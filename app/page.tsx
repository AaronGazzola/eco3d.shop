"use client";

import { Game } from "./game/Game";
import { SegmentEditor } from "./game/SegmentEditor";
import { usePageStore, ViewMode } from "./page.stores";
import { cn } from "@/lib/utils";

const NAV_BUTTONS: { mode: ViewMode; label: string }[] = [
  { mode: "play", label: "Play" },
  { mode: "head", label: "Head" },
  { mode: "body", label: "Body" },
  { mode: "tail", label: "Tail" },
];

export default function HomePage() {
  const { viewMode, setViewMode } = usePageStore();

  return (
    <div className="fixed inset-0">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {NAV_BUTTONS.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium shadow-lg transition-colors",
              viewMode === mode
                ? "bg-black text-white"
                : "bg-white/90 hover:bg-white text-black"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === "play" ? (
        <Game />
      ) : (
        <SegmentEditor segment={viewMode} />
      )}
    </div>
  );
}
