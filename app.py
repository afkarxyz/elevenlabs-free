from flask import Flask, Response, render_template, request, jsonify
from elevenlabs import ElevenLabs
from elevenlabs import VoiceSettings

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('app.html')

@app.route('/generate-audio')
def generate_audio():
    api_key = request.headers.get('X-API-KEY')
    if not api_key:
        return Response('API key is required', status=401)

    text = request.args.get('text')
    model_id = request.args.get('model_id')
    voice_id = request.args.get('voice_id')
    
    speed = request.args.get('speed', '1.00')
    try:
        speed = float(speed)
        if speed < 0.70:
            speed = 0.70
        elif speed > 1.20:
            speed = 1.20
    except (ValueError, TypeError):
        speed = 1.00
    
    if not text or not model_id or not voice_id:
        return Response('Missing required parameters', status=400)
    
    try:
        client = ElevenLabs(api_key=api_key)
        
        audio_generator = client.text_to_speech.convert(
            voice_id=voice_id,
            output_format="mp3_44100_128",
            text=text,
            model_id=model_id,
            voice_settings=VoiceSettings(
                speed=speed
            )
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
        subscription = client.user.subscription.get()
        
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
                "preview_url": voice.preview_url,
                "labels": voice.labels,
                "category": voice.category,
                "description": voice.description
            }
            for voice in voices.voices
        ]
        return jsonify(voice_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/search-voices')
def search_voices():
    api_key = request.headers.get('X-API-KEY')
    if not api_key:
        return jsonify({'error': 'API key is required'}), 401

    gender = request.args.get('gender', '')
    page = request.args.get('page', '0')
    sort = request.args.get('sort', 'most_used')
    language = request.args.get('language', '')
    search_query = request.args.get('search', '')

    sort_mapping = {
        'most_used': 'cloned_by_count',
        'latest': 'created_date',
        'trending': 'trending'
    }
    
    api_sort = sort_mapping.get(sort, 'cloned_by_count')
    
    api_params = {
        'page': int(page),
        'gender': gender or None,
        'sort': api_sort
    }
    
    if language and language.lower() != 'any':
        api_params['language'] = language
        
    if search_query:
        api_params['search'] = search_query.strip()

    try:
        client = ElevenLabs(api_key=api_key)
        response = client.voices.get_shared(**api_params)
        
        voice_data = []
        for voice in response.voices:
            labels = {
                "accent": getattr(voice, 'accent', ''),
                "gender": getattr(voice, 'gender', ''),
                "age": getattr(voice, 'age', ''),
                "descriptive": getattr(voice, 'descriptive', ''),
                "use_case": getattr(voice, 'use_case', '')
            }
            
            labels = {k: v for k, v in labels.items() if v}
            
            voice_info = {
                "public_owner_id": voice.public_owner_id,
                "voice_id": voice.voice_id,
                "date_unix": voice.date_unix,
                "name": voice.name,
                "preview_url": voice.preview_url,
                "cloned_by_count": voice.cloned_by_count,
                "description": getattr(voice, 'description', ''),
                "category": getattr(voice, 'category', ''),
                "labels": labels,
                "free_users_allowed": voice.free_users_allowed if hasattr(voice, 'free_users_allowed') else True
            }
            
            voice_data.append(voice_info)
        
        return jsonify(voice_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/delete-voice', methods=['DELETE'])
def delete_voice():
    api_key = request.headers.get('X-API-KEY')
    if not api_key:
        return jsonify({'error': 'API key is required'}), 401
        
    voice_id = request.args.get('voice_id')
    if not voice_id:
        return jsonify({'error': 'Voice ID is required'}), 400

    try:
        client = ElevenLabs(api_key=api_key)
        client.voices.delete(voice_id=voice_id)
        return jsonify({'message': f'Voice {voice_id} deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/add-voice', methods=['POST'])
def add_voice():
    api_key = request.headers.get('X-API-KEY')
    if not api_key:
        return jsonify({'error': 'API key is required'}), 401
        
    data = request.json
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
        
    public_user_id = data.get('public_user_id')
    voice_id = data.get('voice_id')
    new_name = data.get('new_name')
    
    if not all([public_user_id, voice_id, new_name]):
        return jsonify({'error': 'Missing required parameters'}), 400

    try:
        client = ElevenLabs(api_key=api_key)
        client.voices.share(
            public_user_id=public_user_id,
            voice_id=voice_id,
            new_name=new_name
        )
        result = {
            'success': True,
            'message': 'Voice added successfully',
            'voice_id': voice_id,
            'name': new_name
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)