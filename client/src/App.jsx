import { Link, Route, Routes, useLocation } from 'react-router'
import Header from './components/Header.jsx'
import AmbiancesPage from './pages/AmbiancesPage.jsx'
import DatavizPage from './pages/DatavizPage.jsx'
import MapPage from './pages/MapPage.jsx'
import NotePage from './pages/NotePage.jsx'
import NotesPage from './pages/NotesPage.jsx'
import PerfumePage from './pages/PerfumePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import { usePageTitle } from './usePageTitle.js'

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* key : l'en-tête est recréé à chaque page, le menu mobile se referme donc tout seul */}
      <Header key={location.pathname} />

      <main id="contenu" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 focus:outline-none">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/perfumes/:id" element={<PerfumePage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NotePage />} />
          <Route path="/ambiances" element={<AmbiancesPage />} />
          <Route path="/carte" element={<MapPage />} />
          <Route path="/chiffres" element={<DatavizPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}

function NotFoundPage() {
  usePageTitle('Page introuvable')
  return (
    <div>
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-gray-600">
        Cette adresse ne correspond à aucune page.{' '}
        <Link to="/" className="underline underline-offset-2">
          Retour à la recherche
        </Link>
      </p>
    </div>
  )
}
