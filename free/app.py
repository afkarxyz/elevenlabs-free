import os
import secrets
import time
from flask import Flask, render_template, request, jsonify, send_from_directory, session
from elevenlabs import save
from elevenlabs.client import ElevenLabs

# Configuration
app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

API_KEYS = [
    "API_KEY"
]
USAGE_LIMIT = 10000

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'audio')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Helper functions
def get_current_key_index():
    return session.get('current_key_index', 0)

def set_current_key_index(index):
    session['current_key_index'] = index

def get_client():
    return ElevenLabs(api_key=API_KEYS[get_current_key_index()])

def rotate_api_key():
    current_index = get_current_key_index()
    new_index = (current_index + 1) % len(API_KEYS)
    set_current_key_index(new_index)
    return get_client()

def format_use_case(use_case):
    if not use_case:
        return "General"
    return " ".join(word.capitalize() for word in use_case.replace("_", " ").split())

def get_voices():
    try:
        client = get_client()
        voices_response = client.voices.get_all()
        
        voices = []
        for voice in voices_response.voices:
            use_case = voice.labels.get('use_case', 'General') if hasattr(voice, 'labels') else 'General'
            formatted_use_case = format_use_case(use_case)
            
            voice_data = {
                "voice_id": voice.voice_id,
                "name": voice.name,
                "use_case": formatted_use_case
            }
            voices.append(voice_data)
            
        return voices
    except Exception as e:
        print(f"Error fetching voices: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return []

def get_current_usage():
    client = get_client()
    try:
        current_time = int(time.time()) * 1000
        thirty_days_ago = current_time - (30 * 24 * 60 * 60 * 1000)
        usage = client.usage.get_characters_usage_metrics(
            start_unix=thirty_days_ago,
            end_unix=current_time,
        )
        return {
            'usage': sum(usage.dict()['usage']['All']),
            'key_index': get_current_key_index() + 1,
            'total_keys': len(API_KEYS)
        }
    except Exception as e:
        print(f"Error getting usage: {str(e)}")
        return {'usage': 0, 'key_index': get_current_key_index() + 1, 'total_keys': len(API_KEYS)}

# Route definitions
@app.route('/')
def index():
    voices = get_voices()
    return render_template('index.html', voices=voices)

@app.route('/get-voices')
def get_voices_route():
    try:
        voices = get_voices()
        return jsonify({'success': True, 'voices': voices})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get-usage')
def get_usage():
    try:
        usage_data = get_current_usage()
        if usage_data['usage'] >= USAGE_LIMIT:
            rotate_api_key()
            usage_data = get_current_usage()
            voices = get_voices()
            usage_data['voices'] = voices
        return jsonify({'success': True, **usage_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/static/audio/<filename>')
def serve_audio(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/generate-speech', methods=['POST'])
def generate_speech():
    text = request.form.get('text')
    voice_id = request.form.get('voice_id')
    
    try:
        client = get_client()
        usage_data = get_current_usage()
        current_usage = usage_data['usage']
        
        if current_usage >= USAGE_LIMIT:
            client = rotate_api_key()
            usage_data = get_current_usage()
            current_usage = usage_data['usage']
            
            if current_usage >= USAGE_LIMIT:
                return jsonify({'success': False, 'error': 'All API keys have reached their usage limit.'})

        audio = client.generate(
            text=text,
            voice=voice_id,
            model="eleven_multilingual_v2"
        )
        
        filename = f'output_{int(time.time())}.mp3'
        output_path = os.path.join(UPLOAD_FOLDER, filename)
        
        save(audio, output_path)
        
        updated_usage = get_current_usage()
        voices = get_voices()
        updated_usage['voices'] = voices
        
        return jsonify({
            'success': True, 
            'audio_url': f'/static/audio/{filename}',
            'usage_data': updated_usage
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
