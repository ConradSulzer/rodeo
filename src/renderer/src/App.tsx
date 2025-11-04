import type { JSX } from 'react'
import { HomeView } from './views/HomeView'

function App(): JSX.Element {
  return (
    <main className="flex w-full justify-center">
      <HomeView />
    </main>
  )
}

export default App
