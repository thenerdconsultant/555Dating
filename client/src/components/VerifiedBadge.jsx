export default function VerifiedBadge({ isVerified, size = 'sm' }) {
  if (!isVerified) return null

  const sizes = {
    xs: {
      width: 14,
      height: 14
    },
    sm: {
      width: 18,
      height: 18
    },
    md: {
      width: 24,
      height: 24
    }
  }

  return (
    <span
      className="verified-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: sizes[size].width,
        height: sizes[size].height
      }}
      title="Verified Profile"
      aria-label="Verified"
    >
      ✓
    </span>
  )
}
