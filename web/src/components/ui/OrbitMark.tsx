/** The same two equal planets used by the launcher and app chrome. */
export function OrbitMark({ className = '' }: { className?: string }) {
  return (
    <img
      className={`orbit-mark ${className}`}
      src={`${import.meta.env.BASE_URL}orbit.svg`}
      alt=""
      aria-hidden="true"
      width="110"
      height="110"
    />
  )
}
