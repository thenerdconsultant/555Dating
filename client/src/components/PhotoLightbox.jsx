import { useEffect, useState } from 'react'
import { assetUrl } from '../api'

export default function PhotoLightbox({ photos, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  useEffect(() => {
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }
  }

  if (!photos || photos.length === 0) return null

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        ✕
      </button>

      <div
        className="lightbox-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={assetUrl(photos[currentIndex])}
          alt={`Photo ${currentIndex + 1}`}
          className="lightbox-image"
        />

        {photos.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                className="lightbox-nav lightbox-prev"
                onClick={goToPrevious}
                aria-label="Previous photo"
              >
                ‹
              </button>
            )}

            {currentIndex < photos.length - 1 && (
              <button
                className="lightbox-nav lightbox-next"
                onClick={goToNext}
                aria-label="Next photo"
              >
                ›
              </button>
            )}

            <div className="lightbox-counter">
              {currentIndex + 1} / {photos.length}
            </div>

            <div className="lightbox-thumbnails">
              {photos.map((photo, idx) => (
                <button
                  key={idx}
                  className={`lightbox-thumbnail ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  <img src={assetUrl(photo)} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
