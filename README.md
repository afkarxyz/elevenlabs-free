# ElevenLabs Free <img src="https://flagicons.lipis.dev/flags/4x3/ps.svg" width="36" alt="Palestine">

A simple web application built with Flask that allows users to generate speech from text using ElevenLabs' text-to-speech API.

## ✨ Features

- Download generated audio files
- Multiple model options 
- Multiple voice options
- Credit usage tracking
- Multiple API keys
- API Management
- Responsive UI

## 🚧 Warning

- Generating more than **5000 characters** at once may result in **failure**.
- For better success rates, **generate in smaller batches**.  
- If the generation **fails**, your **credits will still be used** without producing any audio.

## 🖼️ Screenshots

![image](https://github.com/user-attachments/assets/5cab6839-78ca-4e27-8102-11aee788ef1c)

![image](https://github.com/user-attachments/assets/3ac3bced-aea8-499d-98cf-dc1f02511d24)

![image](https://github.com/user-attachments/assets/7d94587f-02b9-4753-bb8d-c1535cd09e0e)

## 🔑 API Management

You can add voices from the library or remove existing voices from your account.

> [!Note]
> Please fill in the search field if you want to search for a specific voice. If you want to display the full list of voices, leave it empty.

![image](https://github.com/user-attachments/assets/1e8b282a-69d5-4154-a488-4c48f7c4ced1)

![image](https://github.com/user-attachments/assets/e62bdb4b-c6ad-40bc-adda-d6846ab83a58)


## 📱 Mobile Version

![image](https://github.com/user-attachments/assets/99acfcb2-c90f-4499-868e-797dd7d57a46)

## 🖥️ Local Installation

1. Install required Python packages:
   ```bash
   pip install flask elevenlabs
   ```
   
2. Clone the repository:
   ```bash
   git clone https://github.com/afkarxyz/elevenlabs-free.git
   cd elevenlabs-free
   ```
   
3. Run the application:
   ```bash
   python app.py
   ```

4. Access the web interface at `http://127.0.0.1:5000`
5. Enter your API key in the Settings tab
     
## <img src="https://vercel.com/vc-ap-vercel-marketing/_next/static/media/vercel-logotype-dark.01246f11.svg" width="100" alt="Vercel">

Click the button below to deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/afkarxyz/elevenlabs-free/tree/main)
