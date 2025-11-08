import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { AJS } from '../utils/easing';

function AnimatedNav() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const animationFrameRef = useRef(null);
  const topLineRef = useRef(null);
  const middleLineRef = useRef(null);
  const bottomLineRef = useRef(null);

  const menuItems = [
    { name: 'Inicio', path: '#home' },
    { name: 'Nosotros', path: '#about' },
    { name: 'Soluciones', path: '#solutions' },
    { name: 'Desarrollos', path: '#developments' },
    { name: 'Contacto', path: '#contact' },
  ];

  const contactItems = [
    { name: 'Email', value: 'contact@adbize.com', link: 'mailto:contact@adbize.com' },
    { name: 'Phone', value: '+1 234 567 890', link: 'tel:+1234567890' },
  ];

  const socialLinks = [
    { name: 'LinkedIn', link: '#' },
    { name: 'Twitter', link: '#' },
    { name: 'GitHub', link: '#' },
  ];

  useEffect(() => {
    let currentFrame = 1;
    const segmentDuration = 15;
    let state = isOpen ? 'animating-to-arrow' : 'animating-to-menu';

    const animate = () => {
      const topLine = topLineRef.current;
      const middleLine = middleLineRef.current;
      const bottomLine = bottomLineRef.current;

      if (!topLine || !middleLine || !bottomLine) return;

      if (isOpen) {
        // Animate to X (close button)
        if (currentFrame <= segmentDuration) {
          // Menu disappear - lines move to center
          const topLineY = AJS.easeInBack(37, 50, segmentDuration, currentFrame);
          const bottomLineY = AJS.easeInBack(63, 50, segmentDuration, currentFrame);
          topLine.setAttribute('d', `M30,${topLineY} L70,${topLineY}`);
          bottomLine.setAttribute('d', `M30,${bottomLineY} L70,${bottomLineY}`);

          if (currentFrame === segmentDuration) {
            middleLine.style.opacity = '0';
            currentFrame = 0;
          }
          currentFrame++;
          animationFrameRef.current = requestAnimationFrame(animate);
        } else if (currentFrame <= segmentDuration * 2) {
          // Arrow appear - lines rotate to X
          const topLeftX = AJS.easeOutBack(30, 35, segmentDuration, currentFrame - segmentDuration);
          const topLeftY = AJS.easeOutBack(50, 35, segmentDuration, currentFrame - segmentDuration);
          const bottomRightX = AJS.easeOutBack(70, 65, segmentDuration, currentFrame - segmentDuration);
          const bottomRightY = AJS.easeOutBack(50, 65, segmentDuration, currentFrame - segmentDuration);

          const bottomLeftX = AJS.easeOutBack(30, 35, segmentDuration, currentFrame - segmentDuration);
          const bottomLeftY = AJS.easeOutBack(50, 65, segmentDuration, currentFrame - segmentDuration);
          const topRightX = AJS.easeOutBack(70, 65, segmentDuration, currentFrame - segmentDuration);
          const topRightY = AJS.easeOutBack(50, 35, segmentDuration, currentFrame - segmentDuration);

          topLine.setAttribute('d', `M${topLeftX},${topLeftY} L${bottomRightX},${bottomRightY}`);
          bottomLine.setAttribute('d', `M${bottomLeftX},${bottomLeftY} L${topRightX},${topRightY}`);

          currentFrame++;
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      } else {
        // Animate to menu (hamburger)
        if (currentFrame <= segmentDuration) {
          // Arrow disappear - X lines move to horizontal center
          const topLeftX = AJS.easeInBack(35, 30, segmentDuration, currentFrame);
          const topLeftY = AJS.easeInBack(35, 50, segmentDuration, currentFrame);
          const bottomRightX = AJS.easeInBack(65, 70, segmentDuration, currentFrame);
          const bottomRightY = AJS.easeInBack(65, 50, segmentDuration, currentFrame);

          const bottomLeftX = AJS.easeInBack(35, 30, segmentDuration, currentFrame);
          const bottomLeftY = AJS.easeInBack(65, 50, segmentDuration, currentFrame);
          const topRightX = AJS.easeInBack(65, 70, segmentDuration, currentFrame);
          const topRightY = AJS.easeInBack(35, 50, segmentDuration, currentFrame);

          topLine.setAttribute('d', `M${topLeftX},${topLeftY} L${bottomRightX},${bottomRightY}`);
          bottomLine.setAttribute('d', `M${bottomLeftX},${bottomLeftY} L${topRightX},${topRightY}`);

          if (currentFrame === segmentDuration) {
            middleLine.style.opacity = '1';
            currentFrame = 0;
          }
          currentFrame++;
          animationFrameRef.current = requestAnimationFrame(animate);
        } else if (currentFrame <= segmentDuration * 2) {
          // Menu appear - lines move to hamburger positions
          const topLineY = AJS.easeOutBack(50, 37, segmentDuration, currentFrame - segmentDuration);
          const bottomLineY = AJS.easeOutBack(50, 63, segmentDuration, currentFrame - segmentDuration);

          topLine.setAttribute('d', `M30,${topLineY} L70,${topLineY}`);
          bottomLine.setAttribute('d', `M30,${bottomLineY} L70,${bottomLineY}`);

          currentFrame++;
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      }
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  const handleNavigation = (path) => {
    setIsOpen(false);

    // Si es un anchor link (comienza con #), hacer scroll suave
    if (path.startsWith('#')) {
      const element = document.querySelector(path);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Si es una ruta normal, usar navigate
      navigate(path);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  return (
    <>
      {/* Modern Glassmorphism Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="relative">
            {/* Glass Container */}
            <div className="relative backdrop-blur-md rounded-2xl border border-white/10" style={{ background: 'rgba(0, 0, 0, 0.1)' }}>
              <div className="flex justify-between items-center px-6 py-4">
                {/* Logo */}
                <div
                  className="cursor-pointer transition-transform duration-300 hover:scale-105"
                  onClick={() => handleNavigation('/')}
                >
                  <img
                    src="/logo2023.png"
                    alt="Adbize Logo"
                    className="h-6 md:h-8 w-auto object-contain filter drop-shadow-lg"
                  />
                </div>

                {/* Desktop Navigation Links */}
                <div className="hidden lg:flex items-center gap-6">
                  {menuItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.path)}
                      className="text-white font-semibold text-base hover:text-purple-300 transition-colors duration-300 relative group"
                    >
                      {item.name}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-300 transition-all duration-300 group-hover:w-full"></span>
                    </button>
                  ))}

                  {/* Auth Buttons */}
                  <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/20">
                    {isAuthenticated ? (
                      <>
                        <button
                          onClick={() => handleNavigation('/dashboard')}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-white font-semibold transition-all duration-300 border border-white/20"
                        >
                          <User size={18} />
                          <span className="text-sm">{user?.name?.split(' ')[0] || 'Usuario'}</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm rounded-lg text-white font-semibold transition-all duration-300"
                        >
                          <LogOut size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleNavigation('/login')}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-white font-semibold transition-all duration-300 border border-white/20"
                        >
                          <LogIn size={18} />
                          <span className="text-sm">Iniciar Sesión</span>
                        </button>
                        <button
                          onClick={() => handleNavigation('/register')}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white font-semibold transition-all duration-300 shadow-lg shadow-purple-500/30"
                        >
                          <UserPlus size={18} />
                          <span className="text-sm">Registrarse</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="lg:hidden relative w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50 group"
                >
                  <svg viewBox="0 0 100 100" className="w-8 h-8">
                    <line
                      ref={topLineRef}
                      id="top-line-1"
                      x1="30"
                      y1="37"
                      x2="70"
                      y2="37"
                      className="stroke-current text-white transition-all duration-300"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <line
                      ref={middleLineRef}
                      id="middle-line-1"
                      x1="30"
                      y1="50"
                      x2="70"
                      y2="50"
                      className="stroke-current text-white transition-all duration-300"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <line
                      ref={bottomLineRef}
                      id="bottom-line-1"
                      x1="30"
                      y1="63"
                      x2="70"
                      y2="63"
                      className="stroke-current text-white transition-all duration-300"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Modern Fullscreen Menu */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-700 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      >
        <div className="h-full flex flex-col lg:flex-row">
          {/* Navigation Menu Column */}
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center lg:text-left space-y-8">
              {/* Logo in Menu */}
              <div className="mb-12 flex justify-center lg:justify-start">
                <img
                  src="/logo2023.png"
                  alt="Adbize Logo"
                  className="h-16 w-auto object-contain filter drop-shadow-2xl"
                />
              </div>

              <h2 className="text-5xl md:text-6xl font-black text-white mb-12 shader-text">
                Navegación
              </h2>
              <ul className="space-y-6">
                {menuItems.map((item, index) => (
                  <li
                    key={item.name}
                    className="transform transition-all duration-500"
                    style={{
                      transitionDelay: isOpen ? `${index * 100}ms` : '0ms',
                      transform: isOpen ? 'translateX(0)' : 'translateX(-50px)',
                      opacity: isOpen ? 1 : 0
                    }}
                  >
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigation(item.path);
                      }}
                      className="inline-block text-4xl md:text-5xl font-bold text-white hover:text-yellow-300 transition-all duration-300 hover:translate-x-4 relative group"
                    >
                      <span className="relative z-10">{item.name}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-1 bg-yellow-300 transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                ))}
              </ul>

              {/* Mobile Auth Section */}
              <div className="mt-12 pt-8 border-t border-white/20">
                {isAuthenticated ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => handleNavigation('/dashboard')}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white font-bold text-xl transition-all duration-300 border border-white/20"
                    >
                      <User size={24} />
                      <span>{user?.name || 'Mi Cuenta'}</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm rounded-xl text-white font-bold text-xl transition-all duration-300"
                    >
                      <LogOut size={24} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={() => handleNavigation('/login')}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white font-bold text-xl transition-all duration-300 border border-white/20"
                    >
                      <LogIn size={24} />
                      <span>Iniciar Sesión</span>
                    </button>
                    <button
                      onClick={() => handleNavigation('/register')}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-bold text-xl transition-all duration-300 shadow-lg shadow-purple-500/30"
                    >
                      <UserPlus size={24} />
                      <span>Registrarse</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Column */}
          <div className="flex-1 flex items-center justify-center p-12 bg-black/20">
            <div className="text-center lg:text-left space-y-8">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-12 shader-text">
                Contacto
              </h2>

              <div className="space-y-8">
                {contactItems.map((item, index) => (
                  <div
                    key={item.name}
                    className="transform transition-all duration-500"
                    style={{
                      transitionDelay: isOpen ? `${(index + 3) * 100}ms` : '0ms',
                      transform: isOpen ? 'translateX(0)' : 'translateX(50px)',
                      opacity: isOpen ? 1 : 0
                    }}
                  >
                    <p className="text-white/70 text-sm md:text-base mb-2 uppercase tracking-wider">
                      {item.name}
                    </p>
                    <a
                      href={item.link}
                      className="text-2xl md:text-3xl font-bold text-white hover:text-yellow-300 transition-colors duration-300 block"
                    >
                      {item.value}
                    </a>
                  </div>
                ))}
              </div>

              <div className="pt-8 space-x-6">
                <p className="text-white/70 text-sm md:text-base mb-4 uppercase tracking-wider">
                  Síguenos
                </p>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  {socialLinks.map((item, index) => (
                    <a
                      key={item.name}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white font-semibold transition-all duration-300 hover:scale-110 hover:shadow-lg border border-white/20"
                      style={{
                        transitionDelay: isOpen ? `${(index + 5) * 100}ms` : '0ms',
                        transform: isOpen ? 'scale(1)' : 'scale(0.8)',
                        opacity: isOpen ? 1 : 0
                      }}
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AnimatedNav;
