"use client";

import { useEditModeStore } from "../page.stores";

interface AnimalSelectorProps {
  selected: "fish" | "lizard" | "snake";
  onSelect: (animal: "fish" | "lizard" | "snake") => void;
}

export function AnimalSelector({ selected, onSelect }: AnimalSelectorProps) {
  const { selectedLink } = useEditModeStore();
  const animals = [
    { id: "fish" as const, label: "Fish", emoji: "🐟" },
    { id: "lizard" as const, label: "Lizard", emoji: "🦎" },
    { id: "snake" as const, label: "Snake", emoji: "🐍" },
  ];

  if (selectedLink) return null;

  return (
    <div className="pointer-events-auto fixed right-4 top-4 flex gap-2">
      {animals.map((animal) => (
        <button
          key={animal.id}
          onClick={() => onSelect(animal.id)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            selected === animal.id
              ? "bg-white text-black shadow-lg"
              : "bg-black/50 text-white hover:bg-black/70"
          }`}
        >
          <span className="mr-2">{animal.emoji}</span>
          {animal.label}
        </button>
      ))}
    </div>
  );
}
