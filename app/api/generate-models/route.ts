import { NextResponse } from "next/server";
import {
  createBasicCube,
  createBasicSphere,
  createBasicCylinder,
} from "@/lib/3d/model-utils";

export async function GET() {
  try {
    const cubeModel = await createBasicCube();
    const sphereModel = await createBasicSphere();
    const cylinderModel = await createBasicCylinder();

    return NextResponse.json({
      cubeModel,
      sphereModel,
      cylinderModel,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate models" },
      { status: 500 }
    );
  }
}
