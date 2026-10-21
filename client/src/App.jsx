import { Link, Route, Routes } from 'react-router'
import PerfumePage from './pages/PerfumePage.jsx'
import SearchPage from './pages/SearchPage.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link to="/" className="text-lg font-bold">
            Parfums
          </Link>
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
            Recherche
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/perfumes/:id" element={<PerfumePage />} />
          <Route path="*" element={<p>Page introuvable.</p>} />
        </Routes>
      </main>
    </div>
  )
}
