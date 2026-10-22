import { useEffect, useRef } from 'react'
import { Link, Route, Routes, useLocation, useNavigationType } from 'react-router'
import AccountPage from './pages/AccountPage.jsx'
import Header from './components/Header.jsx'
import VerifyEmailBanner from './components/VerifyEmailBanner.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import AmbiancesPage from './pages/AmbiancesPage.jsx'
import CollectionPage from './pages/CollectionPage.jsx'
import DatavizPage from './pages/DatavizPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import MapPage from './pages/MapPage.jsx'
import NotePage from './pages/NotePage.jsx'
import NotesPage from './pages/NotesPage.jsx'
import QuizPage from './pages/QuizPage.jsx'
import PerfumePage from './pages/PerfumePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import { usePageTitle } from './usePageTitle.js'

export default function App() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const firstRender = useRef(true)

  // Nouvelle page : retour en haut et focus sur le contenu (les lecteurs d'écran annoncent la page).
  // Pas avec le bouton Retour (POP), où le navigateur garde sa position.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (navigationType === 'POP') return
    window.scrollTo(0, 0)
    document.getElementById('contenu')?.focus({ preventScroll: true })
  }, [location.pathname, navigationType])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* key : l'en-tête est recréé à chaque page, le menu mobile se referme donc tout seul */}
      <Header key={location.pathname} />
      <VerifyEmailBanner />

      <main id="contenu" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 focus:outline-none">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/perfumes/:id" element={<PerfumePage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NotePage />} />
          <Route path="/ambiances" element={<AmbiancesPage />} />
          <Route path="/carte" element={<MapPage />} />
          <Route path="/chiffres" element={<DatavizPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
          <Route path="/verifier-email" element={<VerifyEmailPage />} />
          <Route path="/parfumotheque" element={<CollectionPage />} />
          <Route path="/questionnaire" element={<QuizPage />} />
          <Route path="/compte" element={<AccountPage />} />
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
