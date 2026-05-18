import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
          ReGlow
        </span>
        <div className="flex gap-3">
          <Link href="/login" className="btn-secondary">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary">
            Start free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Bring your clients back{" "}
          <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
            💖
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          The all-in-one platform for cosmetologists to manage clients, reduce no-shows, automate
          WhatsApp outreach, and grow recurring revenue.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            Get started →
          </Link>
          <Link href="/login" className="btn-secondary px-8 py-3 text-base">
            Sign in
          </Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            { title: "Client tracking", desc: "Know who’s active, at risk, or lost" },
            { title: "WhatsApp automation", desc: "Re-engage clients with one tap" },
            { title: "Online booking", desc: "Premium booking page for your salon" },
          ].map((f) => (
            <div key={f.title} className="card text-left">
              <h3 className="font-semibold text-brand-700">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="card mx-auto mt-16 max-w-lg">
          <p className="text-sm text-gray-500">Plans from</p>
          <p className="text-3xl font-bold text-brand-600">₪99/mo</p>
          <p className="mt-2 text-sm text-gray-600">Pro plan recommended for most salons</p>
        </div>
      </main>
    </div>
  );
}
