import type { Configuration } from './engine/xml'

/** Preserve imported and typed robot colors; structural colors follow the theme. */
export default function BoardPreview({ config, name }: { config: Configuration; name: string }) {
  const types = new Map(config.robotTypes?.map((type) => [type.id, type]))
  return <svg viewBox={`0 0 ${config.cols} ${config.rows}`} role="img" aria-label={`${name} board preview`}>
    <rect width={config.cols} height={config.rows} fill="var(--color-surface)" />
    {config.tiles.map((tile, i) => <rect key={i} x={tile.x} y={tile.y} width="1" height="1"
      fill={tile.isConcrete ? 'var(--color-wall)' : types.get(tile.typeId ?? '')?.color ?? tile.color ?? 'var(--color-robot)'} />)}
  </svg>
}
