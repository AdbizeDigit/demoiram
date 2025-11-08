import ShaderFluidBackground from './ShaderFluidBackground'
import LazyImage from './LazyImage'

function ContactSection() {
  return (
    <div className="mt-32 w-full">
      <h2 className="text-5xl md:text-7xl font-black text-center mb-8 shader-text w-full">
        CONTACTO
      </h2>
      <p className="text-lg text-gray-600 text-center max-w-4xl mx-auto mb-16 leading-relaxed">
        ¿Tienes un proyecto en mente? Nos encantaría escucharte. Completa el formulario y nos pondremos en contacto contigo lo antes posible.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Formulario de Contacto */}
        <div className="group relative">
          <div className="absolute -inset-[3px] rounded-3xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-500">
            <ShaderFluidBackground />
          </div>
          <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-2xl p-8">
            <h3 className="text-2xl font-black bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent mb-6">
              Envíanos un Mensaje
            </h3>

            <form action="https://formsubmit.co/contacto@adbize.com" method="POST" className="space-y-6">
              {/* Honeypot */}
              <input type="text" name="_honey" style={{ display: 'none' }} />
              {/* Disable Captcha */}
              <input type="hidden" name="_captcha" value="false" />
              {/* Success Page */}
              <input type="hidden" name="_next" value={window.location.href} />
              <input type="hidden" name="_subject" value="Nuevo contacto desde landing Adbize" />

              {/* Nombre */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  placeholder="Tu nombre"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  placeholder="tu@email.com"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  placeholder="+54 9 XXX XXX-XXXX"
                />
              </div>

              {/* Mensaje */}
              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  Mensaje
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows="5"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors duration-300 resize-none"
                  placeholder="Cuéntanos sobre tu proyecto..."
                ></textarea>
              </div>

              {/* Submit Button */}
              <button type="submit" className="w-full relative group/btn overflow-hidden rounded-xl">
                <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl opacity-100 group-hover/btn:opacity-0 transition-opacity duration-300"></div>
                <div className="absolute -inset-[2px] rounded-xl overflow-hidden opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300">
                  <ShaderFluidBackground />
                </div>
                <div className="relative bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 text-white font-bold text-center">
                  Enviar Mensaje
                </div>
              </button>
            </form>
          </div>
        </div>

        {/* Información de Contacto y Redes Sociales */}
        <div className="space-y-8">
          {/* Character Image */}
          <div className="flex justify-center">
            <div className="w-80 h-80">
              <LazyImage
                src="/personajes/Generated Image November 07, 2025 - 8_21PM.png"
                alt="Contacto Character"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="group relative">
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <ShaderFluidBackground />
            </div>
            <a
              href="https://wa.me/5493364200507"
              target="_blank"
              rel="noopener noreferrer"
              className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg flex items-center space-x-4 hover:scale-[1.02] transition-transform duration-300 block"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg">WhatsApp</h4>
                <p className="text-gray-600">+54 9 3364 20-0507</p>
              </div>
            </a>
          </div>

          {/* Email */}
          <div className="group relative">
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <ShaderFluidBackground />
            </div>
            <a
              href="mailto:contacto@adbize.com"
              className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg flex items-center space-x-4 hover:scale-[1.02] transition-transform duration-300 block"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg">Email</h4>
                <p className="text-gray-600">contacto@adbize.com</p>
              </div>
            </a>
          </div>

          {/* Redes Sociales */}
          <div>
            <div className="flex justify-center space-x-4">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/adbizedigital"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* X */}
              <a
                href="https://x.com/adbizedigit"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-gray-900 hover:bg-gray-800 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/adbizedigital/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/adbizedigital"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactSection
