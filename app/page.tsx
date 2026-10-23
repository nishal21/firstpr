import { MatchForm } from "@/components/match-form";

export default function Home() {
  return (
    <>
      <section className="bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_48%)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-16 sm:px-6 sm:py-20">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Your first PR, written by you, ready to merge.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-slate-600">
            FirstPR finds a real beginner issue, shows you exactly where to look,
            and checks your PR before a maintainer sees it.
          </p>
        </div>
      </section>
      <MatchForm />
    </>
  );
}
