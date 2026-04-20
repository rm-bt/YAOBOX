import cv2
import pytesseract
import re
from PIL import Image
from deep_translator import GoogleTranslator

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def clean_text(text: str) -> str:
    lines = text.split("\n")
    clean_lines = []

    for line in lines:
        line = line.strip()

        # remove short junk
        if len(line) < 4:
            continue

        # remove garbage uppercase OCR noise
        if re.match(r'^[A-Z0-9\s]+$', line):
            continue

        # keep only lines with Chinese or meaningful text
        if re.search(r'[\u4e00-\u9fff]', line):
            clean_lines.append(line)

    return " ".join(clean_lines)

def crop_center_region(image):
    h, w = image.shape[:2]

    x1 = int(w * 0.08)
    y1 = int(h * 0.12)
    x2 = int(w * 0.92)
    y2 = int(h * 0.82)

    cropped = image[y1:y2, x1:x2]
    return cropped


def preprocess_image(image_path: str) -> Image.Image:
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Could not read image")

    cropped = crop_center_region(image)

    gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)

    scale = 2
    resized = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    return Image.fromarray(resized)


def extract_text(image_path: str) -> str:
    processed_image = preprocess_image(image_path)

    text = pytesseract.image_to_string(
        processed_image,
        lang="chi_sim+eng",
        config="--psm 4"
    )

    cleaned = clean_text(text)
    return cleaned
def extract_medicine_name(text: str) -> str:
    # look only near the beginning
    first_part = text[:120]

    candidates = [
        "双黄连口服液",
        "双黄连口服液",
        "双黄连口服",
    ]

    for item in candidates:
        if item in first_part:
            return "双黄连口服液"

    import re

    patterns = [
        r'[\u4e00-\u9fff]{2,20}口服液',
        r'[\u4e00-\u9fff]{2,20}胶囊',
        r'[\u4e00-\u9fff]{2,20}颗粒',
        r'[\u4e00-\u9fff]{2,20}片',
        r'[\u4e00-\u9fff]{2,20}丸',
    ]

    for pattern in patterns:
        match = re.search(pattern, first_part)
        if match:
            return match.group()

    chinese_words = re.findall(r'[\u4e00-\u9fff]{2,12}', first_part)
    if chinese_words:
        return chinese_words[0]

    return None
def translate_text(text: str) -> str:
    try:
        return GoogleTranslator(source='auto', target='en').translate(text)
    except:
        return ""
def extract_manufacturer(text: str) -> str:
    import re

    match = re.search(r'[\u4e00-\u9fffA-Za-z\s]+有限公司', text)
    if match:
        return match.group()

    return None    
def extract_usage(text: str) -> str:
    match = re.search(r'(功能主治.*?用于.*?感冒)', text)
    if match:
        return match.group()

    match = re.search(r'(用于.*?感冒)', text)
    if match:
        return match.group()

    return None
    