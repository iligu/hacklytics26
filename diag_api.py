
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ No API key found in .env")
    exit(1)

genai.configure(api_key=api_key)

print(f"Testing Key: {api_key[:10]}...{api_key[-5:]}")

try:
    print("\n--- Available Models ---")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Found: {m.name}")
    
    print("\n--- Test Generation (Gemini 2.0 Flash) ---")
    try:
        model_20 = genai.GenerativeModel('gemini-2.0-flash')
        response_20 = model_20.generate_content("Say 'Gemini 2.0 works!'")
        print(f"Response: {response_20.text}")
    except Exception as e:
        print(f"❌ Gemini 2.0 Failed: {e}")

    print("\n--- Test Generation (Gemini Flash Latest) ---")
    try:
        model_latest = genai.GenerativeModel('gemini-flash-latest')
        response_latest = model_latest.generate_content("Say 'Gemini Flash Latest works!'")
        print(f"Response: {response_latest.text}")
    except Exception as e:
        print(f"❌ Gemini Flash Latest Failed: {e}")

    print("\n--- Test Generation (Gemma 3 1B) ---")
    try:
        model_gemma = genai.GenerativeModel('gemma-3-1b-it')
        response_gemma = model_gemma.generate_content("Say 'Gemma works!'")
        print(f"Response: {response_gemma.text}")
    except Exception as e:
        print(f"❌ Gemma Failed: {e}")

except Exception as e:
    print(f"\n❌ API Test Failed: {e}")
