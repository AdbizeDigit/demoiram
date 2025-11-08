import { useState, useEffect, useRef } from 'react'

function AnimatedCard({ children, direction = 'left', delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const currentRef = cardRef.current

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            timeoutRef.current = setTimeout(() => {
              setIsVisible(true)
            }, delay)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )

    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [delay, isVisible])

  const getInitialTransform = () => {
    switch (direction) {
      case 'left':
        // Aparece desde la derecha hacia la izquierda
        return 'translateX(150px)'
      case 'right':
        // Aparece desde la izquierda hacia la derecha
        return 'translateX(-150px)'
      case 'top':
        return 'translateY(-150px)'
      case 'bottom':
        return 'translateY(150px)'
      default:
        return 'translateX(150px)'
    }
  }

  return (
    <div
      ref={cardRef}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0, 0) scale(1)' : `${getInitialTransform()} scale(0.8)`,
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        willChange: isVisible ? 'auto' : 'opacity, transform'
      }}
    >
      {children}
    </div>
  )
}

export default AnimatedCard
