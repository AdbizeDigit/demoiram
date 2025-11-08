function GooeyWaves() {
  return (
    <>
      {/* Fondo con blobs líquidos gomosos */}
      <div className="liquid-blob-bg"></div>

      {/* Olas en la parte inferior */}
      <div className="wave-container">
        <div className="wave-layer wave-layer-1">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path
              d="M0,0 C150,100 350,0 600,50 C850,100 1050,0 1200,50 L1200,120 L0,120 Z"
              fill="url(#wave-gradient-1)"
              opacity="0.3"
            />
            <defs>
              <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="50%" stopColor="#4facfe" />
                <stop offset="100%" stopColor="#667eea" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="wave-layer wave-layer-2">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path
              d="M0,50 C200,0 400,100 600,50 C800,0 1000,100 1200,50 L1200,120 L0,120 Z"
              fill="url(#wave-gradient-2)"
              opacity="0.4"
            />
            <defs>
              <linearGradient id="wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#764ba2" />
                <stop offset="50%" stopColor="#f093fb" />
                <stop offset="100%" stopColor="#fa709a" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="wave-layer wave-layer-3">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path
              d="M0,30 C300,80 500,0 600,40 C700,80 900,10 1200,60 L1200,120 L0,120 Z"
              fill="url(#wave-gradient-3)"
              opacity="0.5"
            />
            <defs>
              <linearGradient id="wave-gradient-3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f093fb" />
                <stop offset="50%" stopColor="#fee140" />
                <stop offset="100%" stopColor="#fa709a" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Blobs gomosos flotantes adicionales */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-cyan-300 to-blue-500 rounded-full gooey-blob opacity-20"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full gooey-blob opacity-20" style={{ animationDelay: '-5s' }}></div>
        <div className="absolute bottom-32 left-1/3 w-96 h-96 bg-gradient-to-br from-yellow-300 to-orange-500 rounded-full gooey-blob opacity-15" style={{ animationDelay: '-10s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-gradient-to-br from-green-300 to-teal-500 rounded-full gooey-blob opacity-20" style={{ animationDelay: '-15s' }}></div>
      </div>
    </>
  )
}

export default GooeyWaves
