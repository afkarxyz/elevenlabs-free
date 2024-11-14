# ElevenLabs Free

A simple web application built with Flask that allows users to generate speech from text using ElevenLabs' text-to-speech API.

## Desktop Mode
![chrome_xrChwqKAdo](https://github.com/user-attachments/assets/597f68fb-3f64-447f-84fa-c9b660cc53e3)

## Mobile Mode
![chrome_KMmT4iN5cj](https://github.com/user-attachments/assets/e545695f-29fc-4ff9-be0b-744c2ca010a8)

## Features

- Text-to-speech conversion using ElevenLabs API
- Multiple voice options
- Credit usage tracking
- Download generated audio files

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/afkarxyz/elevenlabs-free.git
   cd elevenlabs-free
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
