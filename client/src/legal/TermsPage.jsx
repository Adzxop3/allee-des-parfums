import { Link } from 'react-router'
import LegalLayout, { Fill, Section } from './LegalLayout.jsx'

export default function TermsPage() {
  return (
    <LegalLayout title="Conditions d'utilisation" updated="23 octobre 2026">
      <Section title="Objet">
        <p>
          Ce site permet d'explorer des parfums, de tenir une parfumothèque personnelle et de partager des avis avec
          les autres membres. Il est gratuit et sans but commercial. En créant un compte, vous acceptez les présentes
          conditions.
        </p>
      </Section>

      <Section title="Compte">
        <ul className="list-disc space-y-1 pl-5">
          <li>Vous devez indiquer une adresse email valide et la confirmer pour publier ou utiliser la parfumothèque.</li>
          <li>Vous êtes responsable de la confidentialité de votre mot de passe.</li>
          <li>
            Votre pseudo est public : il ne doit pas imiter une autre personne ni l'équipe du site, ni être injurieux.
          </li>
          <li>
            Vous pouvez supprimer votre compte à tout moment depuis la page{' '}
            <Link to="/compte" className="link">
              Mon compte
            </Link>
            .
          </li>
        </ul>
      </Section>

      <Section title="Avis, commentaires et votes">
        <p>Les avis et commentaires sont publics. En publiant, vous vous engagez à :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>donner votre avis personnel sur le parfum (un seul avis par parfum) ;</li>
          <li>rester courtois, sans propos injurieux, haineux, discriminatoires ou diffamatoires ;</li>
          <li>ne pas publier de publicité, de liens commerciaux ou de contenu répété ;</li>
          <li>ne pas publier d'informations personnelles sur vous-même ou sur autrui.</li>
        </ul>
        <p>
          Vous restez propriétaire de vos textes. Vous autorisez le site à les afficher tant qu'ils sont en ligne.
          Des limites de fréquence s'appliquent (par exemple 5 avis par heure).
        </p>
      </Section>

      <Section title="Modération">
        <p>
          Tout membre peut signaler un avis ou un commentaire. L'équipe de modération peut masquer ou supprimer un
          contenu contraire à ces conditions. Un contenu masqué n'est plus visible du public mais reste visible de
          son auteur.
        </p>
      </Section>

      <Section title="Suppression du compte">
        <p>
          La suppression de votre compte efface définitivement vos avis, commentaires, votes, signalements,
          parfumothèque et préférences.
        </p>
      </Section>

      <Section title="Responsabilité">
        <p>
          Les informations sur les parfums sont fournies à titre indicatif, sans garantie d'exactitude. Les avis
          reflètent l'opinion de leurs auteurs. Le site peut être interrompu ou modifié à tout moment.
        </p>
      </Section>

      <Section title="Contact et droit applicable">
        <p>
          Pour toute question : <Fill>adresse email de contact</Fill>. Ces conditions sont soumises au droit{' '}
          <Fill>français</Fill>.
        </p>
      </Section>
    </LegalLayout>
  )
}
