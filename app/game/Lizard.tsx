"use client";

import { PlayerController } from "./PlayerController";
import { LizardVisual } from "./LizardVisual";

export function Lizard() {
  return <PlayerController>{(controlRef) => <LizardVisual controlRef={controlRef} />}</PlayerController>;
}
