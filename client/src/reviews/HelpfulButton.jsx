import { useState } from 'react'
import { apiSend } from '../api.js'
import { useAuth } from '../auth/AuthContext.js'
import LoginPrompt from '../components/LoginPrompt.jsx'
import { chipClass } from '../ui/styles.js'

// Vote « utile » d'un avis. Sur son propre avis : simple compteur, pas de bouton.
export default function HelpfulButton({ review, isOwn }) {
  const { user } = useAuth()
  const [state, setState] = useState({ count: review.helpfulCount, voted: review.votedByMe })
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState(null)

  if (isOwn) {
    return state.count > 0 ? (
      <span className="text-sm text-muted">
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
        className={`${chipClass(state.voted)} disabled:opacity-60`}
      >
        Utile · {state.count}
      </button>
      {message === 'login' && (
        <span>
          <LoginPrompt>pour voter.</LoginPrompt>
        </span>
      )}
      {message === 'confirm' && <span>Confirmez votre adresse email pour voter.</span>}
      {message && !['login', 'confirm'].includes(message) && (
        <span role="alert" className="text-danger">
          {message}
        </span>
      )}
    </span>
  )
}
