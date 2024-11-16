# ElevenLabs Free

A simple web application built with Flask that allows users to generate speech from text using ElevenLabs' text-to-speech API.

![image](https://github.com/user-attachments/assets/5842d344-267a-42be-b638-b4c03e82bf7e)

## Features

- Credit usage tracking
- Multiple API keys
- Multiple voice options
- Download generated audio files

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/afkarxyz/elevenlabs-free.git
   cd elevenlabs-free/free
   ```

2. Install required Python packages:
   ```bash
   pip install flask elevenlabs
   ```

3. Configure the application:
   - Get your API key from ElevenLabs
   - Replace `API_KEY` in `api_keys.json` with your actual key

4. Run the application:
   ```bash
   python app.py
   ```

5. Access the web interface at `http://localhost:5000`
