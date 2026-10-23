import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'

// Vote « utile » d'un avis. Sur son propre avis : simple compteur, pas de bouton.
export default function HelpfulButton({ review, isOwn }) {
  const { user } = useAuth()
  const location = useLocation()
  const [state, setState] = useState({ count: review.helpfulCount, voted: review.votedByMe })
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState(null)

  if (isOwn) {
    return state.count > 0 ? (
      <span className="text-sm text-gray-600">
        {state.count} membre{state.count > 1 ? 's ont' : ' a'} trouvé votre avis utile
      </span>
    ) : null
  }

  async function toggle() {
    if (!user?.emailVerified) {
      setMessage(user ? 'confirm' : 'login')
      return
    }
    setPending(true)
    try {
      const data = await apiSend(state.voted ? 'DELETE' : 'POST', `/api/reviews/${review.id}/vote`)
      setState({ count: data.helpfulCount, voted: data.votedByMe })
    } catch (err) {
      setMessage(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={state.voted}
        className={`rounded-full border px-3 py-1.5 disabled:opacity-60 ${
          state.voted ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white hover:border-gray-500'
        }`}
      >
        Utile · {state.count}
      </button>
      {message === 'login' && (
        <span>
          <Link to="/connexion" state={{ from: location.pathname }} className="underline underline-offset-2">
            Connectez-vous
          </Link>{' '}
          pour voter.
        </span>
      )}
      {message === 'confirm' && <span>Confirmez votre adresse email pour voter.</span>}
      {message && !['login', 'confirm'].includes(message) && (
        <span role="alert" className="text-red-700">
          {message}
        </span>
      )}
    </span>
  )
}
