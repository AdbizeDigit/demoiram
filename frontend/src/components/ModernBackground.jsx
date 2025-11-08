function ModernBackground() {
  return (
    <>
      {/* Gradient Background */}
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"></div>

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Large subtle orbs */}
        <div
          className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-200/40 to-blue-300/40 rounded-full blur-3xl"
          style={{
            animation: 'float 20s ease-in-out infinite',
            animationDelay: '0s'
          }}
        ></div>

        <div
          className="absolute top-1/4 -right-40 w-96 h-96 bg-gradient-to-br from-purple-200/40 to-pink-300/40 rounded-full blur-3xl"
          style={{
            animation: 'float 25s ease-in-out infinite',
            animationDelay: '-10s'
          }}
        ></div>

        <div
          className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-yellow-200/30 to-orange-200/30 rounded-full blur-3xl"
          style={{
            animation: 'float 30s ease-in-out infinite',
            animationDelay: '-15s'
          }}
        ></div>

        <div
          className="absolute top-1/2 right-1/4 w-72 h-72 bg-gradient-to-br from-green-200/30 to-teal-200/30 rounded-full blur-3xl"
          style={{
            animation: 'float 22s ease-in-out infinite',
            animationDelay: '-5s'
          }}
        ></div>

        {/* Small accent orbs */}
        <div
          className="absolute top-20 left-1/4 w-40 h-40 bg-gradient-to-br from-indigo-300/50 to-blue-400/50 rounded-full blur-2xl"
          style={{
            animation: 'float 15s ease-in-out infinite',
            animationDelay: '-3s'
          }}
        ></div>

        <div
          className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-gradient-to-br from-pink-300/50 to-rose-400/50 rounded-full blur-2xl"
          style={{
            animation: 'float 18s ease-in-out infinite',
            animationDelay: '-8s'
          }}
        ></div>
      </div>

      {/* Subtle grid pattern overlay */}
      <div
        className="fixed inset-0 -z-5 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(0,0,0) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(0,0,0) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      ></div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 30px) scale(0.9);
          }
        }
      `}</style>
    </>
  )
}

export default ModernBackground
