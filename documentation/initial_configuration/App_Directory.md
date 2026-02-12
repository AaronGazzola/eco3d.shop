# App Directory

```txt
App Directory Structure:

└── app/
    ├── layout.tsx
    ├── layout.hooks.tsx
    ├── layout.stores.ts
    ├── layout.actions.ts
    ├── layout.types.ts
    ├── page.tsx
    ├── (auth)/
    │   ├── sign-in/page.tsx
    │   ├── sign-up/page.tsx
    │   ├── forgot-password/page.tsx
    │   ├── reset-password/page.tsx
    │   └── verify/page.tsx
    ├── (admin)/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── designs/page.tsx
    │   └── orders/page.tsx
    ├── editor/
    │   └── [projectId]/
    │       ├── page.tsx
    │       └── page.hooks.tsx
    ├── projects/
    │   └── page.tsx
    ├── gallery/
    │   ├── page.tsx
    │   └── [designId]/
    │       └── page.tsx
    ├── order/
    │   └── [projectId]/
    │       └── page.tsx
    ├── orders/
    │   └── page.tsx
    ├── welcome/page.tsx
    ├── terms/page.tsx
    ├── privacy/page.tsx
    ├── about/page.tsx
    ├── contact/page.tsx
    ├── welcome/
    │   └── page.hooks.tsx
    └── page.hooks.tsx

```

```txt
Route Map (Generated from App Structure):

├── /
├── /
├── /editor/[projectId]
├── /projects
├── /gallery
    └── /gallery/[designId]
├── /order/[projectId]
└── /orders

```

## Feature and Function Map

### /app/layout.tsx
**Feature: Sign out user**
- Hook: `useSignOut` → `/app/layout.hooks.tsx`
- Store: `useAuthStore` → `/app/layout.stores.ts`
- Action: `signOutAction` → `/app/layout.actions.ts`
- Type: `SignOutResult` → `/app/layout.types.ts`

**Feature: Sign out user**
- Hook: `useSignOut` → `/app/layout.hooks.tsx`
- Store: `useAuthStore` → `/app/layout.stores.ts`
- Action: `signOutAction` → `/app/layout.actions.ts`
- Type: `SignOutResult` → `/app/layout.types.ts`

### /app/layout.hooks.tsx
- `useSignOut` (used by: `/app/layout.tsx` → Sign out user)
- `useSignOut` (used by: `/app/layout.tsx` → Sign out user)

### /app/layout.stores.ts
- `useAuthStore` (used by: `/app/layout.tsx` → Sign out user)
- `useAuthStore` (used by: `/app/layout.tsx` → Sign out user)

### /app/layout.actions.ts
- `signOutAction` (used by: `/app/layout.tsx` → Sign out user)
- `signOutAction` (used by: `/app/layout.tsx` → Sign out user)

### /app/layout.types.ts
- `SignOutResult` (used by: `/app/layout.tsx` → Sign out user)
- `SignOutResult` (used by: `/app/layout.tsx` → Sign out user)

### /app/page.tsx
**Feature: Sign in with email and password**
- Hook: `useEmailSignIn` → `/app/layout.hooks.tsx`
- Store: `useAuthStore` → `/app/layout.stores.ts`
- Action: `emailSignInAction` → `/app/layout.actions.ts`
- Type: `EmailSignInInput` → `/app/layout.types.ts`

**Feature: Send magic link email**
- Hook: `useMagicLink` → `/app/layout.hooks.tsx`
- Store: `useAuthStore` → `/app/layout.stores.ts`
- Action: `sendMagicLinkAction` → `/app/layout.actions.ts`
- Type: `MagicLinkInput` → `/app/layout.types.ts`

**Feature: Create account with email and password**
- Hook: `useEmailSignUp` → `/app/layout.hooks.tsx`
- Store: `useAuthStore` → `/app/layout.stores.ts`
- Action: `emailSignUpAction` → `/app/layout.actions.ts`
- Type: `EmailSignUpInput` → `/app/layout.types.ts`

