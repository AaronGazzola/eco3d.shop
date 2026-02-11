<!-- component-READMEComponent -->

# Eco3d.shop

Eco3d.shop is your creative gateway to sustainable 3D design and printing. Create custom 3D models right in your browser and bring them to life using environmentally-friendly, biodegradable materials. Whether you're designing personal items, gifts, or functional pieces, our platform makes it easy to turn your ideas into reality without harming the planet.

Our community-driven platform lets you save multiple projects, share your designs with others, and order high-quality prints in your choice of sizes and colors. Each creation is carefully reviewed to ensure perfect printability, and you can track your order from approval to delivery. With eco-friendly materials that are both durable and naturally decomposable, you can enjoy your custom creations while staying true to environmental values.

## Layouts

### Main Layout

**Components:** Header (app title, navigation, profile menu), Left Sidebar (navigation, profile menu), Footer (app title, legal links)

**Pages using this layout:**
- Home (`/`)
- 3D Editor (`/editor/[projectId]`)
- My Projects (`/projects`)
- Community Gallery (`/gallery`)
- Design Details (`/gallery/[designId]`)
- Print Order (`/order/[projectId]`)
- My Orders (`/orders`)

### Admin Layout

**Components:** Header (app title, profile menu, sticky, sidebar toggle), Left Sidebar (app title, navigation, profile menu)

**Pages using this layout:**
- Admin Dashboard (`/admin`)
- Admin Design Review (`/admin/designs`)
- Admin Order Review (`/admin/orders`)

## Pages

### Sign In (`/sign-in`)

**Access:** 🌐 Anon


Users can select between email only sign in to receive a magic link for passwordless sign-in, or email and password sign in

### Sign Up (`/sign-up`)

**Access:** 🌐 Anon


Users can select between creating an account with email only via magic link sign up, or email and password sign up

### Forgot Password (`/forgot-password`)

**Access:** 🌐 Anon


Where users request a password reset link

### Reset Password (`/reset-password`)

**Access:** 🌐 Anon


Where users set a new password after clicking the reset link

### Verify Email (`/verify`)

**Access:** 🌐 Anon


Email verification page that displays a message informing users to check their inbox and click the verification link to complete their account setup and sign in.

### Welcome (`/welcome`)

**Access:** 🔐 Auth | 👑 Admin


First-time user profile setup after initial sign in. All relevant profile data is collected

### Home (`/`)

**Access:** 🌐 Anon | 🔐 Auth | 👑 Admin
**Layouts:** Main Layout


Landing page showcasing the 3D design platform, featured community designs, and biodegradable printing options. Includes call-to-action buttons for getting started with design creation.

### 3D Editor (`/editor/[projectId]`)

**Access:** 🔐 Auth | 👑 Admin
**Layouts:** Main Layout


Browser-based 3D modeling interface where users create and edit their designs. Includes tools for modeling, saving progress, and preparing designs for printing.

### My Projects (`/projects`)

**Access:** 🔐 Auth | 👑 Admin
**Layouts:** Main Layout


Dashboard showing user's saved 3D design projects, with options to create new projects, edit existing ones, or proceed to ordering prints.

### Community Gallery (`/gallery`)

**Access:** 🌐 Anon | 🔐 Auth | 👑 Admin
**Layouts:** Main Layout


Public gallery of approved community designs, with filtering options and ability to view details or start a print order from published designs.

### Design Details (`/gallery/[designId]`)

**Access:** 🌐 Anon | 🔐 Auth | 👑 Admin
**Layouts:** Main Layout


Detailed view of a published design showing preview, creator details, sizing options, and print ordering interface.

### Print Order (`/order/[projectId]`)

**Access:** 🔐 Auth | 👑 Admin
**Layouts:** Main Layout


Order configuration page where users select print size, filament colors, and review pricing before submitting for admin approval.

### My Orders (`/orders`)

**Access:** 🔐 Auth | 👑 Admin
**Layouts:** Main Layout


