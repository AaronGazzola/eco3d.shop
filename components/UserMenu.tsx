"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import useSupabase from "@/hooks/useSupabase";
import { useGetUser } from "@/hooks/userHooks";

const UserMenu = () => {
  const { data: user } = useGetUser();
  const supabase = useSupabase();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [userMenuIsOpen, setUserMenuIsOpen] = useState(false);
  const [themeMenuIsOpen, setThemeMenuIsOpen] = useState(false);
  const [signOutAlertIsOpen, setSignOutAlertIsOpen] = useState(false);

  const onUsetMenuOpenChange = (open: boolean) => {
    if (themeMenuIsOpen || signOutAlertIsOpen) return;
    setUserMenuIsOpen(open);
  };

  const onThemeMenuOpenChange = (open: boolean) => {
    setThemeMenuIsOpen(open);
  };

  const onSignOutAlertIsOpenChange = (open: boolean) => {
    setSignOutAlertIsOpen(open);
  };

  const onSignOut = () => {
    supabase.auth.signOut();
  };

  return (
    <DropdownMenu
      open={userMenuIsOpen}
      onOpenChange={onUsetMenuOpenChange}
      modal={false}
    >
      <DropdownMenuTrigger>
        <Avatar className="w-7 h-7">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>Az</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
        {user ? (
          <AlertDialog
            open={signOutAlertIsOpen}
            onOpenChange={onSignOutAlertIsOpenChange}
          >
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="cursor-pointer">
                Sign out
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onSignOut}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <DropdownMenuItem className="cursor-pointer">
            <Link
              className="w-full"
              href="/auth?form=sign-in"
            >
              Sign in
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <div className="flex items-center w-full justify-between">
            <Switch
              id="theme"
              checked={resolvedTheme === "dark"}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
            />
            <DropdownMenu
              open={themeMenuIsOpen}
              onOpenChange={onThemeMenuOpenChange}
            >
              <DropdownMenuTrigger>
                <Button
                  variant="outline"
                  size="icon"
                  className="flex justify-center items-center"
                >
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 " />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setTheme("light")}
                >
                  <div className="flex items-center gap-2">
                    Light
                    {theme === "light" && <Check className="w-3" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setTheme("dark")}
                >
                  <div className="flex items-center gap-2">
                    Dark
                    {theme === "dark" && <Check className="w-3" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setTheme("system")}
                >
                  <div className="flex items-center gap-2">
                    System
                    {theme === "system" && <Check className="w-3" />}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
