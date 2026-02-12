import { createBasicCube, createBasicSphere, createBasicCylinder } from "../lib/3d/model-utils";

async function generateSampleModels() {
  try {
    const cube = await createBasicCube();
    const sphere = await createBasicSphere();
    const cylinder = await createBasicCylinder();

    return {
      cube,
      sphere,
      cylinder,
    };
  } catch (error) {
    console.error("Error generating models:", error);
    throw error;
  }
}

generateSampleModels()
  .then((models) => {
    console.log("Sample models generated successfully!");
    console.log("Copy the following to seed.ts:");
    console.log(JSON.stringify(models, null, 2));
  })
  .catch((error) => {
    console.error("Failed to generate sample models:", error);
    process.exit(1);
  });
