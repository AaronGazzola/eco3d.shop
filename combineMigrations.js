const fs = require("fs");
const path = require("path");

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

const files = fs
  .readdirSync(migrationsDir)
  .filter(
    (file) =>
      file.endsWith(".sql") && !file.startsWith(".") && !file.startsWith("_"),
  )
  .sort((a, b) => {
    const getTimestamp = (filename) => {
      const match = filename.match(/^(\d{14})_/);
      return match ? match[1] : "0";
    };
    return getTimestamp(a).localeCompare(getTimestamp(b));
  });

const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);

const outputFileName = `${timestamp}_combined_migrations.sql`;

const combinedContent = files
  .map((file) => {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, { encoding: "utf-8" });
    return `-- Migration: ${file}\n\n${content.trim()}\n`;
  })
  .join("\n\n");

const outputPath = path.join(process.cwd(), outputFileName);
fs.writeFileSync(outputPath, combinedContent, { encoding: "utf-8" });

console.log(`Combined migrations written to ${outputPath}`);