**Feature: Send magic link signup email**
- Hook: `useMagicLinkSignUp` → `/app/layout.hooks.tsx`
- Store: `useAuthStore` → `/app/layout.stores.ts`
- Action: `sendMagicLinkSignUpAction` → `/app/layout.actions.ts`
- Type: `MagicLinkSignUpInput` → `/app/layout.types.ts`

**Feature: Send password reset email**
- Hook: `usePasswordReset` → `/app/layout.hooks.tsx`
- Store: `useAuthStore` → `/app/layout.stores.ts`
- Action: `sendPasswordResetAction` → `/app/layout.actions.ts`
- Type: `PasswordResetInput` → `/app/layout.types.ts`

**Feature: Reset user password**
- Hook: `useUpdatePassword` → `/app/layout.hooks.tsx`
- Store: `useAuthStore` → `/app/layout.stores.ts`
- Action: `updatePasswordAction` → `/app/layout.actions.ts`
- Type: `UpdatePasswordInput` → `/app/layout.types.ts`

**Feature: Verify email address**
- Hook: `useVerifyEmail` → `/app/layout.hooks.tsx`
- Store: `useAuthStore` → `/app/layout.stores.ts`
- Action: `verifyEmailAction` → `/app/layout.actions.ts`
- Type: `EmailVerificationResult` → `/app/layout.types.ts`

**Feature: Complete user profile**
- Hook: `useCompleteProfile` → `/app/welcome/page.hooks.tsx`
- Store: `useProfileStore` → `/app/layout.stores.ts`
- Action: `completeProfileAction` → `/app/layout.actions.ts`
- Type: `CompleteProfileInput` → `/app/layout.types.ts`

**Feature: Upload profile picture**
- Hook: `useProfilePictureUpload` → `/app/welcome/page.hooks.tsx`
- Store: `useProfileStore` → `/app/layout.stores.ts`
- Action: `uploadProfilePictureAction` → `/app/layout.actions.ts`
- Type: `ProfilePictureUploadResult` → `/app/layout.types.ts`

**Feature: Get featured designs**
- Hook: `useFeaturedDesigns` → `/app/page.hooks.tsx`
- Store: `useDesignStore` → `/app/layout.stores.ts`
- Action: `getFeaturedDesignsAction` → `/app/layout.actions.ts`
- Type: `FeaturedDesignResult` → `/app/layout.types.ts`

**Feature: Get pending designs**
- Hook: `usePendingDesigns` → `/app/(admin)/page.tsx`
- Store: `usePendingDesignsStore` → `/app/layout.stores.ts`
- Action: `getPendingDesignsAction` → `/app/layout.actions.ts`
- Type: `PendingDesignsResult` → `/app/layout.types.ts`

**Feature: Get pending orders**
- Hook: `usePendingOrders` → `/app/(admin)/page.tsx`
- Store: `usePendingOrdersStore` → `/app/layout.stores.ts`
- Action: `getPendingOrdersAction` → `/app/layout.actions.ts`
- Type: `PendingOrdersResult` → `/app/layout.types.ts`

**Feature: Get platform metrics**
- Hook: `usePlatformMetrics` → `/app/(admin)/page.tsx`
- Store: `useMetricsStore` → `/app/layout.stores.ts`
- Action: `getPlatformMetricsAction` → `/app/layout.actions.ts`
- Type: `PlatformMetricsResult` → `/app/layout.types.ts`

**Feature: Approve design**
- Hook: `useApproveDesign` → `/app/(admin)/designs/page.tsx`
- Store: `useDesignApprovalStore` → `/app/layout.stores.ts`
- Action: `approveDesignAction` → `/app/layout.actions.ts`
- Type: `ApproveDesignResult` → `/app/layout.types.ts`

**Feature: Reject design**
- Hook: `useRejectDesign` → `/app/(admin)/designs/page.tsx`
- Store: `useDesignRejectionStore` → `/app/layout.stores.ts`
- Action: `rejectDesignAction` → `/app/layout.actions.ts`
- Type: `RejectDesignInput` → `/app/layout.types.ts`

