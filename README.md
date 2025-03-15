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

![image](https://github.com/user-attachments/assets/506d9b8f-acd7-477f-be8c-a0eb92f84da0)

![image](https://github.com/user-attachments/assets/b52c4493-3aa0-401c-b9fe-2871e561d964)

![image](https://github.com/user-attachments/assets/fc57a6a9-44a2-4a3b-9766-6e7483ea7b67)


## 🔑 API Management

You can add voices from the library or remove existing voices from your account.

> [!Note]
> Please fill in the search field if you want to search for a specific voice. If you want to display the full list of voices, leave it empty.

![image](https://github.com/user-attachments/assets/35e870f1-8efa-4198-a43b-97075ca6c53c)

![image](https://github.com/user-attachments/assets/dcf0a0ba-b7be-44f9-9454-dceada462cd2)


## 📱 Mobile Version

![image](https://github.com/user-attachments/assets/3d40f76d-a754-429c-9adf-4a30a9cd0c34)

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
