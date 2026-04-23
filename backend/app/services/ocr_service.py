import re
import cv2
import pytesseract
from PIL import Image
from deep_translator import GoogleTranslator

# Windows local path
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Optional barcode support
try:
    from pyzbar.pyzbar import decode as pyzbar_decode
except Exception:
    pyzbar_decode = None


def extract_barcode(image_path: str) -> str | None:
    if pyzbar_decode is None:
        return None

    image = cv2.imread(image_path)
    if image is None:
        return None

    try:
        barcodes = pyzbar_decode(image)
        for barcode in barcodes:
            data = barcode.data.decode("utf-8", errors="ignore").strip()
            if data:
                return data
    except Exception:
        return None

    return None


def crop_center_region(image):
    h, w = image.shape[:2]

    x1 = int(w * 0.08)
    y1 = int(h * 0.10)
    x2 = int(w * 0.92)
    y2 = int(h * 0.82)

    return image[y1:y2, x1:x2]


def preprocess_image(image_path: str) -> Image.Image:
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Could not read image")

    cropped = crop_center_region(image)
    gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return Image.fromarray(thresh)


def extract_text(image_path: str) -> str:
    try:
        processed_image = preprocess_image(image_path)
        text = pytesseract.image_to_string(
            processed_image,
            lang="chi_sim",
            config="--oem 3 --psm 6"
        )
        return text.strip()
    except Exception:
        return ""


def clean_text(text: str) -> str:
    if not text:
        return ""

    lines = text.split("\n")
    clean_lines = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if len(line) < 2:
            continue

        line = re.sub(r"\s+", " ", line)

        if re.match(r"^[A-Za-z0-9\W_]+$", line) and not re.search(r"[\u4e00-\u9fff]", line):
            continue

        if re.search(r"[\u4e00-\u9fff]", line):
            clean_lines.append(line)

    text = " ".join(clean_lines)

    # light normalization for common OCR junk
    text = re.sub(r"[“”\"']", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def extract_medicine_name(text: str) -> str | None:
    if not text:
        return None

    first_part = text[:180]

    known_candidates = [
        "双黄连口服液",
        "蓝芩口服液",
        "板蓝根颗粒",
        "感冒灵颗粒",
        "蒲地蓝消炎口服液",
        "阿莫西林胶囊",
    ]

    for item in known_candidates:
        if item in first_part:
            return item

    patterns = [
        r"[\u4e00-\u9fff]{2,20}口服液",
        r"[\u4e00-\u9fff]{2,20}胶囊",
        r"[\u4e00-\u9fff]{2,20}颗粒",
        r"[\u4e00-\u9fff]{2,20}片",
        r"[\u4e00-\u9fff]{2,20}丸",
        r"[\u4e00-\u9fff]{2,20}散",
        r"[\u4e00-\u9fff]{2,20}膏",
        r"[\u4e00-\u9fff]{2,20}糖浆",
        r"[\u4e00-\u9fff]{2,20}注射液",
    ]

    for pattern in patterns:
        match = re.search(pattern, first_part)
        if match:
            return match.group().strip()

    chinese_words = re.findall(r"[\u4e00-\u9fff]{2,12}", first_part)
    if chinese_words:
        return chinese_words[0]

    return None


def extract_manufacturer(text: str) -> str | None:
    if not text:
        return None

    patterns = [
        r"[\u4e00-\u9fffA-Za-z0-9（）()]+药业有限公司",
        r"[\u4e00-\u9fffA-Za-z0-9（）()]+制药有限公司",
        r"[\u4e00-\u9fffA-Za-z0-9（）()]+有限公司",
        r"[\u4e00-\u9fffA-Za-z0-9（）()]+制药厂",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            manufacturer = match.group().strip()

            # remove dosage noise stuck to manufacturer
            manufacturer = re.sub(r"^\d+\s*[x×X]?\s*\d*\s*支", "", manufacturer).strip()
            manufacturer = re.sub(r"^\d+\s*毫升\s*[x×X]?\s*\d*\s*支", "", manufacturer).strip()
            manufacturer = re.sub(r"^[A-Za-z0-9\+\-xX×]+", "", manufacturer).strip()

            return manufacturer if manufacturer else None

    return None


def extract_usage(text: str) -> str | None:
    if not text:
        return None

    patterns = [
        r"功能主治[:：]?\s*[^。]+",
        r"用于[^。]+",
        r"主治[^。]+",
        r"清热解毒[^。]*",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            usage = match.group().strip()
            usage = re.sub(r"[\+\-xX×]\d+支.*$", "", usage).strip()
            usage = re.sub(r"[\u4e00-\u9fffA-Za-z0-9（）()]*有限公司.*$", "", usage).strip()
            usage = re.sub(r"\s+", " ", usage).strip()
            return usage

    return None


def extract_dosage(text: str) -> str | None:
    if not text:
        return None

    normalized = re.sub(r"\s+", "", text)

    patterns = [
        r"\d+毫升[x×X]\d+支",
        r"\d+ml[x×X]\d+支",
        r"\d+[x×X]\d+支",
        r"\d+支",
        r"\d+ml",
        r"\d+毫升",
    ]

    for pattern in patterns:
        match = re.search(pattern, normalized, re.IGNORECASE)
        if match:
            value = match.group().strip()
            value = value.replace("X", "×").replace("x", "×")
            return value

    return None


def build_translation_input(
    medicine_name: str | None,
    manufacturer: str | None,
    usage: str | None,
    dosage: str | None,
    raw_text: str,
) -> str:
    parts = []

    if medicine_name:
        parts.append(f"药品名称：{medicine_name}")
    if manufacturer:
        parts.append(f"生产厂家：{manufacturer}")
    if usage:
        parts.append(f"功能主治：{usage}")
    if dosage:
        parts.append(f"规格：{dosage}")

    # only append raw OCR if structured fields are too weak
    if len(parts) < 2 and raw_text:
        parts.append(raw_text)

    return "\n".join(parts).strip()


def translate_text(text: str) -> str:
    if not text:
        return ""

    try:
        return GoogleTranslator(source="auto", target="en").translate(text)
    except Exception:
        return ""