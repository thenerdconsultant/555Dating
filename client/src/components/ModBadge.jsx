export default function ModBadge({ isModerator, size = 'sm' }) {
  if (!isModerator) return null

  const sizes = {
    xs: {
      fontSize: '0.6875rem',
      padding: '2px 4px'
    },
    sm: {
      fontSize: '0.75rem',
      padding: '2px 6px'
    },
    md: {
      fontSize: '0.875rem',
      padding: '4px 8px'
    }
  }

  return (
    <span
      className="pill"
      style={{
        ...sizes[size],
        background: 'var(--accent-light)',
        color: 'var(--accent)',
        borderColor: 'var(--accent)',
        fontWeight: 600
      }}
    >
      🛡️ MOD
    </span>
  )
}
