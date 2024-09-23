export enum Notifications {
  SignInSuccess = "Sign in successful!",
  SignUpSuccess = "Sign up successful!",
  SignOutSuccess = "Sign out successful!",
  Success = "Success!",
  Error = "Error!",
  ResetPasswordSuccess = "Password reset!",
  ForgotPasswordSuccess = "Password reset link sent!",
  GetSessionError = "Error getting session.",
  GetUserError = "Error getting user.",
  AccountVerified = "Account verified!",
  Welcome = "Welcome to Eco3D!",
}

export interface Notification {
  message: string;
  style?: NotificationStyle;
  variant?: NotificationVariant;
  position?: NotificationPosition;
  duration?: number;
}

export enum NotificationStyle {
  Success = "success",
  Error = "error",
  Warning = "warning",
  Info = "info",
}

export enum NotificationVariant {
  Toast = "toast",
  Modal = "modal",
}

export enum NotificationPosition {
  TopRight = "top-right",
  TopLeft = "top-left",
  BottomRight = "bottom-right",
  BottomLeft = "bottom-left",
  TopCenter = "top-center",
  BottomCenter = "bottom-center",
}