**Feature: Get design queue**
- Hook: `useDesignQueue` → `/app/(admin)/layout.tsx`
- Store: `useDesignQueueStore` → `/app/(admin)/page.tsx`
- Action: `getDesignQueueAction` → `/app/(admin)/page.tsx`
- Type: `DesignQueueResult` → `/app/(admin)/page.tsx`

**Feature: Approve print order**
- Hook: `useApprovePrintOrder` → `/app/(admin)/layout.tsx`
- Store: `usePrintApprovalStore` → `/app/(admin)/orders/page.tsx`
- Action: `approvePrintOrderAction` → `/app/(admin)/orders/page.tsx`
- Type: `ApprovePrintOrderResult` → `/app/(admin)/orders/page.tsx`

**Feature: Update order status**
- Hook: `useUpdateOrderStatus` → `/app/(admin)/layout.tsx`
- Store: `useOrderStatusUpdateStore` → `/app/(admin)/orders/page.tsx`
- Action: `updateOrderStatusAction` → `/app/(admin)/orders/page.tsx`
- Type: `UpdateOrderStatusInput` → `/app/(admin)/orders/page.tsx`

**Feature: Adjust order pricing**
- Hook: `useAdjustOrderPricing` → `/app/(admin)/layout.tsx`
- Store: `useOrderPricingStore` → `/app/(admin)/orders/page.tsx`
- Action: `adjustOrderPricingAction` → `/app/(admin)/orders/page.tsx`
- Type: `AdjustPricingInput` → `/app/(admin)/orders/page.tsx`

**Feature: Get print queue**
- Hook: `usePrintQueue` → `/app/(admin)/layout.tsx`
- Store: `usePrintQueueStore` → `/app/(admin)/orders/page.tsx`
- Action: `getPrintQueueAction` → `/app/(admin)/orders/page.tsx`
- Type: `PrintQueueResult` → `/app/(admin)/orders/page.tsx`

**Feature: Submit contact form**
- Hook: `useContactSubmission` → `/app/contact/page.tsx`
- Store: `useContactFormStore` → `/app/contact/page.tsx`
- Action: `submitContactFormAction` → `/app/contact/page.tsx`
- Type: `ContactFormInput` → `/app/contact/page.tsx`

### /app/(auth)/sign-in/page.tsx
*Not applicable*

### /app/(auth)/sign-up/page.tsx
*Not applicable*

### /app/(auth)/forgot-password/page.tsx
*Not applicable*

### /app/(auth)/reset-password/page.tsx
*Not applicable*

### /app/(auth)/verify/page.tsx
*Not applicable*

### /app/(admin)/layout.tsx
*No features defined*

### /app/(admin)/page.tsx
*No features defined*

### /app/(admin)/designs/page.tsx
*Not applicable*

### /app/(admin)/orders/page.tsx
*Not applicable*

### /app/editor/[projectId]/page.tsx
**Feature: Save project progress**
- Hook: `useSaveProject` → `/app/editor/[projectId]/page.hooks.tsx`
- Store: `useProjectStore` → `/app/editor/[projectId]/page.hooks.tsx`
- Action: `saveProjectAction` → `/app/editor/[projectId]/page.hooks.tsx`
- Type: `SaveProjectResult` → `/app/editor/[projectId]/page.hooks.tsx`

**Feature: Export design for printing**
- Hook: `useExportDesign` → `/app/editor/[projectId]/page.hooks.tsx`
- Store: `useExportStore` → `/app/editor/[projectId]/page.hooks.tsx`
- Action: `exportDesignAction` → `/app/editor/[projectId]/page.hooks.tsx`
- Type: `ExportDesignResult` → `/app/editor/[projectId]/page.hooks.tsx`

**Feature: Get project details**
- Hook: `useProjectDetails` → `/app/editor/[projectId]/page.hooks.tsx`
- Store: `useProjectDetailsStore` → `/app/editor/[projectId]/page.hooks.tsx`
- Action: `getProjectDetailsAction` → `/app/editor/[projectId]/page.hooks.tsx`
- Type: `ProjectDetails` → `/app/editor/[projectId]/page.hooks.tsx`

