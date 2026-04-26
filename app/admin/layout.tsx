import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: "Admin", template: `%s — ${brand.name} Admin` },
  robots: { index: false, follow: false },
};

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/orders", label: "Orders" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-ink/10 py-8 px-5 flex flex-col gap-6">
        <Link
          href="/admin"
          className="text-xs font-semibold tracking-widest uppercase text-botanical"
        >
          {brand.name} Admin
        </Link>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm px-3 py-2 rounded-xs hover:bg-mist transition-colors text-ink/60 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <Link
            href="/"
            className="text-xs text-ink/40 hover:text-ink/60 transition-colors"
          >
            ← Back to store
          </Link>
        </div>
      </aside>

      {/* Page content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
