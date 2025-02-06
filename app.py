import os
import json
import secrets
import time
import base64
import traceback
from flask import Flask, render_template, request, jsonify
from elevenlabs import ElevenLabs

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

USAGE_LIMIT = 10000

def get_api_keys():
    if os.environ.get('VERCEL_ENV'):
        return os.environ.get('API_KEYS', '').split(','), 0
    else:
        api_keys_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'api_keys.json')
        if os.path.exists(api_keys_file):
            with open(api_keys_file, 'r') as f:
                data = json.load(f)
                return data.get('API_KEYS', []), data.get('current_key_index', 0)
        return [], 0

API_KEYS, CURRENT_KEY_INDEX = get_api_keys()

def get_client():
    return ElevenLabs(api_key=API_KEYS[CURRENT_KEY_INDEX])

def format_label(label):
    if not label:
        return "General"
    formatted = label.replace("_", " ").replace("-", " ")
    return " ".join(word.capitalize() for word in formatted.split())

def get_voices():
    try:
        client = get_client()
        voices_response = client.voices.get_all()
        voices = []
        for voice in voices_response.voices:
            labels = voice.labels if hasattr(voice, 'labels') else {}
            description = labels.get('descriptive') or labels.get('description', 'Natural')
            language = labels.get('language')
            formatted_language = None
            if language:
                if language.lower() == 'id':
                    formatted_language = 'Indonesia'
            
            voice_data = {
                "voice_id": voice.voice_id,
                "name": voice.name,
                "use_case": format_label(labels.get('use_case')),
                "descriptive": format_label(description),
                "age": format_label(labels.get('age', 'Adult')),
                "gender": format_label(labels.get('gender', 'Unknown')),
                "language": formatted_language
            }
            voices.append(voice_data)
        voices.sort(key=lambda x: x['name'].lower())
        return voices
    except Exception as e:
        print(f"Error fetching voices: {str(e)}")
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
            'key_index': CURRENT_KEY_INDEX + 1,
            'total_keys': len(API_KEYS)
        }
    except Exception as e:
        print(f"Error getting usage: {str(e)}")
        print(traceback.format_exc())
        return {'usage': 0, 'key_index': CURRENT_KEY_INDEX + 1, 'total_keys': len(API_KEYS)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-voices')
def get_voices_route():
    try:
        voices = get_voices()
        if not voices:
            raise Exception("No voices fetched")
        return jsonify({'success': True, 'voices': voices})
    except Exception as e:
        print(f"Error in get_voices_route: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get-usage')
def get_usage():
    try:
        usage_data = get_current_usage()
        return jsonify({'success': True, **usage_data})
    except Exception as e:
        print(f"Error in get_usage: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)})

@app.route('/generate-speech', methods=['POST'])
def generate_speech():
    text = request.form.get('text')
    voice_id = request.form.get('voice_id')
    
    try:
        client = get_client()
        audio_stream = client.generate(
            text=text,
            voice=voice_id,
            model="eleven_multilingual_v2"
        )
        
        audio_data = b"".join(chunk for chunk in audio_stream)
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        audio_data_url = f"data:audio/mpeg;base64,{audio_base64}"
        
        usage_data = get_current_usage()
        voices = get_voices()
        usage_data['voices'] = voices
        
        return jsonify({
            'success': True, 
            'audio_data': audio_data_url,
            'usage_data': usage_data
        })
    except Exception as e:
        print(f"Error in generate_speech: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)})

@app.route('/change-api-key', methods=['POST'])
def change_api_key():
    global CURRENT_KEY_INDEX
    data = request.json
    
    if 'index' in data:
        CURRENT_KEY_INDEX = data['index']
    else:
        direction = data.get('direction')
        if direction == 'next':
            CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX + 1) % len(API_KEYS)
        elif direction == 'previous':
            CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX - 1) % len(API_KEYS)
    
    usage_data = get_current_usage()
    voices = get_voices()
    usage_data['voices'] = voices
    return jsonify({'success': True, 'usage_data': usage_data})

if __name__ == '__main__':
    app.run(debug=True)