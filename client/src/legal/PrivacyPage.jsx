import { Link } from 'react-router'
import LegalLayout, { Fill, Section } from './LegalLayout.jsx'

// Décrit ce que le site fait réellement des données (voir server/migrations et server/src/auth.js)
export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" updated="23 octobre 2026">
      <Section title="Responsable du traitement">
        <p>
          <Fill>prénom et nom</Fill>, joignable à <Fill>adresse email de contact</Fill>.
        </p>
      </Section>

      <Section title="Données collectées et utilisation">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-field">
                <th className="py-2 pr-3">Données</th>
                <th className="py-2 pr-3">Pourquoi</th>
                <th className="py-2">Durée de conservation</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Email, pseudo, mot de passe (enregistré haché, jamais en clair)</td>
                <td className="py-2 pr-3">Créer et sécuriser votre compte, vous envoyer les emails de service</td>
                <td className="py-2">Jusqu'à la suppression du compte</td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Parfumothèque, notes, commentaires personnels, réponses au questionnaire</td>
                <td className="py-2 pr-3">Les fonctions que vous utilisez (privées, sauf favoris si vous les rendez publics)</td>
                <td className="py-2">Jusqu'à leur suppression ou celle du compte</td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Avis, commentaires et votes</td>
                <td className="py-2 pr-3">Partage avec la communauté (publics, sauf les votes)</td>
                <td className="py-2">Jusqu'à leur suppression ou celle du compte</td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Signalements, et journal des décisions de modération</td>
                <td className="py-2 pr-3">Modérer les contenus ; le journal garde un extrait du contenu traité</td>
                <td className="py-2">
                  Signalements : jusqu'à la suppression du compte. Journal : <Fill>durée, par ex. 1 an</Fill>
                </td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Sessions de connexion</td>
                <td className="py-2 pr-3">Vous garder connecté</td>
                <td className="py-2">30 jours après votre dernière visite, ou jusqu'à la déconnexion</td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Liens envoyés par email (confirmation, mot de passe oublié)</td>
                <td className="py-2 pr-3">Vérifier votre adresse, réinitialiser votre mot de passe</td>
                <td className="py-2">24 heures (confirmation) ou 1 heure (mot de passe), usage unique</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Adresse IP</td>
                <td className="py-2 pr-3">Limiter les tentatives (connexion, inscription) contre les abus</td>
                <td className="py-2">Gardée en mémoire 15 à 60 minutes, jamais enregistrée en base</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Base légale : l'exécution du service que vous demandez en créant un compte, et l'intérêt légitime pour la
          sécurité et la modération. Vos données ne sont ni vendues ni utilisées à des fins publicitaires.
        </p>
      </Section>

      <Section title="Cookies et stockage dans le navigateur">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Un seul cookie, <code>sid</code>, qui vous garde connecté. Il est strictement nécessaire au service et ne
            sert à aucun suivi : aucun consentement n'est donc demandé.
          </li>
          <li>
            Le navigateur garde la liste de vos 10 derniers parfums consultés (pour le bouton « Surprends-moi »). Elle
            ne quitte pas votre appareil et est effacée à la suppression du compte.
          </li>
          <li>Aucun outil de mesure d'audience ni de publicité n'est utilisé.</li>
        </ul>
      </Section>

      <Section title="Destinataires et hébergement">
        <p>
          Les données sont hébergées par <Fill>nom de l'hébergeur et pays d'hébergement</Fill>. Les emails sont
          envoyés par <Fill>nom du service d'envoi d'emails</Fill>. Les images des parfums sont chargées depuis leur
          source d'origine (fimgs.net), qui reçoit donc votre adresse IP.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Vous pouvez accéder à vos données, les rectifier, les supprimer, vous opposer à leur traitement ou en
          demander la portabilité en écrivant à <Fill>adresse email de contact</Fill>. Vous pouvez supprimer
          vous-même votre compte et toutes ses données depuis{' '}
          <Link to="/compte" className="link">
            Mon compte
          </Link>
          . En cas de difficulté, vous pouvez saisir la CNIL (cnil.fr).
        </p>
      </Section>
    </LegalLayout>
  )
}
