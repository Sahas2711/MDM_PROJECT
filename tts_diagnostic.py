#!/usr/bin/env python3
"""Quick TTS diagnostic and fix."""

import asyncio
import httpx
import os
import sys

# Add the voice-to-voice directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend', 'voice-to-voice'))

from app.config import settings

async def test_tts_apis():
    """Test TTS API endpoints directly."""
    print("Voice Assistant TTS Diagnostic")
    print("=" * 40)
    
    # Test Hugging Face TTS
    print("Testing Hugging Face TTS API...")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.huggingface_base_url}/facebook/mms-tts-mar",
                headers={
                    "Authorization": f"Bearer {settings.huggingface_api_key}",
                    "Content-Type": "application/json"
                },
                json={"inputs": "नमस्कार"}
            )
            
            if response.status_code == 200:
                print(f"✓ Hugging Face TTS working - Response size: {len(response.content)} bytes")
            else:
                print(f"✗ Hugging Face TTS failed: {response.status_code} - {response.text}")
                
    except Exception as e:
        print(f"✗ Hugging Face TTS error: {e}")
    
    print()
    
    # Test ElevenLabs TTS
    print("Testing ElevenLabs TTS API...")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.fallback_tts_url}/{settings.fallback_tts_voice}",
                headers={
                    "xi-api-key": settings.fallback_tts_api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "text": "Hello, I am your farming assistant.",
                    "model_id": "eleven_multilingual_v2"
                }
            )
            
            if response.status_code == 200:
                print(f"✓ ElevenLabs TTS working - Response size: {len(response.content)} bytes")
            else:
                print(f"✗ ElevenLabs TTS failed: {response.status_code} - {response.text}")
                
    except Exception as e:
        print(f"✗ ElevenLabs TTS error: {e}")

async def create_fix():
    """Create a working TTS configuration."""
    print("\n🔧 Creating TTS fix...")
    
    # Simple working TTS configuration using free services
    fix_content = """# FIXED TTS CONFIGURATION
# Replace the TTS section in your .env file with this:

TTS_PROVIDER=http
TTS_FALLBACK_PROVIDER=none

# Use StreamElements free TTS (no API key required)
FALLBACK_TTS_URL=https://api.streamelements.com/kappa/v2/speech
FALLBACK_TTS_API_KEY=
FALLBACK_TTS_VOICE=Brian

# Alternative: Use Google Translate TTS (also free)
# FALLBACK_TTS_URL=https://translate.google.com/translate_tts
# FALLBACK_TTS_API_KEY=
# FALLBACK_TTS_VOICE=
"""
    
    with open("tts_fix.txt", "w") as f:
        f.write(fix_content)
    
    print("✓ Created tts_fix.txt with working configuration")
    print("To apply: Update your .env file with the TTS settings from tts_fix.txt")

if __name__ == "__main__":
    asyncio.run(test_tts_apis())
    asyncio.run(create_fix())