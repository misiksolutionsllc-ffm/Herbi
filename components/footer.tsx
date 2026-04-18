import Link from "next/link";
import { brand } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="border-t border-ink/5 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-12 grid gap-12 md:grid-cols-3">
        <div>
          <p className="text-[15px] tracking-[0.18em] uppercase font-medium">
            {brand.name}
          </p>
          <p className="mt-3 text-sm text-ink/60 max-w-xs">{brand.tagline}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink/70">
          <Link href="/shop" className="hover:text-ink w-fit">
            Shop
          </Link>
          <Link href="/#story" className="hover:text-ink w-fit">
            Story
          </Link>
          <Link href="/#journal" className="hover:text-ink w-fit">
            Journal
          </Link>
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink/60">
          <p>Made slowly in the U.S.</p>
          <p>© {new Date().getFullYear()} {brand.name}.</p>
        </div>
      </div>
    </footer>
  );
}
