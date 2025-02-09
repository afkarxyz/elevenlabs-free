from flask import Flask, Response, render_template, request, jsonify
from elevenlabs import ElevenLabs

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate-audio')
def generate_audio():
    api_key = request.headers.get('X-API-KEY')
    if not api_key:
        return Response('API key is required', status=401)

    text = request.args.get('text')
    model_id = request.args.get('model_id')
    voice_id = request.args.get('voice_id')
    
    if not text or not model_id or not voice_id:
        return Response('Missing required parameters', status=400)
    
    try:
        client = ElevenLabs(api_key=api_key)
        
        audio_generator = client.text_to_speech.convert(
            voice_id=voice_id,
            output_format="mp3_44100_128",
            text=text,
            model_id=model_id,
        )
        
        audio_bytes = b''.join(audio_generator)
        
        return Response(
            audio_bytes,
            mimetype="audio/mpeg",
            headers={
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        return Response(str(e), status=400)

@app.route('/get-usage-info')
def get_usage_info():
    api_key = request.headers.get('X-API-KEY')
    if not api_key:
        return jsonify({'error': 'API key is required'}), 401

    try:
        client = ElevenLabs(api_key=api_key)
        subscription = client.user.get_subscription()
        
        return jsonify({
            'character_count': subscription.character_count,
            'character_limit': subscription.character_limit,
            'next_character_count_reset_unix': subscription.next_character_count_reset_unix
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/get-voices')
def get_voices():
    api_key = request.headers.get('X-API-KEY')
    if not api_key:
        return jsonify({'error': 'API key is required'}), 401

    try:
        client = ElevenLabs(api_key=api_key)
        voices = client.voices.get_all()
        voice_data = [
            {
                "id": voice.voice_id,
                "name": voice.name,
                "language": voice.fine_tuning.language,
                "labels": voice.labels
            }
            for voice in voices.voices
        ]
        return jsonify(voice_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)