from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile


MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024

ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
}

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
}


def validate_image_upload_metadata(file: UploadFile) -> str:
    filename = (file.filename or "").strip()
    content_type = (file.content_type or "").strip().lower()

    if not filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename")

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_IMAGE_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type. Allowed extensions: {allowed}",
        )

    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        allowed = ", ".join(sorted(ALLOWED_IMAGE_CONTENT_TYPES))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image content type. Allowed content types: {allowed}",
        )

    return extension


def validate_upload_bytes(file_bytes: bytes) -> None:
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        max_mb = MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file is too large. Maximum allowed size is {max_mb} MB",
        )


def build_upload_path(extension: str) -> tuple[str, str]:
    safe_extension = extension if extension.startswith(".") else f".{extension}"
    filename = f"{uuid4().hex}{safe_extension}"
    return filename, str(Path("uploads") / filename)
