# ElevenLabs Free

A simple web application built with Flask that allows users to generate speech from text using ElevenLabs' text-to-speech API.

![image](https://github.com/user-attachments/assets/fea35a20-6df8-4303-a402-63b4bcc170de)

> In this screenshot, I’m using 100 API keys, each with 10,000 credits. When multiplied, I get a total of 1,000,000 free credits.

## ✨ Features

- Multiple voice options _(adjust according to your API key; whatever you select on the ElevenLabs website will be displayed)_
- Download generated audio files
- Credit usage tracking
- Multiple API keys
- Responsive UI


## 🖥️ Local Installation

1. Install required Python packages:
   ```bash
   pip install flask elevenlabs
   ```
   
2. Clone the repository:
   ```bash
   git clone https://github.com/afkarxyz/elevenlabs-free.git
   cd elevenlabs-free/local
   ```
   
3. Configure the application:
   - Get your API key from ElevenLabs
   - Replace `API_KEY_1, API_KEY_2, API_KEY_3` in `api_keys.json` with your actual key

4. Run the application:
   ```bash
   python local.py
   ```

5. Access the web interface at `http://127.0.0.1:5000`

## 🌐 Vercel Deployment

Click the button below!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/afkarxyz/elevenlabs-free/tree/main/vercel)

### Setting Environment Variables in Vercel

1. Open Project
2. Go to Settings > Environment Variables
3. Add Variables:
   - `ELEVENLABS_API_KEYS`: `API_KEY_1,API_KEY_2,API_KEY_3`
   - `CURRENT_KEY_INDEX`: `0`
4. Save Changes

![chrome_mszTH2aI8Z](https://github.com/user-attachments/assets/8e54ce07-115b-4fd3-a4eb-21cd3093f68c)
