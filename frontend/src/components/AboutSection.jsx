import ShaderFluidBackground from './ShaderFluidBackground'
import ScrollingCard from './ScrollingCard'
import LazyImage from './LazyImage'
import AnimatedCard from './AnimatedCard'

function AboutSection() {
  return (
    <section className="w-full">
        <div className="mb-20 w-full">
          <h2 className="text-5xl md:text-7xl font-black text-center mb-8 shader-text w-full">
            SOBRE NOSOTROS
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-4xl mx-auto mb-12 leading-relaxed">
            Somos un equipo apasionado de expertos en inteligencia artificial y desarrollo de software,
            dedicados a transformar ideas innovadoras en soluciones tecnológicas reales. Combinamos
            creatividad, experiencia técnica y visión estratégica para ayudar a las empresas a aprovechar
            el poder de la IA y alcanzar sus objetivos de negocio.
          </p>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mt-16">
            {/* Left Column - Character Image */}
            <div className="flex items-center justify-center">
              <LazyImage
                src="/personajes/Generated Image October 30, 2025 - 11_33AM.png"
                alt="AI Character"
                className="w-full max-w-md object-contain"
              />
            </div>

            {/* Right Column - Portfolio Images */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScrollingCard
                image="/trabajos/FireShot Capture 001 - Fuckup Nights - www.fuckupnights.com.png"
                title="Fuckup Nights"
                delay={0}
              />
              <ScrollingCard
                image="/trabajos/screencapture-adbize-2024-02-04-20_39_5723.png"
                title="Adbize"
                delay={500}
              />
              <ScrollingCard
                image="/trabajos/screencapture-streetled-ar-2024-02-04-23_00_05.jpg"
                title="StreetLED"
                delay={1000}
              />
            </div>
          </div>
        </div>

        {/* Certifications and Partners Section */}
        <div className="mb-20">
          {/* Certifications */}
          <div className="mb-32 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left Column - Title, Description, and Certifications */}
              <div>
                <h3 className="text-3xl md:text-5xl font-black text-left mb-8 shader-text">
                  Nuestras Certificaciones
                </h3>

                <p className="text-lg text-gray-600 text-left leading-relaxed mb-12">
                  En Adbize, contamos con certificaciones reconocidas en marketing digital, desarrollo web e inteligencia artificial. Estas acreditaciones respaldan nuestro compromiso con la excelencia y aseguran que empleamos las mejores prácticas y tecnologías para ofrecer resultados de alto impacto a nuestros clientes.
                </p>

                {/* Certification Cards - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Certification logos */}
                  {[
                    'imgi_48_c30122710aaaf27ba163584f6194.png',
                    'imgi_49_open_graph_everest_b37b4f5d2f.png',
                    'imgi_50_analytics_master_achievement.png',
                    'imgi_51_YU9RgEJE0n464PYVRmVU0VKeQlGF3jln-removebg-preview-removebg-preview.png'
                  ].map((img, index) => (
                    <AnimatedCard key={index} direction="left" delay={index * 150}>
                      <div className="relative group w-full transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer">
                        <div className="relative bg-white rounded-lg p-6 h-[200px] shadow-lg group-hover:shadow-2xl overflow-hidden transition-shadow duration-300">
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <div className="relative w-full h-full flex items-center justify-center">
                              <LazyImage
                                src={`/certificaciones/${img}`}
                                alt={`Certificación ${index + 1}`}
                                className="max-w-full max-h-full w-auto h-auto object-contain"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </AnimatedCard>
                  ))}
                </div>
              </div>

              {/* Right Column - Character Image */}
              <div className="flex items-center justify-center">
                <LazyImage
                  src="/personajes/Generated Image November 07, 2025 - 8_54AM.png"
                  alt="AI Character"
                  className="w-full max-w-md object-contain"
                />
              </div>
            </div>
          </div>

          {/* Partners */}
          <div className="py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left Column - Character Image */}
              <div className="flex items-center justify-center">
                <LazyImage
                  src="/personajes/Generated Image November 07, 2025 - 10_36AM.png"
                  alt="AI Character"
                  className="w-full max-w-md object-contain"
                />
              </div>

              {/* Right Column - Title, Description, and Partners */}
              <div>
                <h3 className="text-3xl md:text-5xl font-black text-left mb-8 shader-text">
                  Nuestros Partners
                </h3>

                <p className="text-lg text-gray-600 text-left leading-relaxed mb-12">
                  Nos enorgullece colaborar con partners de clase mundial que complementan nuestras capacidades. Estas alianzas nos permiten ofrecer soluciones innovadoras y personalizadas, integrando las mejores herramientas del mercado para potenciar el éxito de nuestros clientes.
                </p>

                {/* Partner Cards - 3 Columns Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Partner logos */}
                  {[
                    'imgi_52_wixasda.webp',
                    'imgi_53_asasdasd-e1727288173413.png',
                    'imgi_54_Official-Partner-2asda.png',
                    'imgi_55_Shopify-Certified-Partner-Logo.png',
                    'imgi_56_Semrush-Agency-Partner-Badge-1.png',
                    'imgi_57_hostinger.jpg'
                  ].map((img, index) => (
                    <div key={index} className="relative group w-full transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer">
                      <div className="relative bg-white rounded-lg p-6 h-[200px] shadow-lg group-hover:shadow-2xl overflow-hidden transition-shadow duration-300">
                        <div className="w-full h-full flex items-center justify-center p-2">
                          <div className="relative w-full h-full flex items-center justify-center">
                            <LazyImage
                              src={`/partners/${img}`}
                              alt={`Partner ${index + 1}`}
                              className="max-w-full max-h-full w-auto h-auto object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
    </section>
  )
}

export default AboutSection
