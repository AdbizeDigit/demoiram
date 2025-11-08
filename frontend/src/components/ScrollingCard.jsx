import { useEffect, useRef } from 'react';
import ShaderFluidBackground from './ShaderFluidBackground';

function ScrollingCard({ image, title, delay = 0 }) {
  const scrollContainerRef = useRef(null);
  const animationIdRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Wait for delay before starting scroll
    const delayTimeout = setTimeout(() => {
      let position = 0;
      const scrollSpeed = 0.5; // pixels per frame

      const animate = () => {
        const maxScroll = container.scrollHeight - container.clientHeight;

        position += scrollSpeed;

        // Reset to top when reaching bottom
        if (position >= maxScroll) {
          position = 0;
        }

        container.scrollTop = position;
        animationIdRef.current = requestAnimationFrame(animate);
      };

      animationIdRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayTimeout);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [delay]);

  return (
    <div className="relative group">
      {/* Shader border */}
      <div className="absolute -inset-[3px] rounded-2xl overflow-hidden opacity-90 group-hover:opacity-100 transition-opacity duration-500">
        <ShaderFluidBackground />
      </div>

      {/* Card container */}
      <div className="relative bg-white rounded-xl overflow-hidden shadow-2xl">
        {/* Scrolling content */}
        <div
          ref={scrollContainerRef}
          className="h-[500px] overflow-hidden relative bg-gray-50"
          style={{ scrollBehavior: 'auto' }}
        >
          <img
            src={image}
            alt={title}
            className="w-full object-top object-contain"
            style={{ minHeight: '100%' }}
          />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-2">
          <div className="animate-bounce">
            <svg className="w-6 h-6 text-gray-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScrollingCard;
