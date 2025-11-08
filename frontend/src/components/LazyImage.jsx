import { useState, useEffect, useRef } from 'react'

function LazyImage({ src, alt, className, priority = false, blurDataURL, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(priority) // If priority, load immediately
  const [imageSrc, setImageSrc] = useState(null)
  const imgRef = useRef(null)

  useEffect(() => {
    // Skip observer if priority image
    if (priority) {
      setImageSrc(src)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            setImageSrc(src)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '200px', // Start loading 200px before the image enters viewport
        threshold: 0.01
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
    }
  }, [src, priority])

  // Get WebP version if available
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc) return originalSrc

    // Check if we should try WebP
    const supportsWebP = document.createElement('canvas')
      .toDataURL('image/webp')
      .indexOf('data:image/webp') === 0

    if (supportsWebP && originalSrc.match(/\.(jpg|jpeg|png)$/i)) {
      return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp')
    }

    return originalSrc
  }

  return (
    <div ref={imgRef} className="relative w-full h-full flex items-center justify-center">
      {/* Blur placeholder */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded"
          style={{
            ...(blurDataURL && {
              backgroundImage: `url(${blurDataURL})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(20px)',
              transform: 'scale(1.1)'
            }),
            ...(!blurDataURL && isInView && {
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            })
          }}
        />
      )}

      {/* Actual image with WebP support and fallback */}
      {isInView && imageSrc && (
        <picture>
          <source srcSet={getOptimizedSrc(imageSrc)} type="image/webp" />
          <img
            src={imageSrc}
            alt={alt}
            className={`transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className || ''}`}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
              // Fallback to original if WebP fails
              if (e.target.src !== imageSrc) {
                e.target.src = imageSrc
              }
            }}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
            {...props}
          />
        </picture>
      )}
    </div>
  )
}

export default LazyImage
