import ActionButton from "@/components/layout/ActionButton";
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
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ConfirmDialog from "@/components/ux/ConfirmDialog";
import configuration from "@/configuration";
import { useUIStore } from "@/hooks/useUIStore";
import {
  useGetUser,
  useSignInWithMagicLink,
  useSignOut,
} from "@/hooks/userHooks";
import { maskEmail } from "@/lib/string.util";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Popover } from "@radix-ui/react-popover";
import { CircleUser, LogOut, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

const AuthFormPopover = () => {
  const { data: user, isPending: getUserIsPending } = useGetUser();
  const { mutate: signOut, isPending: signOutIsPending } = useSignOut();
  const { mutate: signIn, isPending: signInIsPending } =
    useSignInWithMagicLink();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const { toggleDrawer } = useUIStore();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (values: { email: string }) => {
    signIn(values.email);
  };

  const isPending = getUserIsPending || signOutIsPending || signInIsPending;

  const handleSignOut = () => {
    setShowSignOutConfirm(true);
  };

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <ActionButton
          variant="ghost"
          size="icon"
          className={cn(
            "flex justify-center items-center text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white outline-none p-2",
          )}
        >
          <CircleUser className="" />
        </ActionButton>
      </PopoverTrigger>
      <PopoverContent className="w-min border border-gray-500 text-gray-900 px-6 py-4 min-w-80">
        {user ? (
          <div className="flex flex-col items-center py-2">
            <div className="flex flex-col items-center">
              {user.email && (
                <h2 className="font-semibold text-gray-700 italic">
                  {maskEmail(user.email)}
                </h2>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-500 whitespace-nowrap flex items-center gap-2 py-1 px-2.5 hover:text-red-500 hover:border-red-500 hover:bg-transparent border-transparent mt-2"
              >
                Sign Out <LogOut className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="mt-4 border-secondary text-secondary text-base "
            >
              <Link
                href={configuration.paths.me.path}
                className="flex items-center justify-center"
                onClick={() => toggleDrawer(false)}
              >
                <PackageOpen className="w-5 h-5 mr-3" />
                <span>My orders</span>
              </Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sign in with magic link:</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ActionButton
                type="submit"
                className="w-full"
                loading={isPending}
              >
                Send link
              </ActionButton>
            </form>
          </Form>
        )}
      </PopoverContent>
      <ConfirmDialog
        title="Sign Out"
        description="Are you sure you want to sign out?"
        onConfirm={() => {
          setShowSignOutConfirm(false);
          signOut();
        }}
        onCancel={() => setShowSignOutConfirm(false)}
        confirmText="Sign Out"
        cancelText="Cancel"
        open={showSignOutConfirm}
      />
    </Popover>
  );
};

export default AuthFormPopover;
