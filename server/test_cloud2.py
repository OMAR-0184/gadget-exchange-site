import asyncio
from server.services.cloudinary_service import CloudinaryService
from fastapi import UploadFile
from io import BytesIO

async def main():
    # Make sure env vars are loaded if they exist in .env
    from dotenv import load_dotenv
    load_dotenv()
    
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
