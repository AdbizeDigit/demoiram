from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import os
from PIL import Image
import numpy as np
import cv2
from ultralytics import YOLO
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import quote_plus, urlparse
import time
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize YOLO Pose model
yolo_model = None
try:
    yolo_model = YOLO('yolov8n-pose.pt')  # YOLOv8 nano pose model
    print(">> YOLOv8-Pose model loaded successfully")
except Exception as e:
    print(f">> Error loading YOLO Pose model: {e}")
    yolo_model = None

# Keypoint names in Spanish (17 keypoints for COCO pose)
KEYPOINT_NAMES = [
    'Nariz', 'Ojo Izq', 'Ojo Der', 'Oreja Izq', 'Oreja Der',
    'Hombro Izq', 'Hombro Der', 'Codo Izq', 'Codo Der',
    'Muñeca Izq', 'Muñeca Der', 'Cadera Izq', 'Cadera Der',
    'Rodilla Izq', 'Rodilla Der', 'Tobillo Izq', 'Tobillo Der'
]

@app.route('/python-api/vision/detect', methods=['POST'])
def detect_objects():
    """Pose detection endpoint using YOLOv8-Pose"""
    try:
        data = request.json
        image_data = data.get('image')

        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))

        # Convert RGBA to RGB if needed
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')

        # Convert to numpy array
        image_np = np.array(image)

        # Get image dimensions
        img_height, img_width = image_np.shape[:2]

        detections = []

        if yolo_model is not None:
            print(f"Processing image of size: {img_width}x{img_height}")

            # Run YOLO pose inference
            results = yolo_model(image_np, conf=0.25, verbose=False)

            # Process results
            for result in results:
                # Get person bounding boxes
                boxes = result.boxes
                # Get keypoints (pose landmarks)
                keypoints = result.keypoints

                if boxes is not None:
                    for idx, box in enumerate(boxes):
                        # Get box coordinates (xyxy format)
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                        # Convert to relative coordinates (0-1)
                        x_rel = float(x1 / img_width)
                        y_rel = float(y1 / img_height)
                        width_rel = float((x2 - x1) / img_width)
                        height_rel = float((y2 - y1) / img_height)

                        # Get confidence
                        confidence = float(box.conf[0])

                        # Prepare keypoints data
                        keypoints_data = []
                        if keypoints is not None and keypoints.data is not None:
                            kpts = keypoints.data[idx].cpu().numpy()  # Shape: (17, 3) - x, y, confidence
                            for kp_idx, kp in enumerate(kpts):
                                if kp_idx < len(KEYPOINT_NAMES):
                                    kp_x = float(kp[0] / img_width)  # Relative x
                                    kp_y = float(kp[1] / img_height)  # Relative y
                                    kp_conf = float(kp[2])  # Confidence

                                    if kp_conf > 0.3:  # Only include visible keypoints
                                        keypoints_data.append({
                                            'name': KEYPOINT_NAMES[kp_idx],
                                            'x': kp_x,
                                            'y': kp_y,
                                            'confidence': kp_conf
                                        })

                        detections.append({
                            'label': 'Persona',
                            'confidence': confidence,
                            'bbox': {
                                'x': x_rel,
                                'y': y_rel,
                                'width': width_rel,
                                'height': height_rel
                            },
                            'keypoints': keypoints_data
                        })

                        print(f"Detected person with {len(keypoints_data)} keypoints visible")

        # If no detections, return empty
        if not detections:
            return jsonify({
                'detections': [],
                'count': 0,
                'status': 'success',
                'message': 'No se detectaron personas en la imagen'
            })

        return jsonify({
            'detections': detections,
            'count': len(detections),
            'status': 'success',
            'imageSize': {'width': img_width, 'height': img_height}
        })

    except Exception as e:
        print(f"Error in detect_objects: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/python-api/sentiment/analyze', methods=['POST'])
def analyze_sentiment():
    """Sentiment analysis endpoint"""
    try:
        data = request.json
        text = data.get('text')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Mock sentiment analysis
        # In production, use transformers library or similar

        # Simple keyword-based mock
        positive_words = ['bueno', 'excelente', 'genial', 'feliz', 'increíble', 'fantástico', 'amor']
        negative_words = ['malo', 'terrible', 'horrible', 'triste', 'odio', 'desastre', 'pésimo']

        text_lower = text.lower()
        positive_count = sum(word in text_lower for word in positive_words)
        negative_count = sum(word in text_lower for word in negative_words)

        if positive_count > negative_count:
            sentiment = 'positive'
            confidence = 0.85
            emotions = {'alegría': 0.75, 'satisfacción': 0.65, 'entusiasmo': 0.55, 'tristeza': 0.15}
        elif negative_count > positive_count:
            sentiment = 'negative'
            confidence = 0.82
            emotions = {'tristeza': 0.70, 'frustración': 0.60, 'enojo': 0.50, 'alegría': 0.10}
        else:
            sentiment = 'neutral'
            confidence = 0.78
            emotions = {'neutral': 0.70, 'curiosidad': 0.45, 'interés': 0.40, 'confusión': 0.20}

        # Extract keywords (simple implementation)
        words = text.split()
        keywords = [word for word in words if len(word) > 5][:5]

        return jsonify({
            'sentiment': sentiment,
            'confidence': confidence,
            'emotions': emotions,
            'keywords': keywords,
            'status': 'success'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/python-api/transcription/process', methods=['POST'])
def transcribe_audio():
    """Audio transcription endpoint"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']

        # Mock transcription
        # In production, use Whisper or similar
        mock_transcription = """Esta es una transcripción simulada del audio proporcionado.
En un sistema real, aquí aparecería el texto exacto extraído del audio utilizando
tecnologías como Whisper de OpenAI o Google Speech-to-Text.

El audio puede contener información sobre diversos temas, incluyendo conversaciones,
presentaciones, entrevistas o cualquier contenido de audio que necesite ser convertido a texto."""

        mock_summary = "Resumen: Transcripción de audio simulada para propósitos de demostración. En producción, se usaría IA para generar un resumen preciso del contenido."

        return jsonify({
            'transcription': mock_transcription,
            'summary': mock_summary,
            'metadata': {
                'duration': '2:35',
                'wordCount': 89,
                'language': 'Español'
            },
            'status': 'success'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/python-api/document/analyze', methods=['POST'])
def analyze_document():
    """Document analysis endpoint"""
    try:
        if 'document' not in request.files:
            return jsonify({'error': 'No document provided'}), 400

        document = request.files['document']

        # Mock document analysis
        # In production, use PyPDF2, docx, tesseract, etc.

        categories = ['invoice', 'contract', 'report', 'letter']
        category = categories[np.random.randint(0, len(categories))]

        category_labels = {
            'invoice': 'Factura',
            'contract': 'Contrato',
            'report': 'Reporte',
            'letter': 'Carta'
        }

        return jsonify({
            'category': category,
            'categoryLabel': category_labels[category],
            'confidence': 0.87,
            'summary': f'Este documento ha sido clasificado como {category_labels[category]}. Contiene información relevante que ha sido analizada y procesada.',
            'entities': [
                {'type': 'Nombre', 'value': 'Juan Pérez'},
                {'type': 'Empresa', 'value': 'Adbize Corporation'},
                {'type': 'Fecha', 'value': '15 de Enero 2024'},
                {'type': 'Monto', 'value': '$5,000 USD'}
            ],
            'keyPhrases': ['análisis de datos', 'inteligencia artificial', 'procesamiento de documentos'],
            'metadata': {
                'pages': 3,
                'wordCount': 1250,
                'language': 'Español'
            },
            'status': 'success'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/python-api/predictor/forecast', methods=['POST'])
def forecast_data():
    """Time series forecasting endpoint"""
    try:
        if 'data' not in request.files:
            return jsonify({'error': 'No data file provided'}), 400

        data_file = request.files['data']
        data_type = request.form.get('dataType')
        period = request.form.get('period')
        forecast_periods = int(request.form.get('forecast', 6))

        # Mock forecasting
        # In production, use Prophet, ARIMA, or LSTM models

        # Generate mock predictions
        base_value = 1000
        predictions = []
        for i in range(forecast_periods):
            value = base_value * (1 + (i * 0.05) + np.random.uniform(-0.02, 0.02))
            predictions.append({
                'period': f'Período {i+1}',
                'value': value
            })

        # Generate chart data
        chart_data = [800, 850, 920, 980, 1050, 1100] + [p['value'] for p in predictions[:6]]

        trend = 'up' if predictions[-1]['value'] > predictions[0]['value'] else 'down'
        change_percent = ((predictions[-1]['value'] - predictions[0]['value']) / predictions[0]['value']) * 100

        insights = [
            f'Se observa una tendencia {"alcista" if trend == "up" else "bajista"} en los datos',
            f'El cambio proyectado es de {abs(change_percent):.1f}%',
            'Los valores históricos muestran patrones estacionales',
            'Se recomienda revisar los datos en el próximo período'
        ]

        return jsonify({
            'predictions': predictions,
            'accuracy': 0.85,
            'mse': 12.5,
            'trend': trend,
            'changePercent': change_percent,
            'chartData': chart_data,
            'insights': insights,
            'status': 'success'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/python-api/opportunity-detection/search', methods=['POST'])
def search_opportunities():
    """Search for opportunities in social media mentions using Google search"""
    try:
        data = request.json
        query = data.get('query', '').strip()

        if not query:
            return jsonify({'error': 'Query is required'}), 400

        print(f">> Searching for opportunities: {query}")

        # Social media platforms to search
        platforms = [
            {'name': 'Twitter/X', 'domain': 'twitter.com OR x.com', 'icon': 'twitter'},
            {'name': 'Facebook', 'domain': 'facebook.com', 'icon': 'facebook'},
            {'name': 'LinkedIn', 'domain': 'linkedin.com', 'icon': 'linkedin'},
            {'name': 'Reddit', 'domain': 'reddit.com', 'icon': 'reddit'},
            {'name': 'Instagram', 'domain': 'instagram.com', 'icon': 'instagram'},
        ]

        results = []

        # Search in each platform
        for platform in platforms:
            search_query = f'{query} site:{platform["domain"]}'
            encoded_query = quote_plus(search_query)
            search_url = f'https://www.google.com/search?q={encoded_query}&num=5'

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }

            try:
                response = requests.get(search_url, headers=headers, timeout=5)
                soup = BeautifulSoup(response.text, 'html.parser')

                # Find search result divs
                search_results = soup.find_all('div', class_='g')

                platform_results = []
                for result in search_results[:3]:  # Limit to 3 results per platform
                    title_elem = result.find('h3')
                    link_elem = result.find('a')
                    snippet_elem = result.find('div', class_=['VwiC3b', 'yXK7lf'])

                    if title_elem and link_elem:
                        title = title_elem.get_text()
                        link = link_elem.get('href', '')
                        snippet = snippet_elem.get_text() if snippet_elem else ''

                        # Clean the link
                        if link.startswith('/url?q='):
                            link = link.split('/url?q=')[1].split('&')[0]

                        platform_results.append({
                            'title': title,
                            'link': link,
                            'snippet': snippet[:200] + '...' if len(snippet) > 200 else snippet,
                            'platform': platform['name'],
                            'icon': platform['icon']
                        })

                results.extend(platform_results)
                time.sleep(0.5)  # Small delay between requests

            except Exception as e:
                print(f">> Error searching {platform['name']}: {str(e)}")
                continue

        # If no results found, provide mock data for demonstration
        if not results:
            results = [
                {
                    'title': f'Búsqueda: "{query}" - Ejemplo de resultado',
                    'link': 'https://example.com',
                    'snippet': 'Los resultados reales aparecerán aquí. Google puede bloquear solicitudes automatizadas. Para producción, considera usar Google Custom Search API.',
                    'platform': 'Info',
                    'icon': 'info'
                }
            ]

        return jsonify({
            'query': query,
            'results': results,
            'count': len(results),
            'status': 'success'
        })

    except Exception as e:
        print(f">> Error in search_opportunities: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/python-api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Python AI Service is running'
    })


@app.route('/python-api/scraping/news-intel', methods=['POST'])
def scraping_news_intel():
    """News-based scrapping intelligence endpoint.

    Este endpoint consulta NewsAPI, GNews y Newsdata (si hay API keys configuradas)
    para una query dada y devuelve una lista de artículos normalizados. Esta es la
    Fase 1 de inyección de datos: todavía no aplica NLP avanzado, pero deja lista
    la estructura para conectar con la capa de análisis y scoring.
    """
    try:
        data = request.json or {}
        query = (data.get('query') or '').strip()
        if not query:
            return jsonify({'error': 'query is required'}), 400

        languages = data.get('languages') or ['en', 'es']
        countries = data.get('countries') or ['us', 'gb', 'es']
        max_articles = int(data.get('limit') or 20)

        newsapi_key = os.environ.get('NEWS_API_KEY')
        gnews_key = os.environ.get('GNEWS_API_KEY')
        newsdata_key = os.environ.get('NEWSDATA_API_KEY')

        all_articles = []
        sources_meta = {
            'newsapi': {'count': 0, 'error': None},
            'gnews': {'count': 0, 'error': None},
            'newsdata': {'count': 0, 'error': None}
        }

        def normalize_url(url: str) -> str:
            try:
                return url.split('?')[0]
            except Exception:
                return url

        # --- NewsAPI.org ---
        if newsapi_key:
            try:
                url = 'https://newsapi.org/v2/everything'
                params = {
                    'q': query,
                    'language': ','.join(languages),
                    'pageSize': min(max_articles, 50),
                    'sortBy': 'publishedAt',
                    'apiKey': newsapi_key
                }
                resp = requests.get(url, params=params, timeout=8)
                resp.raise_for_status()
                payload = resp.json()
                for art in payload.get('articles', []):
                    all_articles.append({
                        'source': art.get('source', {}).get('name') or 'NewsAPI',
                        'title': art.get('title'),
                        'url': normalize_url(art.get('url')), 
                        'published_at': art.get('publishedAt'),
                        'description': art.get('description'),
                        'content_preview': (art.get('content') or '')[:400],
                        'api': 'newsapi'
                    })
                sources_meta['newsapi']['count'] = len(payload.get('articles', []))
            except Exception as e:
                sources_meta['newsapi']['error'] = str(e)

        # --- GNews.io ---
        if gnews_key:
            try:
                url = 'https://gnews.io/api/v4/search'
                params = {
                    'q': query,
                    'lang': ','.join(languages),
                    'country': ','.join(countries),
                    'max': min(max_articles, 20),
                    'apikey': gnews_key
                }
                resp = requests.get(url, params=params, timeout=8)
                resp.raise_for_status()
                payload = resp.json()
                for art in payload.get('articles', []):
                    all_articles.append({
                        'source': art.get('source', {}).get('name') or 'GNews',
                        'title': art.get('title'),
                        'url': normalize_url(art.get('url')), 
                        'published_at': art.get('publishedAt'),
                        'description': art.get('description'),
                        'content_preview': (art.get('content') or '')[:400],
                        'api': 'gnews'
                    })
                sources_meta['gnews']['count'] = len(payload.get('articles', []))
            except Exception as e:
                sources_meta['gnews']['error'] = str(e)

        # --- Newsdata.io ---
        if newsdata_key:
            try:
                url = 'https://newsdata.io/api/1/news'
                params = {
                    'apikey': newsdata_key,
                    'q': query,
                    'language': ','.join(languages),
                    'country': ','.join(countries),
                    'page': 1
                }
                resp = requests.get(url, params=params, timeout=8)
                resp.raise_for_status()
                payload = resp.json()
                for art in payload.get('results', []):
                    all_articles.append({
                        'source': art.get('source_id') or 'Newsdata',
                        'title': art.get('title'),
                        'url': normalize_url(art.get('link')), 
                        'published_at': art.get('pubDate'),
                        'description': art.get('description'),
                        'content_preview': (art.get('content') or '')[:400],
                        'api': 'newsdata'
                    })
                sources_meta['newsdata']['count'] = len(payload.get('results', []))
            except Exception as e:
                sources_meta['newsdata']['error'] = str(e)

        # Deduplicar por URL
        seen_urls = set()
        deduped = []
        for art in all_articles:
            url = art.get('url')
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            deduped.append(art)

        # Limitar resultado total
        deduped = deduped[:max_articles]

        return jsonify({
            'status': 'success',
            'query': query,
            'articles': deduped,
            'total': len(deduped),
            'sources': sources_meta
        })

    except Exception as e:
        print(f">> Error in scraping_news_intel: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f'>> Python AI Service running on port {port}')
    print(f'>> Endpoints available at http://localhost:{port}/python-api')
    app.run(host='0.0.0.0', port=port, debug=True)
