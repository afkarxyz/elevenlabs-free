# ElevenLabs Free

A simple web application built with Flask that allows users to generate speech from text using ElevenLabs' text-to-speech API.

![image](https://github.com/user-attachments/assets/5842d344-267a-42be-b638-b4c03e82bf7e)

> In this screenshot, I’m using 100 API keys, each with 10,000 credits. When multiplied, I get a total of 1,000,000 free credits.

## Features

- Credit usage tracking
- Multiple API keys
- Multiple voice options _(adjust according to your API key; whatever you select on the ElevenLabs website will be displayed)_
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
   - Replace `API_KEY_1, API_KEY_2, API_KEY_3` in `api_keys.json` with your actual key

4. Run the application:
   ```bash
   python local.py
   ```

5. Access the web interface at `http://127.0.0.1:5000`

## Vercel Deployment

1. **Create a New Repository**
   - Choose either a public or private repository
   - Upload all files from the `vercel` folder as shown in the screenshot below

![chrome_imrNd9pm2a](https://github.com/user-attachments/assets/eecad0e1-c2cc-4e05-a429-04e4dfb2dd41)

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Deploy your project

3. **Set Environment Variables**
   - After a successful deployment, configure the necessary environment variables
     
#

### Setting Environment Variables in Vercel

1. Open Project
2. Go to Settings > Environment Variables
3. Add Variables:
   - `ELEVENLABS_API_KEYS`: `API_KEY_1,API_KEY_2,API_KEY_3`
   - `CURRENT_KEY_INDEX`: `0`
4. Save Changes

![chrome_mszTH2aI8Z](https://github.com/user-attachments/assets/8e54ce07-115b-4fd3-a4eb-21cd3093f68c)
