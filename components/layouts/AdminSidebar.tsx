"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore, useUIStore } from "@/app/layout.stores";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const { sidebarOpen, closeSidebar } = useUIStore();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/designs", label: "Design Review", icon: "🎨" },
    { href: "/admin/orders", label: "Order Review", icon: "📦" },
  ];

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 w-64 bg-white border-r z-40 transform transition-transform duration-200 lg:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                pathname === item.href
                  ? "bg-green-100 text-green-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {profile && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
                {profile.display_name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile.display_name}
                </p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
