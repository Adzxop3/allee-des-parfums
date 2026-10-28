import { useState } from 'react'
import BarList from '../charts/BarList.jsx'
import BrandHeatmap from '../charts/BrandHeatmap.jsx'
import { ChartCard, DataTable } from '../charts/chartKit.jsx'
import { formatInt, formatLean, formatPercent } from '../charts/chartUtils.js'
import SeasonAccordsChart from '../charts/SeasonAccordsChart.jsx'
import StackedColumns from '../charts/StackedColumns.jsx'
import FilterChips from '../components/FilterChips.jsx'
import { ACCORDS, FAMILIES, GENDERS } from '../labels.js'
import { MAP_GROUPS, mapGroupOf } from '../mapGroups.js'
import { useFetch } from '../useFetch.js'
import { usePageTitle } from '../usePageTitle.js'

// Mêmes couleurs que la carte (la couleur suit la famille), mais rangées pour que
// deux couleurs proches (rouge et rose) ne se touchent pas dans les colonnes empilées
const FAMILY_SERIES = ['citrus', 'green', 'gourmand', 'amber', 'floral', 'woody', 'other'].map((key) =>
  MAP_GROUPS.find((g) => g.key === key),
)
const GENDER_SERIES = [
  { key: 'female', label: GENDERS.female, color: 'var(--series-blue)' },
  { key: 'male', label: GENDERS.male, color: 'var(--series-orange)' },
  { key: 'unisex', label: GENDERS.unisex, color: 'var(--series-aqua)' },
]
const YEAR_NOTE =
  "Le nombre sous chaque décennie est le nombre de parfums. Il y en a peu avant 1990 ; 18 % des parfums n'ont pas d'année et ne sont pas comptés ; les années 2020 incluent 2026, encore en cours."

// [{ decade, <clé>, count }] -> colonnes { key, label, total, counts }
function toColumns(rows, keyOf) {
  const byDecade = new Map()
  for (const row of rows) {
    if (!byDecade.has(row.decade)) {
      byDecade.set(row.decade, { key: row.decade, label: String(row.decade), total: 0, counts: {} })
    }
    const column = byDecade.get(row.decade)
    const key = keyOf(row)
    column.counts[key] = (column.counts[key] ?? 0) + row.count
    column.total += row.count
  }
  return [...byDecade.values()].sort((a, b) => a.key - b.key)
}

const shareIn = (column, key) => (column ? (column.counts[key] ?? 0) / column.total : 0)

export default function DatavizPage() {
  usePageTitle('Les parfums en chiffres')
  return (
    <div>
      <h1 className="text-2xl font-bold">Les parfums en chiffres</h1>
      <p className="mt-1 text-sm text-muted">
        Ce que racontent les 140 000 parfums du dataset. Survolez ou touchez les graphiques pour le
        détail ; chaque graphique a aussi son tableau de données.
      </p>
      <div className="mt-6 space-y-6">
        <TopNotesSection />
        <FamiliesSection />
        <GenderSection />
        <SeasonSection />
        <BrandSection />
      </div>
    </div>
  )
}

function TopNotesSection() {
  const [family, setFamily] = useState('')
  const state = useFetch(`/api/notes?limit=15&family=${family}`)
  const notes = state.data ?? []
  const top = notes[0]

  return (
    <ChartCard
      title={top ? `${top.name} est la note la plus utilisée${family ? ` chez les ${FAMILIES[family].toLowerCase()}` : ''}` : 'Les notes les plus utilisées'}
      subtitle="Nombre de parfums qui contiennent chaque note (15 premières). Touchez une barre pour ouvrir la note."
      state={state}
      chartHeight={470}
      table={
        <DataTable
          columns={[{ label: 'Note' }, { label: 'Parfums', align: 'right' }]}
          rows={notes.map((n) => [n.name, formatInt(n.perfume_count)])}
        />
      }
    >
      <div className="mb-3">
        <FilterChips
          label="Famille"
          options={[{ value: '', label: 'Toutes' }, ...Object.entries(FAMILIES).map(([value, label]) => ({ value, label }))]}
          value={family}
          onChange={setFamily}
        />
      </div>
      <div className={state.loading ? 'opacity-50' : ''}>
        <BarList
          items={notes.map((n) => ({ key: n.id, label: n.name, value: n.perfume_count, href: `/notes/${n.id}` }))}
          formatValue={formatInt}
        />
      </div>
    </ChartCard>
  )
}

