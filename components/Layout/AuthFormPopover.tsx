import ActionButton from "@/components/Layout/ActionButton";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useGetUser,
  useSignInWithMagicLink,
  useSignOut,
} from "@/hooks/userHooks";
import { maskEmail } from "@/lib/util/string.util";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Popover } from "@radix-ui/react-popover";
import { CircleUser } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

const AuthFormPopover = () => {
  const { data: user, isPending: getUserIsPending } = useGetUser();
  const { mutate: signOut, isPending: signOutIsPending } = useSignOut();
  const { mutate: signIn, isPending: signInIsPending } =
    useSignInWithMagicLink();
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

  return (
    <Popover>
      <PopoverTrigger>
        <ActionButton
          variant="ghost"
          size="icon"
          className={cn(
            "flex justify-center items-center text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white outline-none p-2"
          )}
        >
          <CircleUser className="" />
        </ActionButton>
      </PopoverTrigger>
      <PopoverContent className="border border-gray-500">
        {user ? (
          <div className="flex flex-col items-center">
            {user.email && <h2 className="">{maskEmail(user.email)}</h2>}
            <ActionButton
              onClick={() => signOut()}
              isPending={isPending}
              className="w-full"
            >
              Sign out
            </ActionButton>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel> Sign in with magic link:</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ActionButton
                type="submit"
                className="w-full"
                isPending={isPending}
              >
                Send link
              </ActionButton>
            </form>
          </Form>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AuthFormPopover;
