"use client";

import { Game } from "./game/Game";
import { useEditModeStore } from "./page.stores";
import { LinkPreview } from "./game/LinkPreview";

export default function HomePage() {
  const { isEditMode, setEditMode, selectedLink, clearSelection } = useEditModeStore();

  return (
    <div className="fixed inset-0">
      <button
        onClick={() => {
          setEditMode(!isEditMode);
          if (isEditMode) clearSelection();
        }}
        className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/90 hover:bg-white text-black rounded-lg font-medium shadow-lg transition-colors"
      >
        {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
      </button>

      <Game />

      {selectedLink && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={clearSelection} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 pointer-events-auto w-full max-w-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-black">
                  {selectedLink.animalType} - {selectedLink.linkName}
                </h2>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-black rounded transition-colors text-sm"
                >
                  Close
                </button>
              </div>
              <div className="w-full h-[300px] sm:h-[400px] bg-gray-100 rounded overflow-hidden">
                <LinkPreview
                  animalType={selectedLink.animalType}
                  linkIndex={selectedLink.linkIndex}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
