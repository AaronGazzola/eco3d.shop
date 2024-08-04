"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { AuthFormType } from "@/types/auth.types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import configuration from "@/lib/configuration";
import { comfortaa } from "@/styles/fonts";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Menu,
  Palette,
  PanelRightClose,
  Settings,
  Settings2,
  SquareChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Direction } from "@/types/util.types";
const { SignIn, SignUp, ForgotPassword, ResetPassword } = AuthFormType;
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export function Drawer({
  side = Direction.Left,
}: {
  side?: Direction.Left | Direction.Right;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [formType, setFormType] = useState<AuthFormType>(SignIn);

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
    // setIsLoading(true);
    // let res = null;
    // let successMessage = Notifications.Success;
    // if (isResetPassword) {
    //   res = await resetPasswordAction(values as ResetPasswordSchemaType);
    //   successMessage = Notifications.ResetPasswordSuccess;
    // }
    // if (isSignIn) {
    //   res = await signInWithEmailAction(values as SignInSchemaType);
    //   successMessage = Notifications.SignInSuccess;
    // }
    // if (isSignUp) {
    //   res = await signUpWithEmailAction(values as SignUpSchemaType);
    //   successMessage = Notifications.SignUpSuccess;
    // }
    // if (isForgotPassword) {
    //   res = await forgotPasswordAction(values as ForgotPasswordSchemaType);
    //   successMessage = Notifications.ForgotPasswordSuccess;
    // }
    // setIsLoading(false);
    // if (res?.error) {
    //   console.error(res.error);
    //   showNotification({
    //     message: res.error || Notifications.Error,
    //     style: NotificationStyle.Error,
    //     position: NotificationPosition.TopRight,
    //   });
    //   return;
    // }
    // showNotification({
    //   message: successMessage,
    //   style: NotificationStyle.Success,
    //   position: NotificationPosition.TopRight,
    // });
    // // TODO: show success and email message on sign in
    // if (isSignIn && res?.data) setUser(res.data);
    // if (isSignIn || isResetPassword) router.push(configuration.paths.appHome);
    // if (isSignUp) onChangeForm(SignIn);
    // if (isForgotPassword) onChangeForm(SignIn);
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => setIsOpen(open)}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="p-4 h-12 rounded-tr-none hover:bg-gray-500/50 px-2 sm:px-4"
        >
          <Avatar className="w-7 h-7">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>Az</AvatarFallback>
          </Avatar>
        </Button>
        {/* <Button
          value="icon"
          size="sm"
          variant="outline"
          className="border-none dark:text-gray-400 dark:hover:text-white border border-white h-10 mb-0.5"
        >
          <Menu className="w-6 h-6" />
        </Button> */}
      </SheetTrigger>
      <SheetContent
        side={side}
        showCloseButton={false}
        className="!w-full !max-w-md gap-6 flex flex-col border-l border-gray-600"
      >
        <SheetHeader>
          <div className="w-full flex justify-between items-center">
            <Link
              href={configuration.paths.appHome}
              className="flex items-center gap-4 "
              onClick={() => setIsOpen(false)}
            >
              <Image
                src="/images/logo.png"
                alt="Eco3D.shop logo"
                width={640}
                height={508}
                className="w-7"
              />
              <h1
                className={cn(
                  "text-gray-100 text-2xl tracking-wider font-black",
                  comfortaa.className
                )}
              >
                Eco3D.shop
              </h1>
            </Link>
            <div className="flex items-center gap-2 -mr-2">
              <DropdownMenu modal>
                <DropdownMenuTrigger asChild>
                  <Button
                    value="icon"
                    size="sm"
                    variant="outline"
                    className="border-none dark:text-gray-400 dark:hover:text-white border border-white h-10 mb-0.5"
                  >
                    <Settings2 className="w-6 h-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div>test</div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                value="icon"
                size="sm"
                variant="outline"
                className="border-none dark:text-gray-400 dark:hover:text-white border border-white h-10 mb-0.5 outline-none"
                onClick={() => setIsOpen(false)}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </SheetHeader>
        <SheetTitle className="">Welcome!</SheetTitle>
        <SheetDescription className="font-medium">
          Please enter your email or select a provider to sign in.
        </SheetDescription>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full  space-y-6"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      // autoFocus
                      placeholder="Email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <div className="flex justify-center w-full items-center gap-5">
          <hr className="w-1/4 border-gray-500" />
          <span className="mx-2 text-gray-500">or</span>
          <hr className="w-1/4 border-gray-500" />
        </div>
        <div className="flex items-center justify-center w-full  gap-6">
          {/* <div className="w-14 h-14 rounded-full flex items-center justify-center">
            <AppleIcon />
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center">
            <GithubIcon />
          </div> */}
        </div>
      </SheetContent>
    </Sheet>
  );
}
