const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
require("dotenv").config({ path: path.resolve(__dirname, ".env.local") });

// Extract the subdomain from NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL is not defined in the environment variables.",
  );
  process.exit(1);
}

const subdomain = new URL(supabaseUrl).hostname.split(".")[0];

// Define the output path for the generated types
const outputPath = "./types/database.types.ts";

// Run the supabase gen types command with the extracted subdomain
const command = `supabase gen types typescript --project-id ${subdomain} --schema public > ${outputPath}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing command: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Command error output: ${stderr}`);
    return;
  }
  console.log(`Types successfully generated and saved to ${outputPath}`);
});
