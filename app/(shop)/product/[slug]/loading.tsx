export default function ProductLoading() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 pb-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
        <div className="aspect-[4/5] bg-mist/60 animate-pulse" />
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-3/4 bg-mist/60 rounded-sm" />
          <div className="h-5 w-24 bg-mist/50 rounded-sm" />
          <div className="space-y-2 pt-4">
            <div className="h-3 w-full bg-mist/40 rounded-sm" />
            <div className="h-3 w-5/6 bg-mist/40 rounded-sm" />
            <div className="h-3 w-4/6 bg-mist/40 rounded-sm" />
          </div>
          <div className="h-12 w-full bg-mist/50 rounded-sm mt-8" />
        </div>
      </div>
    </section>
  );
}
