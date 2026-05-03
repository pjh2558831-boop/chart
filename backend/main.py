from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai_analysis import analyze_chart_image_with_ai
from image_processing import process_image_for_ai
from market_data import (
    build_yfinance_candidates,
    fetch_ohlcv_from_candidates,
    map_timeframe_to_yfinance,
    should_run_market_validation,
    validate_ohlcv_data,
)
from schemas import AnalysisResponse
from technical_analysis import run_technical_analysis
from visual_trade_signal import generate_visual_trade_signal


BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}


app = FastAPI(title="AI Stock Chart Image Analysis MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_extension(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip(".")


def _validate_upload_metadata(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 없는 업로드입니다.")

    extension = _get_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. png, jpg, jpeg, webp만 업로드할 수 있습니다.",
        )

    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 이미지 MIME 타입입니다.")


def _try_build_technical_analysis(ai_analysis) -> dict | None:
    symbol_detection = ai_analysis.symbolDetection.model_dump()
    should_run, _ = should_run_market_validation(symbol_detection)
    if not should_run:
        return None

    timeframe = map_timeframe_to_yfinance(ai_analysis.timeframeEstimate)
    candidates = build_yfinance_candidates(
        detected_ticker=symbol_detection["detectedTicker"],
        detected_market=symbol_detection["detectedMarket"],
    )
    fetched = fetch_ohlcv_from_candidates(
        candidates,
        period=str(timeframe["period"]),
        interval=str(timeframe["interval"]),
    )
    data_quality = validate_ohlcv_data(fetched["ohlcv"])
    if not data_quality["isEnoughData"]:
        return None

    return run_technical_analysis(fetched["ohlcv"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze-chart", response_model=AnalysisResponse)
async def analyze_chart(file: UploadFile = File(...)) -> AnalysisResponse:
    _validate_upload_metadata(file)

    contents = await file.read(MAX_FILE_SIZE_BYTES + 1)
    await file.close()

    if not contents:
        raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없습니다.")

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="파일 크기는 최대 5MB까지 가능합니다.")

    try:
        processed = process_image_for_ai(
            image_bytes=contents,
            filename=file.filename or "uploaded-image",
            content_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        ai_analysis = analyze_chart_image_with_ai(
            full_image_bytes=processed["fullImageBytes"],
            crop_image_bytes=processed["cropImageBytes"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    trade_signal = generate_visual_trade_signal(ai_analysis.model_dump())

    technical_analysis = None
    try:
        technical_analysis = _try_build_technical_analysis(ai_analysis)
    except Exception:
        technical_analysis = None

    return AnalysisResponse(
        aiAnalysis=ai_analysis,
        technicalAnalysis=technical_analysis,
        tradeSignal=trade_signal,
        imageInfo=processed["imageInfo"],
    )
