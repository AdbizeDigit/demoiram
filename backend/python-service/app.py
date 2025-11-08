from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import os
from PIL import Image
import numpy as np

app = Flask(__name__)
CORS(app)

# Mock implementations for demo purposes
# In production, replace with actual AI models

@app.route('/python-api/vision/detect', methods=['POST'])
def detect_objects():
    """Object detection endpoint"""
    try:
        data = request.json
        image_data = data.get('image')

        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        # Mock detection results
        # In production, use actual computer vision model (YOLO, TensorFlow, etc.)
        mock_detections = [
            {'label': 'Persona', 'confidence': 0.95},
            {'label': 'Laptop', 'confidence': 0.89},
            {'label': 'Taza', 'confidence': 0.76},
            {'label': 'Teléfono', 'confidence': 0.82}
        ]

        return jsonify({
            'detections': mock_detections,
            'count': len(mock_detections),
            'status': 'success'
        })

    except Exception as e:
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


@app.route('/python-api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Python AI Service is running'
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f'✅ Python AI Service running on port {port}')
    print(f'📍 Endpoints available at http://localhost:{port}/python-api')
    app.run(host='0.0.0.0', port=port, debug=True)
