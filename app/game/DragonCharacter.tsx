"use client";

import { Suspense } from "react";
import type { RefObject } from "react";
import { useSplitStl } from "./StlModel";
import { DragonString } from "./DragonCharacter.physics";
import {
  GRAVITY, DAMPING, COLLISION_PUSH, CONSTRAINT_ITERS,
  DRAG_STRENGTH, PICK_THRESHOLD, FLOOR_PUSH, DRAGON_MODEL_URL, HEAD_MOVE_SPEED,
} from "./DragonCharacter.constants";

export function DragonCharacter({ orbitRef, ghost = true, gravity = GRAVITY, damping = DAMPING, collisionPush = COLLISION_PUSH, collisionSkip = 0, constraintIters = CONSTRAINT_ITERS, dragStrength = DRAG_STRENGTH, pickThreshold = PICK_THRESHOLD, floorPush = FLOOR_PUSH, yawLimitsOn = true, headMoveSpeed = HEAD_MOVE_SPEED }: { orbitRef?: RefObject<any>; ghost?: boolean; gravity?: number; damping?: number; collisionPush?: number; collisionSkip?: number; constraintIters?: number; dragStrength?: number; pickThreshold?: number; floorPush?: number; yawLimitsOn?: boolean; headMoveSpeed?: number }) {
  const pieces = useSplitStl(DRAGON_MODEL_URL);
  if (pieces.length < 3) return null;
  return (
    <Suspense fallback={null}>
      <DragonString pieces={pieces} orbitRef={orbitRef} ghost={ghost} gravity={gravity} damping={damping} collisionPush={collisionPush} collisionSkip={collisionSkip} constraintIters={constraintIters} dragStrength={dragStrength} pickThreshold={pickThreshold} floorPush={floorPush} yawLimitsOn={yawLimitsOn} headMoveSpeed={headMoveSpeed} />
    </Suspense>
  );
}
