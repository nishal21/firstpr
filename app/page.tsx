import { LandingSteps } from "@/components/flow-steps";
import { MatchForm } from "@/components/match-form";

export default function Home() {
  return (
    <>
      <section className="hero-tint relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hero-dots opacity-[0.45]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Your first PR, written by you, ready to merge.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            FirstPR finds a real beginner issue, shows you exactly where to look,
            and checks your PR before a maintainer sees it.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-500">
            FirstPR never writes your code. It shows you where to look and checks
            your PR before a maintainer sees it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <LandingSteps />
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <h2 className="mb-6 text-xl font-semibold tracking-tight text-slate-900">
          Match
        </h2>
        <MatchForm />
      </section>
    </>
  );
}
