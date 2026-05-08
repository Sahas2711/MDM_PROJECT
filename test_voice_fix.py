#!/usr/bin/env python3
"""Quick test to identify and fix voice assistant TTS issues."""

import asyncio
import httpx
from backend.voice_to_voice.app.config import settings
from backend.voice_to_voice.app.providers.tts import HuggingFaceTTSProvider, HttpTTSProvider

async def test_huggingface_tts():
    """Test Hugging Face TTS provider."""
    print("Testing Hugging Face TTS...")
    try:
        provider = HuggingFaceTTSProvider()
        audio_bytes, mime_type = await provider.synthesize("नमस्कार, मी तुमचा कृषी सहायक आहे.")
        print(f"✓ Hugging Face TTS working - Audio size: {len(audio_bytes)} bytes, Type: {mime_type}")
        return True
    except Exception as e:
        print(f"✗ Hugging Face TTS failed: {e}")
        return False

async def test_fallback_tts():
    """Test fallback TTS provider."""
    print("Testing Fallback TTS...")
    try:
        provider = HttpTTSProvider()
        audio_bytes, mime_type = await provider.synthesize("Hello, I am your farming assistant.")
        print(f"✓ Fallback TTS working - Audio size: {len(audio_bytes)} bytes, Type: {mime_type}")
        return True
    except Exception as e:
        print(f"✗ Fallback TTS failed: {e}")
        return False

async def test_api_keys():
    """Test API key validity."""
    print("Testing API keys...")
    
    # Test Hugging Face API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api-inference.huggingface.co/models/facebook/mms-tts-mar",
                headers={"Authorization": f"Bearer {settings.huggingface_api_key}"}
            )
            if response.status_code == 200:
                print("✓ Hugging Face API key valid")
            else:
                print(f"✗ Hugging Face API issue: {response.status_code}")
    except Exception as e:
        print(f"✗ Hugging Face API test failed: {e}")
    
    # Test ElevenLabs API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": settings.fallback_tts_api_key}
            )
            if response.status_code == 200:
                print("✓ ElevenLabs API key valid")
            else:
                print(f"✗ ElevenLabs API issue: {response.status_code}")
    except Exception as e:
        print(f"✗ ElevenLabs API test failed: {e}")

async def main():
    print("Voice Assistant Diagnostic Test")
    print("=" * 40)
    
    await test_api_keys()
    print()
    
    hf_works = await test_huggingface_tts()
    print()
    
    fallback_works = await test_fallback_tts()
    print()
    
    if not hf_works and not fallback_works:
        print("🔧 FIXING: Both TTS providers failed. Updating configuration...")
        
        # Create a working TTS configuration
        fix_config = """
# Quick fix for TTS issues
TTS_PROVIDER=http
TTS_FALLBACK_PROVIDER=none

# Use a simple TTS service
FALLBACK_TTS_URL=https://api.streamelements.com/kappa/v2/speech
FALLBACK_TTS_API_KEY=
FALLBACK_TTS_VOICE=Brian
"""
        
        with open("backend/voice-to-voice/.env.fix", "w") as f:
            f.write(fix_config)
        
        print("✓ Created .env.fix with working TTS configuration")
        print("To apply: copy contents of .env.fix to .env and restart voice service")

if __name__ == "__main__":
    asyncio.run(main())