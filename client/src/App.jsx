import { lazy, Suspense, useEffect, useRef } from 'react'
import { Link, Route, Routes, useLocation, useNavigationType } from 'react-router'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Footer from './components/Footer.jsx'
import { Loading } from './components/Status.jsx'
import Header from './components/Header.jsx'
import VerifyEmailBanner from './components/VerifyEmailBanner.jsx'
import SearchPage from './pages/SearchPage.jsx'
import { usePageTitle } from './usePageTitle.js'

// Chaque page est un fichier JS séparé, téléchargé à sa première visite.
// La recherche (page d'accueil) reste dans le fichier principal.
const LegalNoticePage = lazy(() => import('./legal/LegalNoticePage.jsx'))
const PrivacyPage = lazy(() => import('./legal/PrivacyPage.jsx'))
const TermsPage = lazy(() => import('./legal/TermsPage.jsx'))
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const AmbiancesPage = lazy(() => import('./pages/AmbiancesPage.jsx'))
const CollectionPage = lazy(() => import('./pages/CollectionPage.jsx'))
const DatavizPage = lazy(() => import('./pages/DatavizPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const MapPage = lazy(() => import('./pages/MapPage.jsx'))
const MemberPage = lazy(() => import('./pages/MemberPage.jsx'))
const NotePage = lazy(() => import('./pages/NotePage.jsx'))
const NotesPage = lazy(() => import('./pages/NotesPage.jsx'))
const PerfumePage = lazy(() => import('./pages/PerfumePage.jsx'))
const QuizPage = lazy(() => import('./pages/QuizPage.jsx'))
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage.jsx'))

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
    <div className="min-h-screen bg-paper text-ink">
      {/* key : l'en-tête est recréé à chaque page, le menu mobile se referme donc tout seul */}
      <Header key={location.pathname} />
      <VerifyEmailBanner />

      {/* min-h-screen : le pied de page reste hors de l'écran pendant le chargement (pas de saut de mise en page) */}
      <main id="contenu" tabIndex={-1} className="mx-auto min-h-screen max-w-6xl px-4 py-6 focus:outline-none">
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<Loading />}>
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
              <Route path="/membres/:id" element={<MemberPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/mentions-legales" element={<LegalNoticePage />} />
              <Route path="/conditions" element={<TermsPage />} />
              <Route path="/confidentialite" element={<PrivacyPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

function NotFoundPage() {
  usePageTitle('Page introuvable')
  return (
    <div>
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-muted">
        Cette adresse ne correspond à aucune page.{' '}
        <Link to="/" className="link">
          Retour à la recherche
        </Link>
      </p>
    </div>
  )
}