**Feature: Update project settings**
- Hook: `useUpdateProjectSettings` → `/app/editor/[projectId]/page.hooks.tsx`
- Store: `useProjectSettingsStore` → `/app/editor/[projectId]/page.hooks.tsx`
- Action: `updateProjectSettingsAction` → `/app/editor/[projectId]/page.hooks.tsx`
- Type: `UpdateProjectSettingsInput` → `/app/editor/[projectId]/page.hooks.tsx`

### /app/editor/[projectId]/page.hooks.tsx
- `useSaveProject` (used by: `/app/editor/[projectId]/page.tsx` → Save project progress)
- `useProjectStore` (used by: `/app/editor/[projectId]/page.tsx` → Save project progress)
- `saveProjectAction` (used by: `/app/editor/[projectId]/page.tsx` → Save project progress)
- `SaveProjectResult` (used by: `/app/editor/[projectId]/page.tsx` → Save project progress)
- `useExportDesign` (used by: `/app/editor/[projectId]/page.tsx` → Export design for printing)
- `useExportStore` (used by: `/app/editor/[projectId]/page.tsx` → Export design for printing)
- `exportDesignAction` (used by: `/app/editor/[projectId]/page.tsx` → Export design for printing)
- `ExportDesignResult` (used by: `/app/editor/[projectId]/page.tsx` → Export design for printing)
- `useProjectDetails` (used by: `/app/editor/[projectId]/page.tsx` → Get project details)
- `useProjectDetailsStore` (used by: `/app/editor/[projectId]/page.tsx` → Get project details)
- `getProjectDetailsAction` (used by: `/app/editor/[projectId]/page.tsx` → Get project details)
- `ProjectDetails` (used by: `/app/editor/[projectId]/page.tsx` → Get project details)
- `useUpdateProjectSettings` (used by: `/app/editor/[projectId]/page.tsx` → Update project settings)
- `useProjectSettingsStore` (used by: `/app/editor/[projectId]/page.tsx` → Update project settings)
- `updateProjectSettingsAction` (used by: `/app/editor/[projectId]/page.tsx` → Update project settings)
- `UpdateProjectSettingsInput` (used by: `/app/editor/[projectId]/page.tsx` → Update project settings)

### /app/projects/page.tsx
**Feature: Get user projects**
- Hook: `useUserProjects` → `/app/projects/page.tsx`
- Store: `useProjectsStore` → `/app/projects/page.tsx`
- Action: `getUserProjectsAction` → `/app/projects/page.tsx`
- Type: `UserProjectsResult` → `/app/projects/page.tsx`

**Feature: Create new project**
- Hook: `useCreateProject` → `/app/projects/page.tsx`
- Store: `useNewProjectStore` → `/app/projects/page.tsx`
- Action: `createProjectAction` → `/app/projects/page.tsx`
- Type: `CreateProjectInput` → `/app/projects/page.tsx`

**Feature: Delete project**
- Hook: `useDeleteProject` → `/app/projects/page.tsx`
- Store: `useProjectDeleteStore` → `/app/projects/page.tsx`
- Action: `deleteProjectAction` → `/app/projects/page.tsx`
- Type: `DeleteProjectResult` → `/app/projects/page.tsx`

### /app/gallery/page.tsx
**Feature: Get published designs**
- Hook: `usePublishedDesigns` → `/app/gallery/page.tsx`
- Store: `useGalleryStore` → `/app/gallery/page.tsx`
- Action: `getPublishedDesignsAction` → `/app/gallery/page.tsx`
- Type: `PublishedDesignsResult` → `/app/gallery/page.tsx`

**Feature: Filter designs by category**
- Hook: `useDesignFilter` → `/app/gallery/page.tsx`
- Store: `useFilterStore` → `/app/gallery/page.tsx`
- Action: `filterDesignsAction` → `/app/gallery/page.tsx`
- Type: `DesignFilterInput` → `/app/gallery/page.tsx`

**Feature: Sort designs**
- Hook: `useDesignSort` → `/app/gallery/page.tsx`
- Store: `useSortStore` → `/app/gallery/page.tsx`
- Action: `sortDesignsAction` → `/app/gallery/page.tsx`
- Type: `DesignSortInput` → `/app/gallery/page.tsx`

