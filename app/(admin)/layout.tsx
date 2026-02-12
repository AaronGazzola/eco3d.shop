"use client";

import { useEffect } from "react";

export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/layouts/AdminHeader";
import { AdminSidebar } from "@/components/layouts/AdminSidebar";
import { useAuth } from "@/app/layout.hooks";
import { useAuthStore } from "@/app/layout.stores";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading } = useAuth();
  const { profile } = useAuthStore();

  useEffect(() => {
    if (!isLoading && profile) {
      const isAdmin = profile.role === "admin" || profile.role === "super-admin";
      if (!isAdmin) {
        router.push("/");
      }
    }
  }, [profile, isLoading, router]);

  if (isLoading || !profile || (profile.role !== "admin" && profile.role !== "super-admin")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <AdminSidebar />
      <main className="flex-1 lg:ml-64">{children}</main>
    </div>
  );
}
