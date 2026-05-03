from __future__ import annotations

from io import BytesIO
import hashlib
from typing import Any

from PIL import Image, UnidentifiedImageError


MAX_AI_IMAGE_LONG_SIDE = 1280
MIN_UPSCALE_LONG_SIDE = 900
DEFAULT_OUTPUT_FORMAT = "JPEG"
DEFAULT_JPEG_QUALITY = 85
CROP_RIGHT_RATIO = 0.35


def get_image_metadata(image: Image.Image) -> dict[str, int | str | None]:
    return {
        "format": image.format,
        "width": image.width,
        "height": image.height,
        "mode": image.mode,
    }


def resize_image_for_ai(
    image: Image.Image,
    max_long_side: int = MAX_AI_IMAGE_LONG_SIDE,
    min_upscale_long_side: int = MIN_UPSCALE_LONG_SIDE,
) -> Image.Image:
    resized_image = image.copy()
    long_side = max(resized_image.width, resized_image.height)

    if long_side < min_upscale_long_side:
        return resized_image

    resized_image.thumbnail((max_long_side, max_long_side), Image.Resampling.LANCZOS)
    return resized_image


def crop_right_region(image: Image.Image, ratio: float = CROP_RIGHT_RATIO) -> Image.Image:
    crop_width = max(1, int(image.width * ratio))
    left = image.width - crop_width
    return image.crop((left, 0, image.width, image.height))


def convert_to_rgb(image: Image.Image) -> Image.Image:
    if image.mode in ("RGBA", "LA"):
        alpha = image.getchannel("A")
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image.convert("RGB"), mask=alpha)
        return background

    if image.mode != "RGB":
        return image.convert("RGB")

    return image


def compress_to_jpeg_bytes(image: Image.Image, quality: int = DEFAULT_JPEG_QUALITY) -> bytes:
    output = BytesIO()
    prepared_image = convert_to_rgb(image)
    prepared_image.save(output, format=DEFAULT_OUTPUT_FORMAT, quality=quality, optimize=True)
    return output.getvalue()


def generate_sha256(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()


def calculate_reduction_percent(original_value: int, processed_value: int) -> float:
    if original_value <= 0:
        return 0.0

    return round(((original_value - processed_value) / original_value) * 100, 2)


def process_image_for_ai(
    image_bytes: bytes,
    filename: str,
    content_type: str | None,
    quality: int = DEFAULT_JPEG_QUALITY,
) -> dict[str, Any]:
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image.load()
            original_width = image.width
            original_height = image.height

            resized_full_image = resize_image_for_ai(image)
            crop_image = crop_right_region(resized_full_image)
            processed_full_bytes = compress_to_jpeg_bytes(resized_full_image, quality=quality)
            processed_crop_bytes = compress_to_jpeg_bytes(crop_image, quality=quality)
    except UnidentifiedImageError as exc:
        raise ValueError("유효한 이미지 파일이 아닙니다.") from exc
    except OSError as exc:
        raise ValueError("이미지 파일을 처리할 수 없습니다.") from exc

    image_info = {
        "original": {
            "filename": filename,
            "contentType": content_type,
            "sizeBytes": len(image_bytes),
            "width": original_width,
            "height": original_height,
        },
        "processedFullImage": {
            "format": DEFAULT_OUTPUT_FORMAT,
            "sizeBytes": len(processed_full_bytes),
            "width": resized_full_image.width,
            "height": resized_full_image.height,
            "quality": quality,
        },
        "processedCropImage": {
            "format": DEFAULT_OUTPUT_FORMAT,
            "sizeBytes": len(processed_crop_bytes),
            "width": crop_image.width,
            "height": crop_image.height,
            "quality": quality,
            "cropArea": "right_35_percent",
        },
        "optimization": {
            "originalSha256": generate_sha256(image_bytes),
            "processedSha256": generate_sha256(processed_full_bytes),
            "sizeReductionPercent": calculate_reduction_percent(
                len(image_bytes),
                len(processed_full_bytes),
            ),
            "widthReductionPercent": calculate_reduction_percent(
                original_width,
                resized_full_image.width,
            ),
            "heightReductionPercent": calculate_reduction_percent(
                original_height,
                resized_full_image.height,
            ),
        },
    }

    return {
        "fullImageBytes": processed_full_bytes,
        "cropImageBytes": processed_crop_bytes,
        "imageInfo": image_info,
    }
