import type { JSX } from 'react'
import { Toaster } from 'sonner'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomeView } from './views/HomeView'
import { MainView } from './views/MainView'
import { TournamentSection } from './views/sections/TournamentSection'
import { PlayersSection } from './views/sections/PlayersSection'
import { ScoreablesSection } from './views/sections/ScoreablesSection'
import { CategoriesSection } from './views/sections/CategoriesSection'
import { DivisionsSection } from './views/sections/DivisionsSection'
import { ScoringSection } from './views/sections/ScoringSection'
import { ResultsSection } from './views/sections/ResultsSection'
import { LeaderboardSection } from './views/sections/LeaderboardSection'

function App(): JSX.Element {
  return (
    <HashRouter>
      <main className="flex h-screen w-full justify-center items-stretch">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/app" element={<MainView />}>
            <Route index element={<Navigate to="tournament" replace />} />
            <Route path="tournament" element={<TournamentSection />} />
            <Route path="players" element={<PlayersSection />} />
            <Route path="scoreables" element={<ScoreablesSection />} />
            <Route path="categories" element={<CategoriesSection />} />
            <Route path="divisions" element={<DivisionsSection />} />
            <Route path="scoring" element={<ScoringSection />} />
            <Route path="results" element={<ResultsSection />} />
            <Route path="leaderboard" element={<LeaderboardSection />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Toaster position="top-right" richColors closeButton />
    </HashRouter>
  )
}
export default App
