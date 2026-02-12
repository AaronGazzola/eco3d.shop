# Starter Kit Implementation Plan - Phase 1

IMPORTANT: Implement this complete plan. Do not skip, alter or simplify any steps. Do not change the implementation order. Do not implement the plan using multiple agents in parallel, complete each step in sequence. If you're not able to complete any of the required steps, or if you need additional information then stop and ask for clarification, don't just continue and "fill in the gaps".
Complete the process using a single agent in series, do not use multiple agents in parallel.

This is a complete step-by-step guide for building a Next.js application using the starter kit configuration files.

---

## Phase 1: Configure Tailwind and Shadcn

### Step 1.1: Install Tailwind v4

Refer to `documentation/tailwind.guide.md`:

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

Create `postcss.config.mjs`:

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### Step 1.2: Setup Global CSS

Replace the entire contents of `app/globals.css` with the complete CSS from `documentation/initial_configuration/Theme.md`:

1. Copy all content from Theme.md (including imports, CSS variables, @layer base, @theme inline, and utility classes)
2. Paste into `app/globals.css`, replacing all existing content
3. This CSS includes all theme variables for colors, typography, border radius, shadows, and spacing

### Step 1.3: Configure Custom Fonts

Update `app/layout.tsx` to import and configure the fonts as shown in `documentation/initial_configuration/Theme.md`

### Step 1.4: Install Shadcn

```bash
npx shadcn@latest init -d
```

The `-d` flag accepts all default configuration.

### Step 1.5: Install All Components

```bash
npx shadcn@latest add --all --yes
```

### Step 1.6: Apply Custom Theme Classes to Components

**Note:** This step is important and not optional. Complete the process for ALL of the shadcn components.

Move the custom toast componen template from `documentation/template_files/CustomToast.template.tsx` to `components/CustomToast.tsx`

Update ALL components in `components/ui/` to use the custom theme classes from `documentation/initial_configuration/Theme.md`. Work through each component file systematically:

**For all components:**

1. **Border Radius** - Replace Tailwind rounding classes:
   - Replace `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` → `radius`
   - Keep specific rounded classes like `rounded-full` unchanged

2. **Shadows** - Replace Tailwind shadow classes:
   - Replace `shadow`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl` → `shadow`
   - Remove `shadow-none` (default is no shadow)

3. **Borders** - Add border color class:
   - Find elements with `border` class
   - Add `border-border` class to use theme border color

4. **Focus States** - Replace focus ring classes:
   - Replace `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-ring`
   - Replace `focus:border-ring` or `focus-visible:border-ring` → `focus-border-ring`
   - Replace `focus-visible:ring-ring` → `focus-ring-color`

**For specific component types:**

5. **Checkbox & Switch components** - Add data-attribute classes:
   - On checked state elements, add `data-checked-bg-primary` for background
   - On checked state elements, add `data-checked-text-primary-foreground` for text
   - On unchecked state elements, add `data-unchecked-bg-input` for background

6. **Calendar/Date Picker components** - Add data-attribute classes:
   - On single selected date elements, add `data-selected-single-bg-primary` for background
   - On single selected date elements, add `data-selected-single-text-primary-foreground` for text
   - On range start elements, add `data-range-start-bg-primary` and `data-range-start-text-primary-foreground`
   - On range end elements, add `data-range-end-bg-primary` and `data-range-end-text-primary-foreground`
   - On range middle elements, add `data-range-middle-bg-accent` and `data-range-middle-text-accent-foreground`

---

## Next Steps

Phase 1 is now complete. To continue with Phase 2 (Supabase setup):

1. Read `documentation/starter_kit.plan.phase2.md`
2. Switch to plan mode and create a step-by-step plan from the instructions in that document
3. Follow the plan exactly as written

IMPORTANT: DO NOT PROCEED TO PHASE 2 YET. Exit plan mode and inform the user that Phase 1 is complete, then ask them if they're ready to proceed to Phase 2.
