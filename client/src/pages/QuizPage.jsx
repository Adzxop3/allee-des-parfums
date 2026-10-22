import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import PerfumeGrid from '../components/PerfumeGrid.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import ChoiceQuestion from '../quiz/ChoiceQuestion.jsx'
import NotePicker from '../quiz/NotePicker.jsx'
import { DEFAULT_ANSWERS, QUESTIONS } from '../quiz/questions.js'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

const RESULTS = QUESTIONS.length // l'étape après la dernière question

export default function QuizPage() {
  usePageTitle('Trouver mon parfum')
  const { user } = useAuth()
  const verified = Boolean(user?.emailVerified)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS)
  const touched = useRef(false) // l'utilisateur a-t-il déjà répondu à quelque chose ?
  const headingRef = useRef(null)

  const notes = useFetch('/api/notes?limit=1500')
  const options = useFetch('/api/recommendations/options')

  // Compte confirmé : on reprend les réponses sauvegardées (sauf si l'utilisateur a déjà commencé)
  useEffect(() => {
    if (!verified) return
    apiSend('GET', '/api/recommendations/preferences')
      .then((data) => {
        if (data.answers && !touched.current) setAnswers({ ...DEFAULT_ANSWERS, ...data.answers })
      })
      .catch(() => {}) // sans préférences sauvegardées, on part des réponses par défaut
  }, [verified])

  // À chaque étape, le focus va sur le titre (clavier, lecteurs d'écran)
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  function answer(key, value) {
    touched.current = true
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  if (step === RESULTS) {
    return (
      <Results
        answers={answers}
        verified={verified}
        onToggleExcludeOwned={(value) => answer('excludeOwned', value)}
        onEdit={() => setStep(0)}
        onRestart={() => {
          setAnswers(DEFAULT_ANSWERS)
          setStep(0)
        }}
        headingRef={headingRef}
      />
    )
  }

  const question = QUESTIONS[step]
  const value = answers[question.key]
  const isEmpty = Array.isArray(value) ? value.length === 0 : false
  const headingId = `question-${question.key}`

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm text-gray-600">Trouver mon parfum</p>
      <div className="mt-2 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Progression du questionnaire"
          aria-valuemin={1}
          aria-valuemax={QUESTIONS.length}
          aria-valuenow={step + 1}
          aria-valuetext={`Question ${step + 1} sur ${QUESTIONS.length}`}
          className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"
        >
          <div className="h-full rounded-full bg-gray-900 transition-[width]" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="shrink-0 text-sm text-gray-600">
          {step + 1} / {QUESTIONS.length}
        </span>
      </div>

      <h1 id={headingId} ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-bold focus:outline-none">
        {question.title}
      </h1>
      {question.help && <p className="mt-1 text-sm text-gray-600">{question.help}</p>}

      <div className="mt-5">
        {question.type === 'notes' ? (
          notes.error ? (
            <ErrorMessage message={notes.error} onRetry={notes.reload} />
          ) : !notes.data ? (
            <Loading />
          ) : (
            <NotePicker
              id={`recherche-${question.key}`}
              notes={notes.data}
              value={value}
              max={question.max}
              excluded={question.key === 'likedNotes' ? answers.dislikedNotes : answers.likedNotes}
              onChange={(ids) => answer(question.key, ids)}
            />
          )
        ) : (
          <ChoiceQuestion
            question={question}
            value={value}
            labelledBy={headingId}
            examples={question.key === 'families' ? options.data?.examples : undefined}
            onChange={(newValue) => answer(question.key, newValue)}
          />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className="rounded border border-gray-300 bg-white px-4 py-2 disabled:invisible"
        >
          Précédent
        </button>
        <button type="button" onClick={() => setStep(step + 1)} className="rounded bg-gray-900 px-4 py-2 text-white">
          {step === QUESTIONS.length - 1 ? 'Voir mes résultats' : isEmpty ? 'Passer' : 'Suivant'}
        </button>
      </div>
    </div>
  )
}

function Results({ answers, verified, onToggleExcludeOwned, onEdit, onRestart, headingRef }) {
  const location = useLocation()
  // for : les réponses correspondant aux résultats affichés ; tant qu'elles diffèrent, on calcule
  const [state, setState] = useState({ for: null, results: null, error: null })
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | message d'erreur
  const loading = state.for !== answers

  // Les résultats sont recalculés quand les réponses changent (ex. « exclure mes parfums »)
  useEffect(() => {
    let cancelled = false
    apiSend('POST', '/api/recommendations', answers)
      .then((data) => !cancelled && setState({ for: answers, results: data.results, error: null }))
      .catch((err) => !cancelled && setState({ for: answers, results: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [answers])

  async function save() {
    setSaveStatus('saving')
    try {
      await apiSend('PUT', '/api/recommendations/preferences', answers)
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus(err.message)
    }
  }

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold focus:outline-none">
        Vos parfums
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Classés selon vos réponses, parmi les parfums d'au moins 100 votants.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button type="button" onClick={onEdit} className="rounded border border-gray-300 bg-white px-3 py-1.5">
          Modifier mes réponses
        </button>
        <button type="button" onClick={onRestart} className="rounded border border-gray-300 bg-white px-3 py-1.5">
          Recommencer
        </button>
        {verified ? (
          <>
            <button
              type="button"
              onClick={save}
              disabled={saveStatus === 'saving'}
              className="rounded bg-gray-900 px-3 py-1.5 text-white disabled:opacity-60"
            >
              {saveStatus === 'saving' ? 'Enregistrement…' : 'Enregistrer mes préférences'}
            </button>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={answers.excludeOwned}
                onChange={(event) => onToggleExcludeOwned(event.target.checked)}
                className="accent-gray-900"
              />
              Exclure les parfums que je possède
            </label>
          </>
        ) : (
          <span className="text-gray-600">
            <Link to="/connexion" state={{ from: location.pathname }} className="underline underline-offset-2">
              Connectez-vous
            </Link>{' '}
            pour enregistrer vos préférences et exclure les parfums que vous possédez.
          </span>
        )}
      </div>
      {saveStatus === 'saved' && (
        <p role="status" className="mt-2 text-sm text-gray-700">
          Préférences enregistrées : elles seront reprises à votre prochaine visite.
        </p>
      )}
      {saveStatus && !['saving', 'saved'].includes(saveStatus) && (
        <div className="mt-2">
          <ErrorMessage message={saveStatus} />
        </div>
      )}

      <div className="mt-6">
        {state.error && !loading && <ErrorMessage message={state.error} />}
        {loading && !state.results && <Loading label="Calcul de vos recommandations…" />}
        {state.results && state.results.length === 0 && (
          <p className="text-gray-600">Aucun parfum ne correspond : essayez d'assouplir vos réponses.</p>
        )}
        {state.results && state.results.length > 0 && <PerfumeGrid perfumes={state.results} dimmed={loading} />}
      </div>
    </div>
  )
}
