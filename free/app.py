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
    "sk_a65da633762a90985615f2a8caf1b5eef334029fada0afb1",
    "sk_584fa5b9525e26f94550b35253e25e233ebe15010f7e4a46",
    "sk_d8aa70d04f96bb724636c4f9710cf26da0038dab1cb6d5f1"
]
USAGE_LIMIT = 10000

TEMP_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp', 'audio')

if not os.path.exists(TEMP_FOLDER):
    os.makedirs(TEMP_FOLDER)

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

def cleanup_old_files(directory, max_age=3600):
    current_time = time.time()
    try:
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            if os.path.isfile(file_path):
                file_age = current_time - os.path.getctime(file_path)
                if file_age > max_age:
                    os.remove(file_path)
    except Exception as e:
        print(f"Error during cleanup: {str(e)}")

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
    cleanup_old_files(TEMP_FOLDER)
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

@app.route('/temp/audio/<filename>')
def serve_audio(filename):
    return send_from_directory(TEMP_FOLDER, filename)

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
        
        filename = f'output_{int(time.time())}_{secrets.token_hex(8)}.mp3'
        output_path = os.path.join(TEMP_FOLDER, filename)
        
        save(audio, output_path)
        
        updated_usage = get_current_usage()
        voices = get_voices()
        updated_usage['voices'] = voices
        
        return jsonify({
            'success': True, 
            'audio_url': f'/temp/audio/{filename}',
            'usage_data': updated_usage
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/cleanup-file', methods=['POST'])
def cleanup_file():
    try:
        filename = request.json.get('filename')
        if not filename:
            return jsonify({'success': False, 'error': 'No filename provided'})
            
        file_path = os.path.join(TEMP_FOLDER, os.path.basename(filename))
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'File not found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)
