import sys
import os

# ── Ensure the correct Python environment is on sys.path ─────────────────────
# Priority order:
#   1. A .venv inside the project root (d:\GuestManagementApp\.venv)
#   2. User site-packages (installed with pip --user)
#   3. System site-packages (fallback)
#
# This script is called by Node.js via spawn('python', ...) so we can't always
# control which Python interpreter is used. Adding site-packages explicitly
# ensures rapidocr_onnxruntime is always found at runtime AND resolves IDE
# linter errors that only check the system Python paths.

def _add_site_packages():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = script_dir
    # 1. Look for a .venv relative to this file's project root
    for _ in range(4):
        venv_site = os.path.join(candidate, '.venv', 'Lib', 'site-packages')
        if os.path.isdir(venv_site) and venv_site not in sys.path:
            sys.path.insert(0, venv_site)
            break
        candidate = os.path.dirname(candidate)

    # 2. Check system Python site-packages locations on Windows (3.14 down to 3.8)
    system_sites = [
        r"C:\Program Files\Python314\Lib\site-packages",
        r"C:\Program Files\Python313\Lib\site-packages",
        r"C:\Program Files\Python312\Lib\site-packages",
        r"C:\Program Files\Python311\Lib\site-packages",
        r"C:\Program Files\Python310\Lib\site-packages",
        r"C:\Python314\Lib\site-packages",
        r"C:\Python313\Lib\site-packages",
        r"C:\Python312\Lib\site-packages",
        r"C:\Python311\Lib\site-packages",
        r"C:\Python310\Lib\site-packages",
    ]

    # Dynamically discover any other Python installation site-packages on Windows
    for base in ["C:\\Program Files", "C:\\", os.environ.get("LOCALAPPDATA", "") + "\\Programs\\Python"]:
        if os.path.isdir(base):
            try:
                for item in os.listdir(base):
                    if item.lower().startswith("python"):
                        sp = os.path.join(base, item, "Lib", "site-packages")
                        if os.path.isdir(sp) and sp not in system_sites:
                            system_sites.append(sp)
            except Exception:
                pass

    for sys_site in system_sites:
        if os.path.isdir(sys_site) and sys_site not in sys.path:
            sys.path.append(sys_site)

    # 3. Check site.getsitepackages() and site.getusersitepackages()
    try:
        import site
        if hasattr(site, 'getsitepackages'):
            for s in site.getsitepackages():
                if s and os.path.isdir(s) and s not in sys.path:
                    sys.path.append(s)
        user_site = site.getusersitepackages()
        if user_site and os.path.isdir(user_site) and user_site not in sys.path:
            sys.path.append(user_site)
    except Exception:
        pass

_add_site_packages()

import json  # noqa: E402 (imported after path fix)


def sort_ocr_results(ocr_result):
    """
    Sort OCR boxes into natural top-to-bottom, left-to-right reading order
    by clustering boxes into horizontal rows.
    """
    if not ocr_result:
        return []

    processed_items = []
    for item in ocr_result:
        box, text, score = item[0], item[1], item[2]
        clean_text = str(text).strip()
        if not clean_text:
            continue
        xs = [pt[0] for pt in box]
        ys = [pt[1] for pt in box]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        center_y = (min_y + max_y) / 2.0
        height = max(1.0, max_y - min_y)
        processed_items.append({
            'box': box,
            'text': clean_text,
            'score': float(score),
            'min_x': min_x,
            'max_x': max_x,
            'min_y': min_y,
            'max_y': max_y,
            'center_y': center_y,
            'height': height
        })

    if not processed_items:
        return []

    # Sort primarily by center_y to start clustering
    processed_items.sort(key=lambda item: item['center_y'])

    rows = []
    for item in processed_items:
        placed = False
        for row in rows:
            row_avg_y = sum(i['center_y'] for i in row) / len(row)
            row_avg_h = sum(i['height'] for i in row) / len(row)
            # Check if Y distance is within half line height or 15 pixels
            threshold = max(12.0, row_avg_h * 0.55)
            if abs(item['center_y'] - row_avg_y) <= threshold:
                row.append(item)
                placed = True
                break
        if not placed:
            rows.append([item])

    # Sort each row left to right, then sort rows top to bottom
    rows.sort(key=lambda r: sum(i['center_y'] for i in r) / len(r))
    
    final_items = []
    for row in rows:
        row.sort(key=lambda i: i['min_x'])
        final_items.extend(row)

    return final_items


import io
import base64