function FamiliesSection() {
  const state = useFetch('/api/stats/families-by-decade')
  const columns = toColumns(state.data ?? [], (row) => mapGroupOf(row.family).key)
  const first = columns[0]
  const last = columns.at(-1)

  return (
    <ChartCard
      title={
        first && last
          ? `Les fruités et gourmands passent de ${formatPercent(shareIn(first, 'gourmand'))} à ${formatPercent(shareIn(last, 'gourmand'))} des parfums, les verts et aromatiques de ${formatPercent(shareIn(first, 'green'))} à ${formatPercent(shareIn(last, 'green'))}`
          : "L'évolution des familles"
      }
      subtitle="Répartition des parfums sortis chaque décennie, selon la famille de leur accord principal."
      note={YEAR_NOTE}
      state={state}
      chartHeight={280}
      table={
        <DataTable
          columns={[{ label: 'Décennie' }, ...FAMILY_SERIES.map((s) => ({ label: s.label, align: 'right' })), { label: 'Parfums', align: 'right' }]}
          rows={columns.map((c) => [c.label, ...FAMILY_SERIES.map((s) => formatPercent(shareIn(c, s.key))), formatInt(c.total)])}
        />
      }
    >
      {columns.length > 0 && <StackedColumns columns={columns} series={FAMILY_SERIES} />}
    </ChartCard>
  )
}

function GenderSection() {
  const state = useFetch('/api/stats/gender-by-decade')
  const columns = toColumns(state.data ?? [], (row) => row.gender)
  const nineties = columns.find((c) => c.key === 1990)
  const last = columns.at(-1)

  return (
    <ChartCard
      title={
        nineties && last
          ? `Les parfums mixtes passent de ${formatPercent(shareIn(nineties, 'unisex'))} des sorties dans les années 1990 à ${formatPercent(shareIn(last, 'unisex'))} dans les années ${last.label}`
          : 'Le boom des parfums mixtes'
      }
      subtitle="Répartition des parfums sortis chaque décennie selon le genre indiqué par Fragrantica."
      note={YEAR_NOTE}
      state={state}
      chartHeight={280}
      table={
        <DataTable
          columns={[{ label: 'Décennie' }, ...GENDER_SERIES.map((s) => ({ label: s.label, align: 'right' })), { label: 'Parfums', align: 'right' }]}
          rows={columns.map((c) => [c.label, ...GENDER_SERIES.map((s) => formatPercent(shareIn(c, s.key))), formatInt(c.total)])}
        />
      }
    >
      {columns.length > 0 && <StackedColumns columns={columns} series={GENDER_SERIES} />}
    </ChartCard>
  )
}

function SeasonSection() {
  const state = useFetch('/api/stats/season-accords')
  const all = state.data ?? []
  // Les 8 accords les plus « hiver » et les 8 plus « été » (la liste arrive triée)
  const shown = all.length > 16 ? [...all.slice(0, 8), ...all.slice(-8)] : all
  const name = (a) => ACCORDS[a.accord] ?? a.accord

  return (
    <ChartCard
      title={
        all.length >= 4
          ? `L'hiver appelle ${name(all[0])} et ${name(all[1])}, l'été ${name(all.at(-1))} et ${name(all.at(-2))}`
          : 'Accords d’hiver et accords d’été'
      }
      subtitle="Pour chaque accord : part des votes « été » moins part des votes « hiver » des parfums qui le contiennent, en points (parfums d'au moins 100 votants)."
      note={`Les 8 accords les plus marqués de chaque côté, sur ${all.length} accords présents dans au moins 300 parfums (tous dans le tableau).`}
      state={state}
      chartHeight={420}
      table={
        <DataTable
          columns={[{ label: 'Accord' }, { label: 'Été − hiver (points)', align: 'right' }, { label: 'Parfums', align: 'right' }]}
          rows={all.map((a) => [name(a), formatLean(a.lean), formatInt(a.perfumes)])}
        />
      }
    >
      {shown.length > 0 && <SeasonAccordsChart accords={shown} />}
    </ChartCard>
  )
}

function BrandSection() {
  const state = useFetch('/api/stats/brand-accords')
  const rows = state.data ?? []
  const brands = [...new Set(rows.map((r) => r.brand))]
  const shares = new Map(rows.map((r) => [`${r.brand}|${r.accord}`, r.share]))
  const share = (brand, accord) => shares.get(`${brand}|${accord}`) ?? 0

  // Colonnes : les 10 accords les plus présents en moyenne chez ces marques
  const accordTotals = new Map()
  for (const r of rows) accordTotals.set(r.accord, (accordTotals.get(r.accord) ?? 0) + r.share)
  const accords = [...accordTotals].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([accord]) => accord)

  return (
    <ChartCard
      title="Chaque grande marque a sa signature"
      subtitle="Part des parfums de chaque marque (au moins 100 votants) où l'accord figure parmi les 3 principaux. Les 12 marques les plus populaires, les 10 accords les plus fréquents chez elles."
      state={state}
      chartHeight={540}
      table={
        <DataTable
          columns={[{ label: 'Marque' }, ...accords.map((a) => ({ label: ACCORDS[a] ?? a, align: 'right' }))]}
          rows={brands.map((b) => [b, ...accords.map((a) => formatPercent(share(b, a)))])}
        />
      }
    >
      {brands.length > 0 && <BrandHeatmap brands={brands} accords={accords} share={share} />}
    </ChartCard>
  )
}
