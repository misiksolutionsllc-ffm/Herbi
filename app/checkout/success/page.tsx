import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { ClearCart } from "./clear-cart";

type SearchParams = Promise<{ session_id?: string }>;

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session_id } = await searchParams;

  let email: string | null = null;
  let amount: number | null = null;

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      email = session.customer_details?.email ?? null;
      amount = session.amount_total;
    } catch {
      // bad session id — just show generic thank you
    }
  }

  return (
    <section className="max-w-2xl mx-auto px-6 py-24 text-center">
      <ClearCart />
      <p className="text-sm tracking-[0.18em] uppercase text-botanical">
        Thank you
      </p>
      <h1 className="mt-6 text-4xl md:text-5xl tracking-[-0.02em]">
        Your order is in.
      </h1>
      <p className="mt-6 text-ink/70 max-w-md mx-auto">
        We&rsquo;ll send a confirmation
        {email ? <> to <span className="text-ink">{email}</span></> : ""} within
        the hour. Goods are hand-packed and ship in 2–3 days.
      </p>

      {amount !== null && (
        <p className="mt-4 text-sm text-ink/60 tabular-nums">
          Total charged:{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          }).format(amount / 100)}
        </p>
      )}

      <Link
        href="/shop"
        className="mt-12 inline-block text-[15px] border-b border-ink pb-1 hover:border-botanical hover:text-botanical"
      >
        Keep looking →
      </Link>
    </section>
  );
}
