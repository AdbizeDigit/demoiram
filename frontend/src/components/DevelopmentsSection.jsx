import ShaderFluidBackground from './ShaderFluidBackground'
import LazyImage from './LazyImage'

function DevelopmentsSection() {
  return (
    <div className="mt-32 w-full">
      <h2 className="text-5xl md:text-7xl font-black text-center mb-8 shader-text w-full">
        NUESTROS DESARROLLOS
      </h2>
      <p className="text-lg text-gray-600 text-center max-w-4xl mx-auto mb-12 leading-relaxed">
        En Adbize, no solo ofrecemos servicios; creamos soluciones revolucionarias que transforman industrias. Nuestro equipo de expertos en IA y desarrollo de software trabaja incansablemente para dar vida a ideas innovadoras que resuelven desafíos reales y abren nuevas posibilidades para nuestros clientes.
      </p>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        {[
          'Interfaz Intuitiva y Fácil de Usar para Usuarios.',
          'Personalización y Escalabilidad según las Necesidades del Cliente.',
          'Automatización de Procesos para Aumentar la Productividad.',
          'Soporte Técnico Especializado y Actualizaciones Continuas.'
        ].map((feature, index) => (
          <div key={index} className="group relative">
            <div className="absolute -inset-[2px] rounded-xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <ShaderFluidBackground />
            </div>
            <div className="relative bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg h-full">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed font-medium">{feature}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="space-y-8">
        {/* Primera Fila - 2 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CLINIA - Asistente Médico */}
          <div className="group relative">
            <div className="absolute -inset-[3px] rounded-3xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-500">
              <ShaderFluidBackground />
            </div>
            <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-2xl">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Content */}
              <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className="text-3xl font-black bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent mb-2">
                      Asistente Médico Inteligente
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">CLINIA</span>
                      <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-16 h-16 ml-4">
                    <LazyImage
                      src="/certificaciones/Gemini_Generated_Image_bx111nbx111nbx11.png"
                      alt="CLINIA Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <p className="text-gray-600 leading-relaxed mb-6">
                  CLINIA revoluciona la práctica médica al poner el poder de la inteligencia artificial al servicio de los profesionales de la salud. Esta innovadora aplicación web proporciona a los médicos un apoyo integral basado en IA para optimizar diagnósticos, tratamientos y prescripciones de medicamentos.
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-semibold text-gray-700">Diagnósticos IA Precisos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-semibold text-gray-700">Tratamientos Personalizados</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bot Buddy - Asistente Virtual */}
          <div className="group relative">
            <div className="absolute -inset-[3px] rounded-3xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-500">
              <ShaderFluidBackground />
            </div>
            <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-2xl">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Content */}
              <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className="text-3xl font-black bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent mb-2">
                      Asistente Virtual Inteligente
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">Bot Buddy</span>
                      <div className="h-1 w-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-16 h-16 ml-4">
                    <LazyImage
                      src="/certificaciones/Gemini_Generated_Image_yyiw31yyiw31yyiw.png"
                      alt="Bot Buddy Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <p className="text-gray-600 leading-relaxed mb-6">
                  Bot Buddy es el complemento perfecto para elevar la experiencia de usuario en tu sitio WordPress. Este innovador plugin integra un chatbot impulsado por inteligencia artificial, diseñado para interactuar de manera natural y eficiente con tus visitantes.
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold text-gray-700">Soporte 24/7 Eficiente</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold text-gray-700">Interacción Natural</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Segunda Fila - 1 Columna (Vanthal) */}
        <div className="max-w-3xl mx-auto">
          <div className="group relative">
            <div className="absolute -inset-[3px] rounded-3xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-500">
              <ShaderFluidBackground />
            </div>
            <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-2xl">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#AB8C50]/5 via-transparent to-[#AB8C50]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Content */}
              <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className="text-3xl font-black bg-gradient-to-r from-[#AB8C50] to-[#D4AF6A] bg-clip-text text-transparent mb-2">
                      Agentes Inteligentes Jerárquicos
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">Vanthal</span>
                      <div className="h-1 w-12 bg-gradient-to-r from-[#AB8C50] to-[#D4AF6A] rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-16 h-16 ml-4">
                    <LazyImage
                      src="/certificaciones/logoicono.png"
                      alt="Vanthal Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <p className="text-gray-600 leading-relaxed mb-6">
                  Revolucioná tu empresa con agentes inteligentes jerárquicos. Vanthal automatiza procesos complejos con IA regenerativa y arquitectura jerárquica. Un nuevo paradigma para escalar productividad sin perder control ni contexto.
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-[#AB8C50]"></div>
                    <span className="text-sm font-semibold text-gray-700">IA Regenerativa</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-[#AB8C50]"></div>
                    <span className="text-sm font-semibold text-gray-700">Arquitectura Jerárquica</span>
                  </div>
                </div>

                {/* CTA Button */}
                <a href="https://www.vanthal.com/" target="_blank" rel="noopener noreferrer" className="block w-full">
                  <button className="w-full relative group/btn overflow-hidden rounded-xl">
                    <div className="absolute -inset-[2px] bg-gradient-to-r from-[#AB8C50] to-[#D4AF6A] rounded-xl opacity-100 group-hover/btn:opacity-0 transition-opacity duration-300"></div>
                    <div className="absolute -inset-[2px] rounded-xl overflow-hidden opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300">
                      <ShaderFluidBackground />
                    </div>
                    <div className="relative bg-gradient-to-r from-[#AB8C50] to-[#D4AF6A] px-6 py-3 text-white font-bold text-center">
                      Presiona y conoce más
                    </div>
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DevelopmentsSection
