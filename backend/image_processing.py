from __future__ import annotations

from io import BytesIO
import hashlib
from typing import Any, Literal, TypedDict

from PIL import Image, UnidentifiedImageError


AnalysisMode = Literal["fast", "standard", "precision"]

DEFAULT_OUTPUT_FORMAT = "JPEG"
MIN_UPSCALE_LONG_SIDE = 900
CROP_RIGHT_RATIO = 0.35
CROP_BOTTOM_RATIO = 0.35


class AnalysisModeConfig(TypedDict):
    maxSide: int
    quality: int
    includeBottomCrop: bool
    includeCenterCrop: bool


IMAGE_ANALYSIS_MODE_CONFIG: dict[AnalysisMode, AnalysisModeConfig] = {
    "fast": {
        "maxSide": 1152,
        "quality": 85,
        "includeBottomCrop": False,
        "includeCenterCrop": False,
    },
    "standard": {
        "maxSide": 1344,
        "quality": 88,
        "includeBottomCrop": True,
        "includeCenterCrop": False,
    },
    "precision": {
        "maxSide": 1536,
        "quality": 90,
        "includeBottomCrop": True,
        "includeCenterCrop": True,
    },
}


def get_analysis_mode_config(mode: str) -> AnalysisModeConfig:
    normalized = mode if mode in IMAGE_ANALYSIS_MODE_CONFIG else "standard"
    return IMAGE_ANALYSIS_MODE_CONFIG[normalized]  # type: ignore[index]


def normalize_analysis_mode(mode: str | None) -> AnalysisMode:
    if mode in IMAGE_ANALYSIS_MODE_CONFIG:
        return mode  # type: ignore[return-value]
    return "standard"


def get_image_metadata(image: Image.Image) -> dict[str, int | str | None]:
    return {
        "format": image.format,
        "width": image.width,
        "height": image.height,
        "mode": image.mode,
    }


def resize_image_for_ai(
    image: Image.Image,
    max_long_side: int,
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


def crop_bottom_region(image: Image.Image, ratio: float = CROP_BOTTOM_RATIO) -> Image.Image:
    crop_height = max(1, int(image.height * ratio))
    top = image.height - crop_height
    return image.crop((0, top, image.width, image.height))


def crop_center_chart_region(image: Image.Image) -> Image.Image:
    left = int(image.width * 0.08)
    top = int(image.height * 0.08)
    right = max(left + 1, int(image.width * 0.80))
    bottom = max(top + 1, int(image.height * 0.82))
    return image.crop((left, top, right, bottom))


def convert_to_rgb(image: Image.Image) -> Image.Image:
    if image.mode in ("RGBA", "LA"):
        alpha = image.getchannel("A")
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image.convert("RGB"), mask=alpha)
        return background

    if image.mode != "RGB":
        return image.convert("RGB")

    return image


def compress_to_jpeg_bytes(image: Image.Image, quality: int) -> bytes:
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


def _image_payload(image: Image.Image, quality: int) -> dict[str, Any]:
    image_bytes = compress_to_jpeg_bytes(image, quality=quality)
    return {
        "bytes": image_bytes,
        "format": DEFAULT_OUTPUT_FORMAT,
        "sizeBytes": len(image_bytes),
        "width": image.width,
        "height": image.height,
        "quality": quality,
    }


def process_image_for_ai(
    image_bytes: bytes,
    filename: str,
    content_type: str | None,
    mode: str = "standard",
) -> dict[str, Any]:
    analysis_mode = normalize_analysis_mode(mode)
    config = get_analysis_mode_config(analysis_mode)
    quality = config["quality"]

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image.load()
            original_width = image.width
            original_height = image.height

            resized_full_image = resize_image_for_ai(image, max_long_side=config["maxSide"])
            right_crop_image = crop_right_region(resized_full_image)
            bottom_crop_image = crop_bottom_region(resized_full_image) if config["includeBottomCrop"] else None
            center_chart_image = crop_center_chart_region(resized_full_image) if config["includeCenterCrop"] else None

            full_payload = _image_payload(resized_full_image, quality)
            right_payload = _image_payload(right_crop_image, quality)
            bottom_payload = _image_payload(bottom_crop_image, quality) if bottom_crop_image else None
            center_payload = _image_payload(center_chart_image, quality) if center_chart_image else None
    except UnidentifiedImageError as exc:
        raise ValueError("유효한 이미지 파일이 아닙니다.") from exc
    except OSError as exc:
        raise ValueError("이미지 파일을 처리할 수 없습니다.") from exc

    images = {
        "fullImage": full_payload["bytes"],
        "rightCropImage": right_payload["bytes"],
        "bottomCropImage": bottom_payload["bytes"] if bottom_payload else None,
        "centerChartImage": center_payload["bytes"] if center_payload else None,
    }
    processed_sha = generate_sha256(full_payload["bytes"])
    original_sha = generate_sha256(image_bytes)

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
            "sizeBytes": full_payload["sizeBytes"],
            "width": full_payload["width"],
            "height": full_payload["height"],
            "quality": quality,
        },
        "processedCropImage": {
            "format": DEFAULT_OUTPUT_FORMAT,
            "sizeBytes": right_payload["sizeBytes"],
            "width": right_payload["width"],
            "height": right_payload["height"],
            "quality": quality,
            "cropArea": "right_35_percent",
        },
        "processedBottomCropImage": (
            {
                "format": DEFAULT_OUTPUT_FORMAT,
                "sizeBytes": bottom_payload["sizeBytes"],
                "width": bottom_payload["width"],
                "height": bottom_payload["height"],
                "quality": quality,
                "cropArea": "bottom_35_percent",
            }
            if bottom_payload
            else None
        ),
        "processedCenterChartImage": (
            {
                "format": DEFAULT_OUTPUT_FORMAT,
                "sizeBytes": center_payload["sizeBytes"],
                "width": center_payload["width"],
                "height": center_payload["height"],
                "quality": quality,
                "cropArea": "center_chart",
            }
            if center_payload
            else None
        ),
        "optimization": {
            "originalSha256": original_sha,
            "processedSha256": processed_sha,
            "sizeReductionPercent": calculate_reduction_percent(
                len(image_bytes),
                full_payload["sizeBytes"],
            ),
            "widthReductionPercent": calculate_reduction_percent(
                original_width,
                full_payload["width"],
            ),
            "heightReductionPercent": calculate_reduction_percent(
                original_height,
                full_payload["height"],
            ),
        },
        "analysisMode": analysis_mode,
    }

    return {
        "images": images,
        "fullImageBytes": full_payload["bytes"],
        "cropImageBytes": right_payload["bytes"],
        "imageInfo": image_info,
        "analysisMode": analysis_mode,
    }
