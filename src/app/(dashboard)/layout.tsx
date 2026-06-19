import Link from "next/link";
import { NavLink } from "@/components/nav-link";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/review", label: "Review" },
  { href: "/backlog", label: "Backlog" },
  { href: "/channels", label: "Channels" },
  { href: "/costs", label: "Costs" },
  { href: "/analytics", label: "Analytics" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/review" className="text-sm font-semibold tracking-tight">
            Time Excavated <span className="text-muted-foreground font-normal">/ production engine</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
