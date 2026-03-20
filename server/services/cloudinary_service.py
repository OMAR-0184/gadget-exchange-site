import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException
from server.core.config import settings

_configured = False

def _ensure_configured():
    global _configured
    if not _configured:
        if not settings.CLOUDINARY_CLOUD_NAME:
            raise HTTPException(status_code=500, detail="Cloudinary is not configured")
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )
        _configured = True

class CloudinaryService:
    @staticmethod
    async def upload_images(files: list[UploadFile]) -> list[str]:
        """Upload multiple image files to Cloudinary and return their URLs."""
        _ensure_configured()

        urls = []
        for file in files:
            # Validate file type
            if not file.content_type or not file.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' is not a valid image. Only image files are allowed."
                )

            contents = await file.read()
            # 5MB limit per image
            if len(contents) > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"File '{file.filename}' exceeds 5MB limit")

            result = cloudinary.uploader.upload(
                contents,
                folder="gadget_marketplace",
                resource_type="image",
                transformation=[
                    {"width": 1200, "height": 1200, "crop": "limit"},
                    {"quality": "auto", "fetch_format": "auto"}
                ]
            )
            urls.append(result["secure_url"])

        return urls
