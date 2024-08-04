"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";

import { AuthFormType } from "@/types/auth.types";
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams";
import CollapseContainer from "@/components/CollapseContainer";
import Image from "next/image";
import { useSearchParamsContext } from "@/providers/SearchParamsProvider";
import signInWithEmailAction from "@/actions/signInWithEmailAction";
import signUpWithEmailAction from "@/actions/signUpWithEmailAction";
import forgotPasswordAction from "@/actions/forgotPasswordAction";
import resetPasswordAction from "@/actions/resetPasswordAction";
import useNotification from "@/hooks/useNotification";
import {
  NotificationPosition,
  NotificationStyle,
  Notifications,
} from "@/types/notification.types";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import configuration from "@/lib/configuration";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/AuthClientProvider";

const { SignIn, SignUp, ForgotPassword, ResetPassword } = AuthFormType;

export const SignInSchema = z.object({
  email: z.string().email("Please input a valid Email."),
  password: z.string().min(6, "Please input your Password."),
  remember: z.boolean().optional(),
});

export const SignUpSchema = z.object({
  email: z.string().email("Please input a valid Email."),
  password: z.string().min(6, "Please input your Password."),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Please input a valid Email."),
});

export const ResetPasswordSchema = z.object({
  password: z.string().min(6, "Please input your Password."),
});

export type SignInSchemaType = z.infer<typeof SignInSchema>;
export type SignUpSchemaType = z.infer<typeof SignUpSchema>;
export type ForgotPasswordSchemaType = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordSchemaType = z.infer<typeof ResetPasswordSchema>;

const getSchema = (formType: AuthFormType) => {
  switch (formType) {
    case SignIn:
      return SignInSchema;
    case SignUp:
      return SignUpSchema;
    case ForgotPassword:
      return ForgotPasswordSchema;
    case ResetPassword:
      return ResetPasswordSchema;
    default:
      return SignInSchema;
  }
};

const AuthForm = ({ formType: formTypeProp }: { formType?: AuthFormType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuth();
  const searchParams = useSearchParamsContext();
  const formTypeParam = searchParams.searchParams?.get("form");
  const [formType, setFormType] = useState<AuthFormType>(
    formTypeProp || SignIn
  );
  const router = useRouter();

  const { showNotification } = useNotification();

  const isSignUp = formType === SignUp;
  const isSignIn = formType === SignIn;
  const isForgotPassword = formType === ForgotPassword;
  const isResetPassword = formType === ResetPassword;

  const headerText = isSignUp
    ? "Sign up"
    : isForgotPassword
    ? "Forgot password"
    : isResetPassword
    ? "Reset password"
    : "Sign in";

  const submitButtonText = isSignUp
    ? "Sign up"
    : isForgotPassword
    ? "Send Link"
    : isResetPassword
    ? "Reset password"
    : "Sign in";

  const updateSearchParams = useUpdateSearchParams();
  const onChangeForm = (formType: AuthFormType) => {
    if (formTypeProp) return;
    setFormType(formType);
    updateSearchParams({
      form: formType,
    });
  };

  const form = useForm<
    Partial<
      | SignInSchemaType
      | SignUpSchemaType
      | ForgotPasswordSchemaType
      | ResetPasswordSchemaType
    >
  >({
    resolver: zodResolver(getSchema(formType)),
  });

  const onSubmit = async (values: Partial<SignInSchemaType>) => {
    setIsLoading(true);

    let res = null;
    let successMessage = Notifications.Success;
    if (isResetPassword) {
      res = await resetPasswordAction(values as ResetPasswordSchemaType);
      successMessage = Notifications.ResetPasswordSuccess;
    }
    if (isSignIn) {
      res = await signInWithEmailAction(values as SignInSchemaType);
      successMessage = Notifications.SignInSuccess;
    }
    if (isSignUp) {
      res = await signUpWithEmailAction(values as SignUpSchemaType);
      successMessage = Notifications.SignUpSuccess;
    }
    if (isForgotPassword) {
      res = await forgotPasswordAction(values as ForgotPasswordSchemaType);
      successMessage = Notifications.ForgotPasswordSuccess;
    }
    setIsLoading(false);
    if (res?.error) {
      console.error(res.error);
      showNotification({
        message: res.error || Notifications.Error,
        style: NotificationStyle.Error,
        position: NotificationPosition.TopRight,
      });
      return;
    }

    showNotification({
      message: successMessage,
      style: NotificationStyle.Success,
      position: NotificationPosition.TopRight,
    });
    // TODO: show success and email message on sign in
    if (isSignIn && res?.data) setUser(res.data);
    if (isSignIn || isResetPassword) router.push(configuration.paths.appHome);
    if (isSignUp) onChangeForm(SignIn);
    if (isForgotPassword) onChangeForm(SignIn);
  };

  useEffect(() => {
    if (formTypeProp || formTypeParam) return;
    setFormType(SignIn);
    updateSearchParams({
      form: SignIn,
    });
  }, [formTypeParam, updateSearchParams, formTypeProp]);

  return (
    <main className="flex flex-col items-center flex-grow justify-center py-10 sm:py-16 ">
      <Link href="/">
        <Image
          alt="Eco3D.shop logo"
          height={640}
          width={508}
          src="/images/logo.png"
          className="w-16 h-16"
        />
      </Link>
      <h1 className="capitalize text-xl py-2 my-6">{headerText}</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-[320px] space-y-6"
        >
          {!isResetPassword && (
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <CollapseContainer isCollapsed={isForgotPassword}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapseContainer>
          <FormItem
            className={cn(
              "space-y-4 transition-all pt-3",
              isForgotPassword && "!m-0"
            )}
          >
            {!isResetPassword && (
              <CollapseContainer isCollapsed={isForgotPassword}>
                <div className="flex justify-between items-center">
                  {/* TODO: only show rmember me when required; implement with supabase */}
                  <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                      <FormItem className="">
                        <div className="h-full w-full flex items-center">
                          <Checkbox
                            id="remember-me"
                            checked={field.value}
                            onChange={field.onChange}
                          />
                          <FormLabel
                            htmlFor="remember-me"
                            className="p-1 px-3 cursor-pointer"
                          >
                            Remember me
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="link"
                    className={cn(` transition-opacity`)}
                    onClick={() => onChangeForm(ForgotPassword)}
                  >
                    Forgot password?
                  </Button>
                </div>
              </CollapseContainer>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className={cn("w-full", isResetPassword && "mt-2")}
            >
              {isLoading && (
                <Loader2 className={cn("mr-2 h-4 w-4 animate-spin")} />
              )}
              {submitButtonText}
            </Button>

            {!isResetPassword && (
              <div className="flex items-center">
                <span className="text-sm">Or&nbsp;</span>
                <Button
                  className="p-0 m-0"
                  type="button"
                  variant="link"
                  onClick={() => onChangeForm(isSignIn ? SignUp : SignIn)}
                >
                  <span>{isSignIn ? "sign up!" : "sign in?"}&nbsp;&rarr;</span>
                </Button>
              </div>
            )}
          </FormItem>
        </form>
      </Form>
    </main>
  );
};

export default AuthForm;
