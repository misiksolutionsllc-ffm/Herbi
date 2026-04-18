import Link from "next/link";
import { brand } from "@/lib/brand";
import { CartButton } from "./cart-button";

export function Header() {
  return (
    <header className="border-b border-ink/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-[15px] tracking-[0.18em] uppercase font-medium"
        >
          {brand.name}
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
          <Link href="/shop" className="hover:text-ink transition-colors">
            Shop
          </Link>
          <Link href="/#story" className="hover:text-ink transition-colors">
            Story
          </Link>
          <Link href="/#journal" className="hover:text-ink transition-colors">
            Journal
          </Link>
        </nav>

        <CartButton />
      </div>
    </header>
  );
}
