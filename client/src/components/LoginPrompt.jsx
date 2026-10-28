import { Link, useLocation } from 'react-router'

// « Connectez-vous pour … » : le lien ramène ici après la connexion.
// children : la suite de la phrase (« pour voter. »)
export default function LoginPrompt({ children }) {
  const location = useLocation()
  return (
    <>
      <Link to="/connexion" state={{ from: location.pathname + location.search }} className="link">
        Connectez-vous
      </Link>{' '}
      {children}
    </>
  )
}
