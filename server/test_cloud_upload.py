import asyncio
import os
from dotenv import load_dotenv

# load env vars before importing settings
load_dotenv(".env")
load_dotenv("../.env")

from server.services.cloudinary_service import CloudinaryService
from fastapi import UploadFile
from io import BytesIO

async def main():
    # create dummy file
    file = UploadFile(filename="test.png", file=BytesIO(b"dummy image data"))
    file.content_type = "image/png"
    
    try:
        urls = await CloudinaryService.upload_images([file])
        print("Success:", urls)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