User dashboard showing order history, current order statuses, and tracking information for shipped items.

### Admin Dashboard (`/admin`)

**Access:** 👑 Admin
**Layouts:** Admin Layout


Overview dashboard for administrators showing pending design publications, print orders requiring review, and key platform metrics.

### Admin Design Review (`/admin/designs`)

**Access:** 👑 Admin
**Layouts:** Admin Layout


Interface for admins to review and approve community designs for publication, ensuring quality and appropriateness.

### Admin Order Review (`/admin/orders`)

**Access:** 👑 Admin
**Layouts:** Admin Layout


Admin interface for reviewing print orders, verifying design printability, finalizing pricing, and managing the printing queue.

### Terms and Conditions (`/terms`)

**Access:** 🌐 Anon | 🔐 Auth | 👑 Admin


Legal terms and conditions governing the use of the service, including user responsibilities, acceptable use policy, and liability disclaimers

### Privacy Policy (`/privacy`)

**Access:** 🌐 Anon | 🔐 Auth | 👑 Admin


Privacy policy detailing how user data is collected, used, stored, and protected, including information about cookies and third-party services

### About (`/about`)

**Access:** 🌐 Anon | 🔐 Auth | 👑 Admin


Information about the company or organization, mission statement, team information, and company history

### Contact (`/contact`)

**Access:** 🌐 Anon | 🔐 Auth | 👑 Admin


Contact page with email form for inquiries and business contact details including address, phone number, and support email

## Authentication & Access Control

**Authentication Methods:** Email & Password, Magic Link

**Access Levels:**
- 🌐 Anonymous: 12 pages
- 🔐 Authenticated: 12 pages
- 👑 Admin: 15 pages

**Page Access:**

- **Sign In** (`/sign-in`) - 🌐 Anon
- **Sign Up** (`/sign-up`) - 🌐 Anon
- **Forgot Password** (`/forgot-password`) - 🌐 Anon
- **Reset Password** (`/reset-password`) - 🌐 Anon
- **Verify Email** (`/verify`) - 🌐 Anon
- **Welcome** (`/welcome`) - 🔐 Auth, 👑 Admin
- **Home** (`/`) - 🌐 Anon, 🔐 Auth, 👑 Admin
- **3D Editor** (`/editor/[projectId]`) - 🔐 Auth, 👑 Admin
- **My Projects** (`/projects`) - 🔐 Auth, 👑 Admin
- **Community Gallery** (`/gallery`) - 🌐 Anon, 🔐 Auth, 👑 Admin
- **Design Details** (`/gallery/[designId]`) - 🌐 Anon, 🔐 Auth, 👑 Admin
- **Print Order** (`/order/[projectId]`) - 🔐 Auth, 👑 Admin
- **My Orders** (`/orders`) - 🔐 Auth, 👑 Admin
- **Admin Dashboard** (`/admin`) - 👑 Admin
- **Admin Design Review** (`/admin/designs`) - 👑 Admin
- **Admin Order Review** (`/admin/orders`) - 👑 Admin
- **Terms and Conditions** (`/terms`) - 🌐 Anon, 🔐 Auth, 👑 Admin
- **Privacy Policy** (`/privacy`) - 🌐 Anon, 🔐 Auth, 👑 Admin
- **About** (`/about`) - 🌐 Anon, 🔐 Auth, 👑 Admin
- **Contact** (`/contact`) - 🌐 Anon, 🔐 Auth, 👑 Admin

## Getting Started

Visit Eco3d.shop and create your free account using either your email address or our quick magic link option. Once logged in, you'll have immediate access to our browser-based 3D editor where you can start designing your first project.

After creating your design, save it to your personal dashboard and choose whether to keep it private or submit it to our community gallery. When you're ready to bring your creation to life, simply select your preferred size and colors, submit for review, and complete your payment once approved. You can track the entire process from your dashboard, from order confirmation to delivery.
