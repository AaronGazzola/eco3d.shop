require("dotenv").config({ path: "./.env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function grantAdminStatus(email) {
  try {
    // Fetch the user from the Supabase Auth users
    const { data: usersData, error: listUsersError } =
      await supabase.auth.admin.listUsers();
    if (listUsersError) throw listUsersError;

    const user = usersData.users.find(u => u.email === email);
    if (!user) return console.error("User not found");

    // Check if the user already has the admin role in the user_roles table
    const { data: roles, error: roleCheckError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (roleCheckError)
      return console.error("Error checking user roles:", roleCheckError);

    if (roles && !!roles.length) return console.log("User is already an admin");

    // Insert the admin role for the user into the user_roles table
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert([{ user_id: user.id, role: "admin" }]);

    if (roleError) {
      console.error("Error granting admin role:", roleError);
      return;
    }

    console.log("Admin role granted successfully");

    const { error: reAuthError } = await supabase.auth.signInWithOtp({
      email,
    });

    if (reAuthError) {
      console.error("Error forcing JWT update via magic link:", reAuthError);
    } else {
      console.log("Magic link sent to reissue JWT with updated role");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

const email = process.argv[2];
grantAdminStatus(email);
