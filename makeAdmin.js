require("dotenv").config({ path: "./.env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const devPhone = process.env.DEV_PHONE_NUMBER;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function grantAdminStatus(email) {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    const users = data.users;
    const user = users.find((u) => u.email === email);
    if (!user) {
      console.error("User not found");
      return;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: { roles: ["super-admin", "admin"] },
      }
    );
    if (updateError) {
      console.error("Error updating admin status:", updateError);
    } else {
      console.log("Admin status granted successfully");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

const phone = process.argv[2];

grantAdminStatus(phone || devPhone);
