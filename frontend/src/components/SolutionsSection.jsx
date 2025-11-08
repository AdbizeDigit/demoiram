import ShaderFluidBackground from './ShaderFluidBackground'
import LazyImage from './LazyImage'

function SolutionsSection() {
  return (
    <div className="w-full">
      <h2 className="text-5xl md:text-7xl font-black text-center mb-8 shader-text w-full">
        NUESTRAS SOLUCIONES
      </h2>
      <p className="text-lg text-gray-600 text-center max-w-4xl mx-auto mb-16 leading-relaxed">
        Transformamos ideas en realidad a través de soluciones tecnológicas de vanguardia. Desde el desarrollo de aplicaciones hasta la implementación de inteligencia artificial avanzada, nuestro equipo está equipado con las herramientas y el conocimiento para llevar tu negocio al siguiente nivel.
      </p>

      {/* Services Grid - Innovative Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
        {/* Card 1 - Desarrollo Web y Mobile */}
        <div className="group">
          <div className="relative h-[520px] transition-all duration-300 ease-out transform group-hover:scale-[1.02]">
            {/* Animated Background Border */}
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <ShaderFluidBackground />
            </div>

            {/* Main Card */}
            <div className="relative h-full bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Number Badge */}
              <div className="absolute top-4 left-4 z-20">
                <span className="text-6xl font-black text-purple-200 group-hover:text-purple-300 transition-colors duration-300">01</span>
              </div>

              {/* Character Image */}
              <div className="absolute top-8 right-4 z-10 w-72 h-72 group-hover:scale-105 transition-transform duration-300">
                <LazyImage
                  src="/personajes/Generated Image November 07, 2025 - 5_04PM.png"
                  alt="Desarrollo Web"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-end p-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-black bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                    Desarrollo Web & Mobile
                  </h3>
                  <div className="h-1 w-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full group-hover:w-24 transition-all duration-300"></div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Creamos aplicaciones web y móviles escalables con las últimas tecnologías y frameworks modernos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 - Visión Artificial */}
        <div className="group">
          <div className="relative h-[520px] transition-all duration-300 ease-out transform group-hover:scale-[1.02]">
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <ShaderFluidBackground />
            </div>

            <div className="relative h-full bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="absolute top-4 left-4 z-20">
                <span className="text-6xl font-black text-indigo-200 group-hover:text-indigo-300 transition-colors duration-300">02</span>
              </div>

              <div className="absolute top-8 right-4 z-10 w-72 h-72 group-hover:scale-105 transition-transform duration-300">
                <LazyImage
                  src="/personajes/Generated Image November 07, 2025 - 5_06PM.png"
                  alt="Visión Artificial"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end p-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-black bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">
                    Visión Artificial
                  </h3>
                  <div className="h-1 w-16 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full group-hover:w-24 transition-all duration-300"></div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Soluciones de Computer Vision para detección de objetos, reconocimiento facial y análisis de imágenes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3 - Machine Learning */}
        <div className="group">
          <div className="relative h-[520px] transition-all duration-300 ease-out transform group-hover:scale-[1.02]">
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <ShaderFluidBackground />
            </div>

            <div className="relative h-full bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-rose-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="absolute top-4 left-4 z-20">
                <span className="text-6xl font-black text-rose-200 group-hover:text-rose-300 transition-colors duration-300">03</span>
              </div>

              <div className="absolute top-8 right-4 z-10 w-72 h-72 group-hover:scale-105 transition-transform duration-300">
                <LazyImage
                  src="/personajes/Generated Image November 07, 2025 - 11_22AM2.png"
                  alt="Machine Learning"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end p-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-black bg-gradient-to-r from-rose-500 to-rose-600 bg-clip-text text-transparent">
                    Machine Learning & Deep Learning
                  </h3>
                  <div className="h-1 w-16 bg-gradient-to-r from-rose-500 to-rose-600 rounded-full group-hover:w-24 transition-all duration-300"></div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Modelos predictivos y redes neuronales para análisis de datos avanzado y automatización inteligente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4 - APIs de LLMs */}
        <div className="group">
          <div className="relative h-[520px] transition-all duration-300 ease-out transform group-hover:scale-[1.02]">
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <ShaderFluidBackground />
            </div>

            <div className="relative h-full bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="absolute top-4 left-4 z-20">
                <span className="text-6xl font-black text-emerald-200 group-hover:text-emerald-300 transition-colors duration-300">04</span>
              </div>

              <div className="absolute top-8 right-4 z-10 w-72 h-72 group-hover:scale-105 transition-transform duration-300">
                <LazyImage
                  src="/personajes/Generated Image November 07, 2025 - 1_47PM.png"
                  alt="LLM APIs"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end p-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-black bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                    Integración de APIs de LLMs
                  </h3>
                  <div className="h-1 w-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full group-hover:w-24 transition-all duration-300"></div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Implementación de modelos de lenguaje avanzados (GPT, Claude, Gemini) para chatbots y asistentes inteligentes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5 - Consultoría */}
        <div className="group">
          <div className="relative h-[520px] transition-all duration-300 ease-out transform group-hover:scale-[1.02]">
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <ShaderFluidBackground />
            </div>

            <div className="relative h-full bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="absolute top-4 left-4 z-20">
                <span className="text-6xl font-black text-amber-200 group-hover:text-amber-300 transition-colors duration-300">05</span>
              </div>

              <div className="absolute top-8 right-4 z-10 w-72 h-72 group-hover:scale-105 transition-transform duration-300">
                <LazyImage
                  src="/personajes/Generated Image November 07, 2025 - 4_19PM.png"
                  alt="Consultoría"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end p-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-black bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
                    Consultoría en Estrategia de IA
                  </h3>
                  <div className="h-1 w-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full group-hover:w-24 transition-all duration-300"></div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Implementación estratégica y optimización de procesos empresariales con inteligencia artificial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 6 - Automatización */}
        <div className="group">
          <div className="relative h-[520px] transition-all duration-300 ease-out transform group-hover:scale-[1.02]">
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <ShaderFluidBackground />
            </div>

            <div className="relative h-full bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="absolute top-4 left-4 z-20">
                <span className="text-6xl font-black text-cyan-200 group-hover:text-cyan-300 transition-colors duration-300">06</span>
              </div>

              <div className="absolute top-8 right-4 z-10 w-72 h-72 group-hover:scale-105 transition-transform duration-300">
                <LazyImage
                  src="/personajes/Generated Image November 07, 2025 - 4_47PM.png"
                  alt="Automatización"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end p-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-black bg-gradient-to-r from-cyan-500 to-cyan-600 bg-clip-text text-transparent">
                    Automatización Inteligente
                  </h3>
                  <div className="h-1 w-16 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full group-hover:w-24 transition-all duration-300"></div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    RPA, workflows inteligentes y sistemas autónomos para maximizar la eficiencia empresarial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SolutionsSection
