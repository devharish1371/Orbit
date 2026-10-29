import { copy } from '@/copy/en'

export default function App() {
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-6 py-12">
      <div className="orbit-glow" aria-hidden="true" />
      <section
        className="relative w-full max-w-96 text-center"
        aria-labelledby="orbit-title"
      >
        <img
          className="mx-auto mb-8 h-20 w-20"
          src={`${import.meta.env.BASE_URL}orbit.svg`}
          alt=""
        />
        <p className="mb-4 text-xs font-semibold tracking-[0.28em] uppercase text-pink-200">
          {copy.appName}
        </p>
        <h1
          id="orbit-title"
          className="font-display text-4xl leading-tight font-medium"
        >
          {copy.welcome}
        </h1>
        <p className="mx-auto mt-5 max-w-72 text-base leading-7 text-slate-300">
          {copy.description}
        </p>
        <p className="mt-12 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-6 text-slate-300">
          {copy.preparing}
        </p>
      </section>
    </main>
  )
}
