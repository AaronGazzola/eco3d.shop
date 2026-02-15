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
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-lg shadow-2xl p-6 pointer-events-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-black">
                  {selectedLink.animalType} - {selectedLink.linkName}
                </h2>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-black rounded transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="w-[600px] h-[400px] bg-gray-100 rounded overflow-hidden">
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
