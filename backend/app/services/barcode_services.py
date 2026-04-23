from typing import Optional
import cv2
from pyzbar.pyzbar import decode


def extract_barcode(image_path: str) -> Optional[str]:
    image = cv2.imread(image_path)
    if image is None:
        return None

    barcodes = decode(image)
    for barcode in barcodes:
        data = barcode.data.decode("utf-8", errors="ignore").strip()
        if data:
            return data

    return None