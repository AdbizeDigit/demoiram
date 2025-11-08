import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

function CustomCursor() {
  const cursorRef = useRef(null);
  const isInitCursor = useRef(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const handleMouseMove = (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      if (!isInitCursor.current) {
        gsap.to(cursor, { opacity: 1, duration: 0.5 });
        isInitCursor.current = true;
      }

      gsap.to(cursor, {
        top: mouseY + "px",
        left: mouseX + "px",
        duration: 0
      });
    };

    const handleTouchMove = (e) => {
      const mouseX = e.touches[0].clientX;
      const mouseY = e.touches[0].clientY;

      if (!isInitCursor.current) {
        gsap.to(cursor, { opacity: 1, duration: 0.3 });
        isInitCursor.current = true;
      }

      gsap.to(cursor, {
        top: mouseY + "px",
        left: mouseX + "px",
        duration: 0
      });
    };

    const handleMouseOut = () => {
      gsap.to(cursor, { opacity: 0, duration: 0.3 });
      isInitCursor.current = false;
    };

    const handleTouchStart = () => {
      gsap.to(cursor, { opacity: 1, duration: 0.3 });
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        gsap.to(cursor, { opacity: 0, duration: 0.3 });
      }, 200);
    };

    const handleLinkHover = () => {
      cursor.classList.add('custom-cursor--link');
    };

    const handleLinkLeave = () => {
      cursor.classList.remove('custom-cursor--link');
    };

    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    // Add hover effect for links
    const links = document.querySelectorAll('a, button');
    links.forEach(link => {
      link.addEventListener('mouseenter', handleLinkHover);
      link.addEventListener('mouseleave', handleLinkLeave);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);

      links.forEach(link => {
        link.removeEventListener('mouseenter', handleLinkHover);
        link.removeEventListener('mouseleave', handleLinkLeave);
      });
    };
  }, []);

  return <div ref={cursorRef} className="custom-cursor" />;
}

export default CustomCursor;
