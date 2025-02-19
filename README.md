# ElevenLabs Free

A simple web application built with Flask that allows users to generate speech from text using ElevenLabs' text-to-speech API.

> [!Warning]
> Generating more than **5000 characters** at once may result in **failure**.
> For better success rates, **generate in smaller batches**.  
> If the generation **fails**, your **credits will still be used** without producing any audio.

## ✨ Features

- Download generated audio files
- Multiple model options 
- Multiple voice options
- Credit usage tracking
- Multiple API keys
- API Management
- Responsive UI
  
## 🖼️ Screenshots

![image](https://github.com/user-attachments/assets/48c9c998-39c0-4ea6-a46c-de489271597d)

![image](https://github.com/user-attachments/assets/f6ffab32-f058-4100-97dc-573b0569ff5d)

![image](https://github.com/user-attachments/assets/b7f8beed-9a67-4590-b5ca-50222af70acd)

## 🔑 API Management

![image](https://github.com/user-attachments/assets/4c6cf8cf-2cd3-4bd0-8cd6-e8ab6b6449f1)

![image](https://github.com/user-attachments/assets/a7b364af-99a1-4029-84a2-dadddc56fbc0)

> [!Note]
> Please fill in the search field if you want to search for a specific voice. If you want to display the full list of voices, leave it empty.

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
     
## 🌐 Vercel Deployment

Click the button below!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/afkarxyz/elevenlabs-free/tree/main)
