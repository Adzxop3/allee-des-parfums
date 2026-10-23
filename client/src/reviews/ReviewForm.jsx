import { useState } from 'react'
import { apiSend } from '../api.js'
import StarRating from '../components/StarRating.jsx'
import { ErrorMessage } from '../components/Status.jsx'
import TextField from '../components/TextField.jsx'

const TITLE_MAX = 100
const BODY_MIN = 30
const BODY_MAX = 3000

// Formulaire d'avis : création (review absent) ou modification de son avis.
// initialRating : note de la parfumothèque, proposée par défaut à la création.
export default function ReviewForm({ perfumeId, review, initialRating = null, onSaved, onCancel }) {
  const [rating, setRating] = useState(review?.rating ?? initialRating)
  const [title, setTitle] = useState(review?.title ?? '')
  const [body, setBody] = useState(review?.body ?? '')
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const [pending, setPending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!rating) {
      setFields({ rating: 'Choisissez une note de 1 à 5 étoiles' })
      return
    }
    setPending(true)
    setError(null)
    setFields({})
    try {
      const data = review
        ? await apiSend('PATCH', `/api/reviews/${review.id}`, { rating, title, body })
        : await apiSend('POST', `/api/perfumes/${perfumeId}/reviews`, { rating, title, body })
      onSaved(data.review)
    } catch (err) {
      setError(err.message)
      setFields(err.fields ?? {})
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded border border-gray-200 bg-white p-4">
      <h3 className="font-semibold">{review ? 'Modifier mon avis' : 'Donner mon avis'}</h3>
      {error && <ErrorMessage message={error} />}

      <div>
        <StarRating name={`avis-${perfumeId}`} value={rating} onChange={setRating} legend="Ma note" />
        {fields.rating && (
          <p className="mt-1 text-sm text-red-700" role="alert">
            {fields.rating}
          </p>
        )}
      </div>

      <TextField
        label="Titre"
        name="titre-avis"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={TITLE_MAX}
        required
        hint={`${title.length} / ${TITLE_MAX} caractères`}
        error={fields.title}
      />

      <div>
        <label htmlFor="texte-avis" className="block text-sm font-medium">
          Mon avis
        </label>
        <textarea
          id="texte-avis"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={BODY_MAX}
          rows={6}
          required
          aria-invalid={fields.body ? true : undefined}
          aria-describedby={fields.body ? 'texte-avis-aide texte-avis-erreur' : 'texte-avis-aide'}
          className={`mt-1 w-full rounded border bg-white px-3 py-2 ${fields.body ? 'border-red-600' : 'border-gray-300'}`}
        />
        <p id="texte-avis-aide" className="mt-1 text-xs text-gray-600">
          {body.length} / {BODY_MAX} caractères ({BODY_MIN} minimum). Texte simple, sans mise en forme.
        </p>
        {fields.body && (
          <p id="texte-avis-erreur" className="mt-1 text-sm text-red-700">
            {fields.body}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-60">
          {pending ? 'Publication…' : review ? 'Enregistrer' : 'Publier mon avis'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border border-gray-300 bg-white px-4 py-2">
            Annuler
          </button>
        )}
      </div>
    </form>
  )
}
