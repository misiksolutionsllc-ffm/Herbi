import Link from "next/link";

export default function NotFound() {
  return (
    <section className="max-w-2xl mx-auto px-6 pt-32 pb-24 text-center fade-up">
      <p className="text-sm tracking-[0.18em] uppercase text-ink/50">404</p>
      <h1 className="mt-4 text-4xl md:text-5xl tracking-[-0.02em]">
        Nothing grows here.
      </h1>
      <p className="mt-6 text-ink/60 max-w-md mx-auto">
        The page you&rsquo;re looking for has moved, been retired, or was never
        planted.
      </p>
      <Link
        href="/shop"
        className="mt-10 inline-block text-[15px] tracking-tight underline-offset-[6px] underline decoration-ink/30 hover:decoration-ink transition"
      >
        Back to the shop
      </Link>
    </section>
  );
}