def detect_document_and_face(image_path, sorted_items, doc_type='Auto'):
    """
    Detect document card boundaries and estimate user face photo region
    from text layout bounding boxes and crop portrait image for both Passport and QID.
    """
    if not sorted_items:
        return None, None, None

    try:
        from PIL import Image

        with Image.open(image_path) as img:
            img_w, img_h = img.size

            all_xs = [i['min_x'] for i in sorted_items] + [i['max_x'] for i in sorted_items]
            all_ys = [i['min_y'] for i in sorted_items] + [i['max_y'] for i in sorted_items]

            text_min_x, text_max_x = min(all_xs), max(all_xs)
            text_min_y, text_max_y = min(all_ys), max(all_ys)

            text_w = max(10, text_max_x - text_min_x)
            text_h = max(10, text_max_y - text_min_y)

            # Document card padding (add ~15% margin around text)
            pad_x = text_w * 0.15
            pad_y = text_h * 0.15

            card_left = max(0, int(text_min_x - pad_x))
            card_top = max(0, int(text_min_y - pad_y))
            card_right = min(img_w, int(text_max_x + pad_x))
            card_bottom = min(img_h, int(text_max_y + pad_y))
            card_w = max(20, card_right - card_left)
            card_h = max(20, card_bottom - card_top)

            card_box = {
                'left': card_left,
                'top': card_top,
                'width': card_w,
                'height': card_h
            }

            full_text = " ".join([i['text'] for i in sorted_items]).upper()

            # Determine whether this is a Passport or QID for face photo positioning
            is_passport = doc_type.lower() == 'passport' or 'P<' in full_text or 'PASSPORT' in full_text or 'REPUBLIC' in full_text
            is_qid = doc_type.lower() == 'qid' or 'QID' in full_text or 'RESIDENCY' in full_text or 'PERMIT' in full_text or 'QATAR' in full_text

            if is_passport and not is_qid:
                # Passport portrait photo is located on the LEFT side of the document page layout
                face_left = max(0, int(card_left + card_w * 0.02))
                face_top = max(0, int(card_top + card_h * 0.12))
                face_w = min(img_w - face_left, int(card_w * 0.38))
                face_h = min(img_h - face_top, int(card_h * 0.65))
            else:
                # QID portrait photo is located on the RIGHT side of the card layout
                face_left = max(0, int(card_left + card_w * 0.58))
                face_top = max(0, int(card_top + card_h * 0.05))
                face_w = min(img_w - face_left, int(card_w * 0.40))
                face_h = min(img_h - face_top, int(card_h * 0.88))

            if face_w < 10 or face_h < 10:
                return card_box, None, None

            face_box = {
                'left': face_left,
                'top': face_top,
                'width': face_w,
                'height': face_h
            }

            # Crop user face photo
            face_crop = img.crop((
                face_left,
                face_top,
                face_left + face_w,
                face_top + face_h
            ))
            face_crop = face_crop.resize((240, 240), Image.Resampling.LANCZOS)
            buffered = io.BytesIO()
            face_crop.convert('RGB').save(buffered, format="JPEG", quality=88)
            face_base64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode('utf-8')

            return card_box, face_box, face_base64
    except Exception:
        return None, None, None


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]
    doc_type = sys.argv[2] if len(sys.argv) > 2 else 'Auto'

    if not os.path.exists(image_path):
        print(json.dumps({"error": f"Image file not found: {image_path}"}))
        sys.exit(1)

    try:
        from rapidocr_onnxruntime import RapidOCR
        engine = RapidOCR()
        ocr_result, elapse = engine(image_path)

        if not ocr_result:
            print(json.dumps({"success": True, "text": "", "lines": []}))
            sys.exit(0)

        sorted_items = sort_ocr_results(ocr_result)

        lines = []
        lines_with_scores = []
        for item in sorted_items:
            lines.append(item['text'])
            lines_with_scores.append({"text": item['text'], "score": item['score']})

        full_text = "\n".join(lines)
        card_box, face_box, face_base64 = detect_document_and_face(image_path, sorted_items, doc_type)

        print(json.dumps({
            "success": True,
            "text": full_text,
            "lines": lines,
            "details": lines_with_scores,
            "card_box": card_box,
            "face_box": face_box,
            "face_base64": face_base64
        }))

    except ImportError as e:
        print(json.dumps({
            "error": (
                f"rapidocr_onnxruntime not found: {str(e)}. "
                "Install it with: python -m pip install rapidocr_onnxruntime"
            )
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"PaddleOCR execution error: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
