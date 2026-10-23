import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { addRecentPerfume } from '../history.js'
import { describePerfume } from '../describe.js'
import { ACCORDS, GENDERS, MOODS, NOTE_POSITIONS } from '../labels.js'
import CollectionControl from '../components/CollectionControl.jsx'
import StarDisplay from '../components/StarDisplay.jsx'
import ReviewsSection from '../reviews/ReviewsSection.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

export default function PerfumePage() {
  const { id } = useParams()
  const { data: perfume, error, loading, reload } = useFetch(`/api/perfumes/${id}`)
  const navigate = useNavigate()
  const location = useLocation()
  usePageTitle(perfume && !loading ? `${perfume.name}${perfume.brand ? ` (${perfume.brand})` : ''}` : null)

  // Mémorise la consultation (sert au bouton « Surprends-moi »)
  useEffect(() => {
    if (perfume) addRecentPerfume(perfume.id)
  }, [perfume])

  // Moyenne des avis mise à jour après une publication (sans recharger toute la fiche)
  const [community, setCommunity] = useState({ perfumeId: null, summary: null })

  // Retour à la page précédente (la recherche), ou à l'accueil si on arrive directement ici
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  if (loading) return <Loading />
  if (error) return <ErrorMessage message={error} onRetry={reload} />

  const communitySummary = community.perfumeId === perfume.id ? community.summary : perfume.community

  const surprise = location.state?.surprise
  const noteGroups = Object.entries(perfume.notes).filter(([, notes]) => notes.length)
  const seasons = perfume.moods.filter((m) => m.type === 'season')
  const occasions = perfume.moods.filter((m) => m.type === 'occasion')

  return (
    <article>
      <button type="button" onClick={goBack} className="text-sm text-gray-600 hover:text-gray-900">
        ← Retour
      </button>

      {surprise?.id === perfume.id && (
        <p className="mt-3 rounded border border-gray-200 bg-white px-3 py-2 text-sm">
          <span className="font-semibold">Surprise !</span>{' '}
          {surprise.similarTo ? (
            <>
              Choisi parce qu'il ressemble à{' '}
              <Link to={`/perfumes/${surprise.similarTo.id}`} className="underline underline-offset-2">
                {surprise.similarTo.name}
              </Link>
              , que vous avez consulté.
            </>
          ) : (
            'Choisi au hasard parmi les parfums populaires.'
          )}
        </p>
      )}

      <div className="mt-4 grid gap-6 md:grid-cols-[16rem_1fr]">
        <img
          src={perfume.image_url}
          alt={perfume.name}
          referrerPolicy="no-referrer"
          className="mx-auto w-48 rounded bg-white md:w-full"
        />

        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{perfume.name}</h1>
          <p className="text-lg text-gray-700">{perfume.brand}</p>
          <p className="mt-1 text-sm text-gray-600">
            {[perfume.year, GENDERS[perfume.gender], perfume.concentration]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {perfume.perfumers.length > 0 && (
            <p className="mt-1 text-sm text-gray-600">
              Parfumeur{perfume.perfumers.length > 1 ? 's' : ''} :{' '}
              {perfume.perfumers.map((p) => p.name).join(', ')}
            </p>
          )}

          {/* Deux notes distinctes : les votes Fragrantica (dataset) et les avis des membres du site */}
          <ul className="mt-3 space-y-1 text-sm">
            {perfume.rating_avg && (
              <li className="flex flex-wrap items-center gap-2">
                <StarDisplay value={perfume.rating_avg} />
                <span>
                  <strong>{perfume.rating_avg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</strong> / 5 sur
                  Fragrantica ({perfume.rating_count.toLocaleString('fr-FR')} votes)
                </span>
              </li>
            )}
            <li className="flex flex-wrap items-center gap-2">
              {communitySummary.count > 0 ? (
                <>
                  <StarDisplay value={communitySummary.average} />
                  <a href="#avis" className="underline underline-offset-2">
                    <strong>{communitySummary.average.toLocaleString('fr-FR')}</strong> / 5 dans les avis des
                    membres ({communitySummary.count} avis)
                  </a>
                </>
              ) : (
                <a href="#avis" className="text-gray-600 underline underline-offset-2">
                  Pas encore d'avis des membres : donnez le vôtre
                </a>
              )}
            </li>
          </ul>

          {/* key : l'état repart de zéro quand on passe d'un parfum à un autre */}
          <div className="mt-4">
            <CollectionControl key={perfume.id} perfumeId={perfume.id} />
          </div>

          {noteGroups.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold">Notes</h2>
              <dl className="mt-2 space-y-2">
                {noteGroups.map(([position, notes]) => (
                  <div key={position} className="sm:flex sm:gap-4">
                    <dt className="w-16 shrink-0 text-sm font-medium text-gray-500">
                      {NOTE_POSITIONS[position]}
                    </dt>
                    <dd>
                      {notes.map((note, i) => (
                        <span key={note.id}>
                          {i > 0 && ', '}
                          <Link to={`/notes/${note.id}`} className="underline-offset-2 hover:underline">
                            {note.name}
                          </Link>
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {perfume.accords.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold">Accords</h2>
              <ul className="mt-2 max-w-md space-y-1">
                {perfume.accords.map((accord) => (
                  <li key={accord.id} className="flex items-center gap-2 text-sm">
                    <span className="w-32 shrink-0">{ACCORDS[accord.name] ?? accord.name}</span>
                    <span className="h-2 flex-1 rounded bg-gray-200">
                      <span
                        className="block h-2 rounded bg-gray-700"
                        style={{ width: `${accord.intensity}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {perfume.moods.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold">Ambiances</h2>
              <MoodList moods={seasons} />
              <MoodList moods={occasions} />
            </section>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-semibold">Description</h2>
        <p className="mt-2 text-gray-700">{describePerfume(perfume)}</p>
      </section>

      <ReviewsSection
        key={perfume.id}
        perfumeId={perfume.id}
        onSummaryChange={(summary) => setCommunity({ perfumeId: perfume.id, summary })}
      />
    </article>
  )
}

// Liste de scores (part des votes) en pourcentages
function MoodList({ moods }) {
  if (!moods.length) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-2 text-sm">
      {moods.map((mood) => (
        <li key={mood.id} className="rounded border border-gray-200 bg-white px-2 py-1">
          {MOODS[mood.name] ?? mood.name} {Math.round(mood.score * 100)} %
        </li>
      ))}
    </ul>
  )
}
