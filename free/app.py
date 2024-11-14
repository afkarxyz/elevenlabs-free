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

VOICES = [
    {"voice_id": "Xb7hH8MSUJpSbSDYk0k2", "name": "Alice", "type": "News"},
    {"voice_id": "9BWtsMINqrJLrRacOk9x", "name": "Aria", "type": "Social media"},
    {"voice_id": "pqHfZKP75CvOlQylNhV4", "name": "Bill", "type": "Narration"},
    {"voice_id": "nPczCjzI2devNBz1zQrb", "name": "Brian", "type": "Narration"},
    {"voice_id": "N2lVS1w4EtoT3dr4eOWO", "name": "Callum", "type": "Characters"},
    {"voice_id": "IKne3meq5aSn9XLyUdCD", "name": "Charlie", "type": "Conversational"},
    {"voice_id": "XB0fDUnXU5powFXDhCwa", "name": "Charlotte", "type": "Characters"},
    {"voice_id": "iP95p4xoKVk53GoZ742B", "name": "Chris", "type": "Conversational"},
    {"voice_id": "onwK4e9ZLuTAKqWW03F9", "name": "Daniel", "type": "News"},
    {"voice_id": "cjVigY5qzO86Huf0OWal", "name": "Eric", "type": "Conversational"},
    {"voice_id": "JBFqnCBsd6RMkjVDRZzb", "name": "George", "type": "Narration"},
    {"voice_id": "cgSgspJ2msm6clMCkdW9", "name": "Jessica", "type": "Conversational"},
    {"voice_id": "FGY2WhTYpPnrIDTdsKH5", "name": "Laura", "type": "Social media"},
    {"voice_id": "TX3LPaxmHKxFdv7VOQHJ", "name": "Liam", "type": "Narration"},
    {"voice_id": "pFZP5JQG7iQjIQuC4Bku", "name": "Lily", "type": "Narration"},
    {"voice_id": "XrExE9yKIg1WjnnlVkGX", "name": "Matilda", "type": "Narration"},
    {"voice_id": "SAz9YHcvj6GT2YYXdXww", "name": "River", "type": "Social media"},
    {"voice_id": "CwhRBWXzGAHq8TQ4Fs17", "name": "Roger", "type": "Social media"},
    {"voice_id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah", "type": "News"},
    {"voice_id": "bIHbv24MWmeRgasZH58o", "name": "Will", "type": "Social media"}
]

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
    return render_template('index.html', voices=VOICES)

@app.route('/get-usage')
def get_usage():
    try:
        usage_data = get_current_usage()
        if usage_data['usage'] >= USAGE_LIMIT:
            rotate_api_key()
            usage_data = get_current_usage()
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
        
        # Check if current key has reached its limit
        if current_usage >= USAGE_LIMIT:
            client = rotate_api_key()
            usage_data = get_current_usage()
            current_usage = usage_data['usage']
            
            # If all keys have reached their limit
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
        
        # Get updated usage after generation
        updated_usage = get_current_usage()
        
        return jsonify({
            'success': True, 
            'audio_url': f'/static/audio/{filename}',
            'usage_data': updated_usage
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# Main execution
if __name__ == '__main__':
    app.run(debug=True)
