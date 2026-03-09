import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SEO = ({
  title = 'Adbize - Soluciones de Inteligencia Artificial para Empresas',
  description = 'Plataforma de IA que ofrece chatbots personalizados, análisis de visión por computadora, generación de agentes, detección de oportunidades y más.',
  keywords = 'inteligencia artificial, AI, chatbot, visión por computadora, machine learning',
  image = 'https://adbize.com/logo2023.png',
  type = 'website'
}) => {
  const location = useLocation()
  const url = `https://adbize.com${location.pathname}`

  useEffect(() => {
    // Update document title
    document.title = title

    // Update meta tags
    const updateMetaTag = (property, content) => {
      let element = document.querySelector(`meta[property="${property}"]`) ||
                   document.querySelector(`meta[name="${property}"]`)

      if (element) {
        element.setAttribute('content', content)
      } else {
        element = document.createElement('meta')
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
          element.setAttribute('property', property)
        } else {
          element.setAttribute('name', property)
        }
        element.setAttribute('content', content)
        document.head.appendChild(element)
      }
    }

    // Update all meta tags
    updateMetaTag('description', description)
    updateMetaTag('keywords', keywords)
    updateMetaTag('og:title', title)
    updateMetaTag('og:description', description)
    updateMetaTag('og:url', url)
    updateMetaTag('og:image', image)
    updateMetaTag('og:type', type)
    updateMetaTag('twitter:title', title)
    updateMetaTag('twitter:description', description)
    updateMetaTag('twitter:image', image)
    updateMetaTag('twitter:url', url)

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      canonical.setAttribute('href', url)
    } else {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      canonical.setAttribute('href', url)
      document.head.appendChild(canonical)
    }
  }, [title, description, keywords, image, type, url])

  return null
}

export default SEO
