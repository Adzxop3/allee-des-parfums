import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext.js'
import Pagination from '../components/Pagination.jsx'
import PerfumeGrid from '../components/PerfumeGrid.jsx'
import { ErrorMessage, Loading } from '../components/Status.jsx'
import ReviewCard from '../reviews/ReviewCard.jsx'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

// Profil public d'un membre : pseudo, ancienneté, avis publiés et, s'il l'a choisi, ses favoris
export default function MemberPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const member = useFetch(`/api/members/${id}`)
  // « Profil de Bob », mais « Profil d'Alice »
  const name = member.data?.displayName ?? ''
  usePageTitle(member.data && !member.loading ? `Profil ${/^[aeiouyàâéèêîôû]/i.test(name) ? `d'${name}` : `de ${name}`}` : null)

  if (member.loading && !member.data) return <Loading />
  if (member.error) return <ErrorMessage message={member.error} onRetry={member.reload} />

  const { displayName, memberSince, reviewCount, favorites } = member.data
  const isMe = user?.id === member.data.id

  return (
    <div>
      <h1 className="text-2xl font-bold">{displayName}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Membre depuis {new Date(memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} ·{' '}
        {reviewCount} avis publié{reviewCount > 1 ? 's' : ''}
      </p>
      {isMe && (
        <p className="mt-2 text-sm">
          C'est votre profil public.{' '}
          <Link to="/compte" className="underline underline-offset-2">
            Choisir ce qui y apparaît
          </Link>
        </p>
      )}

      {favorites && favorites.length > 0 && (
        <section aria-labelledby="favoris-titre" className="mt-8">
          <h2 id="favoris-titre" className="mb-3 text-xl font-semibold">
            Parfums favoris
          </h2>
          <PerfumeGrid perfumes={favorites} />
        </section>
      )}

      <MemberReviews key={id} memberId={id} />
    </div>
  )
}

function MemberReviews({ memberId }) {
  const [page, setPage] = useState(1)
  const list = useFetch(`/api/members/${memberId}/reviews?page=${page}`)

  return (
    <section aria-labelledby="avis-membre-titre" className="mt-8">
      <h2 id="avis-membre-titre" className="mb-3 text-xl font-semibold">
        Avis publiés
      </h2>
      {list.error && <ErrorMessage message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data?.total === 0 && <p className="text-gray-600">Aucun avis publié pour le moment.</p>}
      <div className={`space-y-4 ${list.loading ? 'opacity-50' : ''}`}>
        {list.data?.reviews.map((review) => (
          <ReviewCard key={review.id} review={review} perfume={review.perfume} />
        ))}
      </div>
      {list.data && (
        <Pagination
          page={page}
          totalPages={Math.ceil(list.data.total / list.data.limit)}
          onChange={(newPage) => {
            setPage(newPage)
            document.getElementById('avis-membre-titre')?.scrollIntoView()
          }}
        />
      )}
    </section>
  )
}
