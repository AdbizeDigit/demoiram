function WhatsAppButton() {
  const whatsappNumber = "5493364200507"
  const whatsappURL = `https://wa.me/${whatsappNumber}`

  return (
    <a
      href={whatsappURL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="Contactar por WhatsApp"
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300 animate-pulse"></div>

        {/* Button */}
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden shadow-2xl transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
          <img
            src="/Generated Image November 08, 2025 - 2_53AM (1).png"
            alt="WhatsApp"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Ripple effect on hover */}
        <div className="absolute inset-0 rounded-full border-2 border-green-400 opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-500"></div>
      </div>

      {/* Tooltip */}
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg">
        <span className="text-sm font-medium">Chatea con nosotros</span>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-l-8 border-l-gray-900 border-y-4 border-y-transparent"></div>
      </div>
    </a>
  )
}

export default WhatsAppButton
