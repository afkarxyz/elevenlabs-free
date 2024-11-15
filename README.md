# ElevenLabs Free

A simple web application built with Flask that allows users to generate speech from text using ElevenLabs' text-to-speech API.

## Desktop Mode
![image](https://github.com/user-attachments/assets/5c563af3-6dea-4e8a-978f-3f6a36354c8d)

## Mobile Mode
![image](https://github.com/user-attachments/assets/215e7515-18b7-4939-a281-3fbf6ee3b9e1)

## Features

- Text-to-speech conversion using ElevenLabs API
- Multiple API keys
- Multiple voice options
- Credit usage tracking
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
   - Replace `API_KEY` in `app.py` with your actual key

4. Run the application:
   ```bash
   python app.py
   ```

5. Access the web interface at `http://localhost:5000`
