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

      {/* Actual image - images already optimized by vite-plugin-imagemin */}
      {isInView && imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className || ''}`}
          onLoad={() => setIsLoaded(true)}
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
      )}
    </div>
  )
}

export default LazyImage
