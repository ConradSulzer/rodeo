export function PlayersSection() {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <header>
        <h2 className="font-mono text-[16px] font-semibold uppercase tracking-[2px]">Players</h2>
        <p className="mt-2 text-sm ro-text-dim">
          Manage the roster, eligibility, and associated divisions.
        </p>
      </header>
      <div className="flex flex-1 items-center justify-center ro-text-muted">
        <span>Player management tools are on the way.</span>
      </div>
    </section>
  )
}
