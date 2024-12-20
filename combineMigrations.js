const fs = require("fs");
const path = require("path");

const migrationsDir = path.join(__dirname, "supabase", "migrations");
const files = fs.readdirSync(migrationsDir).sort();
const timestamp = new Date()
  .toISOString()
  .replace(/[^0-9]/g, "")
  .slice(0, 14);
const outputFileName = `${timestamp}_combined_migrations.sql`;
const combinedContent = files
  .map((file) => {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    return `-- Migration: ${file}\n\n${content}\n`;
  })
  .join("\n");

const outputPath = path.join(__dirname, outputFileName);
fs.writeFileSync(outputPath, combinedContent);
console.log(`Combined migrations written to ${outputPath}`);
