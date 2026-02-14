"use client";

import { Game } from "./game/Game";

export default function HomePage() {
  return (
    <div className="fixed inset-0">
      <Game />
    </div>
  );
}
