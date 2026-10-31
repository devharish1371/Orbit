import { OrbitGlyph, type OrbitDestination } from './OrbitGlyph'
export function SectionHeading({
  title,
  kind,
}: {
  title: string
  kind: OrbitDestination
}) {
  return (
    <header className="page-heading section-heading">
      <h1>{title}</h1>
      <span className="heading-object" aria-hidden="true">
        <OrbitGlyph name={kind} />
      </span>
    </header>
  )
}
