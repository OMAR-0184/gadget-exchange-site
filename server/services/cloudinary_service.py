import cloudinary
import cloudinary.uploader
from cloudinary.exceptions import Error as CloudinaryError
from fastapi import UploadFile, HTTPException
import logging
import mimetypes
from server.core.config import settings

_configured = False
logger = logging.getLogger(__name__)

def _ensure_configured():
    global _configured
    if not _configured:
        missing = []
        if not settings.CLOUDINARY_CLOUD_NAME:
            missing.append("CLOUDINARY_CLOUD_NAME")
        if not settings.CLOUDINARY_API_KEY:
            missing.append("CLOUDINARY_API_KEY")
        if not settings.CLOUDINARY_API_SECRET:
            missing.append("CLOUDINARY_API_SECRET")
        if missing:
            raise HTTPException(
                status_code=500,
                detail=f"Cloudinary is not configured. Missing: {', '.join(missing)}",
            )
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
            content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0]
            if not content_type or not content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' is not a valid image. Only image files are allowed."
                )

            contents = await file.read()
            if len(contents) > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"File '{file.filename}' exceeds 5MB limit")

            try:
                result = cloudinary.uploader.upload(
                    contents,
                    folder="gadget_marketplace",
                    resource_type="image",
                    transformation=[
                        {"width": 1200, "height": 1200, "crop": "limit"},
                        {"quality": "auto", "fetch_format": "auto"}
                    ]
                )
            except CloudinaryError as exc:
                logger.exception("Cloudinary upload failed for %s", file.filename)
                raise HTTPException(
                    status_code=502,
                    detail=f"Cloudinary upload failed for '{file.filename}'. Check Cloudinary credentials and network access.",
                ) from exc
            urls.append(result["secure_url"])

        return urls
