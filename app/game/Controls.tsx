"use client";

import { useEditModeStore } from "../page.stores";

export function Controls() {
  const { selectedLink } = useEditModeStore();

  if (selectedLink) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 rounded-lg bg-black/50 p-4 text-white">
      <div className="text-sm font-medium">Controls:</div>
      <div className="mt-2 space-y-1 text-xs">
        <div>Click/Tap and hold to move</div>
        <div>Animal follows your pointer</div>
      </div>
    </div>
  );
}
