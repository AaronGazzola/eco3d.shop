import type { Database } from "@/supabase/types";
import { createClient } from "@supabase/supabase-js";
import type { ModelData } from "../app/layout.types";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const cubeModel: ModelData = {
  type: "scene-graph",
  objects: [
    {
      id: "cube-1",
      type: "cube",
      position: [0, 0.5, 0],
      rotation: [0, 0.5, 0],
      scale: [1, 1, 1],
      color: "#4ade80",
    },
  ],
  metadata: {
    objectCount: 1,
  },
};

const sphereModel: ModelData = {
  type: "scene-graph",
  objects: [
    {
      id: "sphere-1",
      type: "sphere",
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#60a5fa",
    },
  ],
  metadata: {
    objectCount: 1,
  },
};

const cylinderModel: ModelData = {
  type: "scene-graph",
  objects: [
    {
      id: "cylinder-1",
      type: "cylinder",
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#f472b6",
    },
  ],
  metadata: {
    objectCount: 1,
  },
};

async function seed() {
  console.log("Starting database seed...");

  const testUsers = [
    {
      email: "admin@gazzola.dev",
      password: "Password123!",
      displayName: "Admin User",
      role: "super-admin" as const,
    },
    {
      email: "designer1@example.com",
      password: "Password123!",
      displayName: "Alice Designer",
      role: "user" as const,
    },
    {
      email: "customer1@example.com",
      password: "Password123!",
      displayName: "Bob Customer",
      role: "user" as const,
    },
  ];

  const createdUsers: Array<{
    userId: string;
    email: string;
    displayName: string;
    role: "user" | "admin" | "super-admin";
  }> = [];

  for (const userData of testUsers) {
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          display_name: userData.displayName,
        },
      });

    if (authError) {
      console.error(`Error creating user ${userData.email}:`, authError);
      continue;
    }

    console.log(`Created auth user: ${userData.email}`);

    if (authData.user) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let profile = null;
      let attempts = 0;
      while (!profile && attempts < 5) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", authData.user.id)
          .single();

        if (data) {
          profile = data;
        } else if (error && error.code !== "PGRST116") {
          console.error(
            `Error fetching profile for ${userData.email}:`,
            error
          );
          break;
        }

        if (!profile) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (profile && userData.role !== "user") {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ role: userData.role })
          .eq("user_id", authData.user.id);

        if (updateError) {
          console.error(
            `Error updating role for ${userData.email}:`,
            updateError
          );
        } else {
          console.log(`Updated role to ${userData.role} for ${userData.email}`);
        }
      }

      createdUsers.push({
        userId: authData.user.id,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
      });
    }
  }

  const designer = createdUsers.find((u) => u.email === "designer1@example.com");
  const customer = createdUsers.find((u) => u.email === "customer1@example.com");

  if (designer) {
    const { data: project1, error: projectError1 } = await supabase
      .from("projects")
      .insert({
        user_id: designer.userId,
        title: "Green Cube",
        description: "A simple green cube for demonstrating 3D design",
        model_data: cubeModel,
        settings: { color: "green" },
        is_public: true,
      })
      .select()
      .single();

    if (projectError1) {
      console.error("Error creating project 1:", projectError1);
    } else {
      console.log("Created project: Green Cube");

      if (project1) {
        const { error: designError } = await supabase
          .from("published_designs")
          .insert({
            user_id: designer.userId,
            project_id: project1.id,
            title: "Green Cube",
            description: "A vibrant green cube perfect for learning 3D design basics",
            preview_url: "",
            model_data: cubeModel,
            configuration: { sizes: ["small", "medium", "large"] },
            status: "published",
          });

        if (designError) {
          console.error("Error creating published design:", designError);
        } else {
          console.log("Published design: Green Cube");
        }
      }
    }

    const { data: project2, error: projectError2 } = await supabase
      .from("projects")
      .insert({
        user_id: designer.userId,
        title: "Blue Sphere",
        description: "A smooth blue sphere",
        model_data: sphereModel,
        settings: { color: "blue" },
        is_public: true,
      })
      .select()
      .single();

    if (projectError2) {
      console.error("Error creating project 2:", projectError2);
    } else {
      console.log("Created project: Blue Sphere");

      if (project2) {
        const { error: designError2 } = await supabase
          .from("published_designs")
          .insert({
            user_id: designer.userId,
            project_id: project2.id,
            title: "Blue Sphere",
            description: "A perfectly smooth blue sphere for decorative purposes",
            preview_url: "",
            model_data: sphereModel,
            configuration: { sizes: ["small", "medium"] },
            status: "published",
          });

        if (designError2) {
          console.error("Error creating published design 2:", designError2);
        } else {
          console.log("Published design: Blue Sphere");
        }
      }
    }

    const { error: projectError3 } = await supabase
      .from("projects")
      .insert({
        user_id: designer.userId,
        title: "Pink Cylinder",
        description: "A sleek pink cylinder design",
        model_data: cylinderModel,
        settings: { color: "pink" },
        is_public: false,
      });

    if (projectError3) {
      console.error("Error creating project 3:", projectError3);
    } else {
      console.log("Created project: Pink Cylinder");
    }
  }

  if (customer && designer) {
    const { data: order, error: orderError } = await supabase
      .from("print_orders")
      .insert({
        user_id: customer.userId,
        status: "pending",
        total_amount: 45.99,
        shipping_address: {
          street: "123 Main St",
          city: "Sydney",
          state: "NSW",
          postcode: "2000",
          country: "Australia",
        },
        payment_status: "paid",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
    } else if (order) {
      console.log("Created print order");

      const { error: itemError } = await supabase.from("order_items").insert([
        {
          order_id: order.id,
          user_id: customer.userId,
          size: "medium",
          colors: ["blue", "white"],
          quantity: 2,
          unit_price: 22.99,
        },
      ]);

      if (itemError) {
        console.error("Error creating order items:", itemError);
      } else {
        console.log("Created order items");
      }
    }
  }

  const { error: contactError } = await supabase
    .from("contact_submissions")
    .insert({
      name: "Jane Smith",
      email: "jane@example.com",
      subject: "Question about custom orders",
      message:
        "Hi, I'm interested in ordering a custom design. What's the process?",
      status: "unread",
    });

  if (contactError) {
    console.error("Error creating contact submission:", contactError);
  } else {
    console.log("Created contact submission");
  }

  console.log("Seed complete!");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
