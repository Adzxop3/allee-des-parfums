import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getRecentPerfumes } from '../history.js'

// Ouvre un parfum surprise : proche des 5 derniers consultés si similar (et s'il y en a),
// sinon au hasard. La raison du choix est transmise à la fiche (state de navigation).
export default function SurpriseButton({ similar = true, className, children }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function surprise() {
    setLoading(true)
    setFailed(false)
    try {
      const near = similar ? getRecentPerfumes().slice(0, 5) : []
      const res = await fetch(`/api/perfumes/random${near.length ? `?near=${near.join(',')}` : ''}`)
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const result = await res.json()
      navigate(`/perfumes/${result.id}`, { state: { surprise: result } })
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" onClick={surprise} disabled={loading} className={className}>
      {failed ? 'Erreur, réessayer' : loading ? 'Un instant…' : children}
    </button>
  )
}
