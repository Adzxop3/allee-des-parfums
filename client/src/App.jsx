import { Link, NavLink, Route, Routes } from 'react-router'
import SurpriseButton from './components/SurpriseButton.jsx'
import AmbiancesPage from './pages/AmbiancesPage.jsx'
import DatavizPage from './pages/DatavizPage.jsx'
import MapPage from './pages/MapPage.jsx'
import NotePage from './pages/NotePage.jsx'
import NotesPage from './pages/NotesPage.jsx'
import PerfumePage from './pages/PerfumePage.jsx'
import SearchPage from './pages/SearchPage.jsx'

const navLinkClass = ({ isActive }) =>
  `text-sm ${isActive ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'}`

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3">
          <Link to="/" className="text-lg font-bold">
            Parfums
          </Link>
          <NavLink to="/" end className={navLinkClass}>
            Recherche
          </NavLink>
          <NavLink to="/notes" className={navLinkClass}>
            Notes
          </NavLink>
          <NavLink to="/ambiances" className={navLinkClass}>
            Ambiances
          </NavLink>
          <NavLink to="/carte" className={navLinkClass}>
            Carte
          </NavLink>
          <NavLink to="/chiffres" className={navLinkClass}>
            En chiffres
          </NavLink>
          <SurpriseButton className="ml-auto rounded-full bg-gray-900 px-3 py-1 text-sm text-white disabled:opacity-60">
            Surprends-moi
          </SurpriseButton>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/perfumes/:id" element={<PerfumePage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NotePage />} />
          <Route path="/ambiances" element={<AmbiancesPage />} />
          <Route path="/carte" element={<MapPage />} />
          <Route path="/chiffres" element={<DatavizPage />} />
          <Route path="*" element={<p>Page introuvable.</p>} />
        </Routes>
      </main>
    </div>
  )
}
