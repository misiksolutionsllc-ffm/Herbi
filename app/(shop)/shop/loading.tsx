export default function ShopLoading() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <div className="mb-12">
        <div className="h-12 w-40 bg-mist/60 rounded-sm" />
        <div className="mt-3 h-4 w-56 bg-mist/40 rounded-sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/5] bg-mist/60" />
            <div className="mt-4 flex items-baseline justify-between">
              <div className="h-4 w-24 bg-mist/50 rounded-sm" />
              <div className="h-4 w-12 bg-mist/50 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