### /app/gallery/[designId]/page.tsx
**Feature: Get design details**
- Hook: `useDesignDetails` → `/app/gallery/[designId]/page.tsx`
- Store: `useDesignDetailsStore` → `/app/gallery/[designId]/page.tsx`
- Action: `getDesignDetailsAction` → `/app/gallery/[designId]/page.tsx`
- Type: `DesignDetailsResult` → `/app/gallery/[designId]/page.tsx`

**Feature: Calculate print pricing**
- Hook: `usePrintPricing` → `/app/gallery/[designId]/page.tsx`
- Store: `usePricingStore` → `/app/gallery/[designId]/page.tsx`
- Action: `calculatePrintPriceAction` → `/app/gallery/[designId]/page.tsx`
- Type: `PrintPricingResult` → `/app/gallery/[designId]/page.tsx`

**Feature: Create print order**
- Hook: `useCreatePrintOrder` → `/app/gallery/[designId]/page.tsx`
- Store: `usePrintOrderStore` → `/app/layout.stores.ts`
- Action: `createPrintOrderAction` → `/app/layout.actions.ts`
- Type: `CreatePrintOrderInput` → `/app/layout.types.ts`

### /app/order/[projectId]/page.tsx
**Feature: Submit print order**
- Hook: `useSubmitPrintOrder` → `/app/order/[projectId]/page.tsx`
- Store: `useOrderSubmissionStore` → `/app/layout.stores.ts`
- Action: `submitPrintOrderAction` → `/app/layout.actions.ts`
- Type: `SubmitOrderResult` → `/app/layout.types.ts`

**Feature: Calculate order total**
- Hook: `useCalculateOrderTotal` → `/app/order/[projectId]/page.tsx`
- Store: `useOrderTotalStore` → `/app/layout.stores.ts`
- Action: `calculateOrderTotalAction` → `/app/layout.actions.ts`
- Type: `OrderTotalResult` → `/app/layout.types.ts`

**Feature: Update order options**
- Hook: `useUpdateOrderOptions` → `/app/order/[projectId]/page.tsx`
- Store: `useOrderOptionsStore` → `/app/layout.stores.ts`
- Action: `updateOrderOptionsAction` → `/app/layout.actions.ts`
- Type: `UpdateOrderOptionsInput` → `/app/layout.types.ts`

### /app/orders/page.tsx
**Feature: Get user orders**
- Hook: `useUserOrders` → `/app/orders/page.tsx`
- Store: `useOrderHistoryStore` → `/app/layout.stores.ts`
- Action: `getUserOrdersAction` → `/app/layout.actions.ts`
- Type: `UserOrdersResult` → `/app/layout.types.ts`

**Feature: Get order status**
- Hook: `useOrderStatus` → `/app/orders/page.tsx`
- Store: `useOrderStatusStore` → `/app/layout.stores.ts`
- Action: `getOrderStatusAction` → `/app/layout.actions.ts`
- Type: `OrderStatusResult` → `/app/layout.types.ts`

**Feature: Get tracking information**
- Hook: `useTrackingInfo` → `/app/orders/page.tsx`
- Store: `useTrackingStore` → `/app/layout.stores.ts`
- Action: `getTrackingInfoAction` → `/app/layout.actions.ts`
- Type: `TrackingInfoResult` → `/app/layout.types.ts`

### /app/welcome/page.tsx
*Not applicable*

### /app/terms/page.tsx
*Not applicable*

### /app/privacy/page.tsx
*Not applicable*

### /app/about/page.tsx
*Not applicable*

### /app/contact/page.tsx
*Not applicable*

### /app/welcome/page.hooks.tsx
- `useCompleteProfile` (used by: `/app/page.tsx` → Complete user profile)
- `useProfilePictureUpload` (used by: `/app/page.tsx` → Upload profile picture)

### /app/page.hooks.tsx
- `useFeaturedDesigns` (used by: `/app/page.tsx` → Get featured designs)

