import LegalLayout, { Fill, Section } from './LegalLayout.jsx'

export default function LegalNoticePage() {
  return (
    <LegalLayout title="Mentions légales" updated="23 octobre 2026">
      <Section title="Éditeur du site">
        <p>
          Ce site est un projet personnel non commercial, édité par <Fill>prénom et nom</Fill>, joignable à l'adresse{' '}
          <Fill>adresse email de contact</Fill>.
        </p>
        <p>
          Directeur de la publication : <Fill>prénom et nom</Fill>.
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          Le site est hébergé par <Fill>nom de l'hébergeur</Fill>, <Fill>adresse postale de l'hébergeur</Fill>,{' '}
          <Fill>téléphone ou site web de l'hébergeur</Fill>.
        </p>
      </Section>

      <Section title="Données sur les parfums">
        <p>
          Les informations sur les parfums (notes, accords, votes, descriptions, images) proviennent d'un jeu de
          données issu de Fragrantica, utilisé dans un cadre non commercial. Les marques et noms de parfums
          appartiennent à leurs propriétaires respectifs. Les images sont affichées depuis leur source d'origine.
        </p>
        <p>
          Source et licence du jeu de données : <Fill>lien vers le jeu de données et sa licence</Fill>.
        </p>
      </Section>

      <Section title="Contenus publiés par les membres">
        <p>
          Les avis et commentaires sont rédigés par les membres, sous leur responsabilité. Ils peuvent être signalés
          à l'aide du lien « Signaler » : l'équipe de modération peut alors les masquer ou les supprimer. Pour toute
          demande, écrivez à <Fill>adresse email de contact</Fill>.
        </p>
      </Section>
    </LegalLayout>
  )
}
