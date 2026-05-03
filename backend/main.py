from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai_analysis import analyze_chart_image_with_ai
from analysis_repository import create_analysis_log, get_analysis_log, list_analysis_logs
from auth import get_or_create_user, get_user_id_from_header, update_user_plan
from billing import assert_can_analyze, get_usage_status, record_usage
from database import init_db
from feedback_repository import create_feedback
from image_processing import process_image_for_ai
from market_data import (
    build_yfinance_candidates,
    fetch_ohlcv_from_candidates,
    map_timeframe_to_yfinance,
    should_run_market_validation,
    validate_ohlcv_data,
)
from pattern_analysis import detectPatternCandidates, merge_pattern_candidates
from schemas import AIAnalysis, PatternCandidate
from technical_analysis import run_technical_analysis
from visual_trade_signal import generate_visual_trade_signal


logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
ANALYSIS_TYPE = "image_analysis"


app = FastAPI(title="AI Stock Chart Image Analysis MVP")

def _cors_allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOWED_ORIGINS", "")
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    init_db()


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


def _try_build_technical_and_patterns(ai_analysis: AIAnalysis) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    symbol_detection = ai_analysis.symbolDetection.model_dump()
    should_run, _ = should_run_market_validation(symbol_detection)
    if not should_run:
        return None, []

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
        return None, []

    technical_analysis = run_technical_analysis(fetched["ohlcv"])
    data_pattern_candidates = detectPatternCandidates(fetched["ohlcv"], technical_analysis)
    return technical_analysis, data_pattern_candidates


def _build_result_payload(
    *,
    ai_analysis: AIAnalysis,
    technical_analysis: dict[str, Any] | None,
    trade_signal: dict[str, Any] | None,
    image_info: dict[str, Any] | None,
    analysis_id: int | None = None,
    usage_status: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "aiAnalysis": ai_analysis.model_dump(mode="json"),
        "technicalAnalysis": technical_analysis,
        "tradeSignal": trade_signal,
        "imageInfo": image_info,
    }
    if analysis_id is not None:
        payload["analysisId"] = analysis_id
    if usage_status is not None:
        payload["usageStatus"] = usage_status
    return payload


def _get_input_image_hash(processed: dict[str, Any]) -> str | None:
    optimization = (processed.get("imageInfo") or {}).get("optimization") or {}
    return optimization.get("originalSha256") or optimization.get("processedSha256")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/usage-status")
async def usage_status(request: Request) -> dict[str, Any]:
    user_id = get_user_id_from_header(request)
    user = get_or_create_user(user_id)
    return get_usage_status(user)


@app.post("/admin/set-plan")
async def admin_set_plan(
    payload: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    user_id = str(payload.get("userId") or "").strip()
    plan = str(payload.get("plan") or "").strip()
    if not user_id or not plan:
        raise HTTPException(status_code=400, detail="userId와 plan이 필요합니다.")

    # MVP 테스트용 엔드포인트입니다. 운영 배포 전 관리자 인증 또는 제거가 필요합니다.
    return update_user_plan(user_id, plan)


@app.get("/analysis-logs")
async def analysis_logs(request: Request) -> list[dict[str, Any]]:
    user_id = get_user_id_from_header(request)
    get_or_create_user(user_id)
    return list_analysis_logs(user_id, limit=20)


@app.get("/analysis-logs/{analysis_id}")
async def analysis_log_detail(analysis_id: int, request: Request) -> dict[str, Any]:
    user_id = get_user_id_from_header(request)
    get_or_create_user(user_id)
    analysis_log = get_analysis_log(analysis_id, user_id)
    if analysis_log is None:
        raise HTTPException(status_code=404, detail="해당 분석 기록을 찾을 수 없습니다.")
    return analysis_log


@app.post("/feedback")
async def feedback(
    request: Request,
    payload: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    user_id = get_user_id_from_header(request)
    get_or_create_user(user_id)

    analysis_id = payload.get("analysisId")
    if analysis_id is None:
        raise HTTPException(status_code=400, detail="analysisId가 필요합니다.")

    return create_feedback(
        user_id=user_id,
        analysis_id=int(analysis_id),
        rating=payload.get("rating"),
        correct_signal=payload.get("correctSignal"),
        correct_pattern=payload.get("correctPattern"),
        comment=payload.get("comment"),
    )


@app.post("/analyze-chart")
async def analyze_chart(request: Request, file: UploadFile = File(...)) -> dict[str, Any]:
    user_id = get_user_id_from_header(request)
    user = get_or_create_user(user_id)
    _validate_upload_metadata(file)

    usage_status_before = assert_can_analyze(user, ANALYSIS_TYPE)
    filename = file.filename or "uploaded-image"
    content_type = file.content_type

    contents = await file.read(MAX_FILE_SIZE_BYTES + 1)
    await file.close()

    if not contents:
        raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없습니다.")
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="파일 크기는 최대 5MB까지 가능합니다.")

    try:
        processed = process_image_for_ai(
            image_bytes=contents,
            filename=filename,
            content_type=content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        ai_analysis = analyze_chart_image_with_ai(
            full_image_bytes=processed["fullImageBytes"],
            crop_image_bytes=processed["cropImageBytes"],
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    technical_analysis = None
    data_pattern_candidates: list[dict[str, Any]] = []
    try:
        technical_analysis, data_pattern_candidates = _try_build_technical_and_patterns(ai_analysis)
    except Exception as exc:  # pragma: no cover - enrichment should not break primary response
        logger.warning("Technical or pattern enrichment failed: %s", exc)

    merged_pattern_candidates = merge_pattern_candidates(
        ai_analysis.model_dump().get("patternCandidates", []),
        data_pattern_candidates,
    )
    ai_analysis = ai_analysis.model_copy(
        update={
            "patternCandidates": [
                PatternCandidate.model_validate(candidate) for candidate in merged_pattern_candidates
            ]
        }
    )
    trade_signal = generate_visual_trade_signal(ai_analysis.model_dump())

    record_usage(user_id, ANALYSIS_TYPE)
    updated_user = get_or_create_user(user_id)
    updated_usage_status = get_usage_status(updated_user)
    base_result = _build_result_payload(
        ai_analysis=ai_analysis,
        technical_analysis=technical_analysis,
        trade_signal=trade_signal,
        image_info=processed["imageInfo"],
        usage_status=updated_usage_status,
    )
    analysis_log = create_analysis_log(
        user_id=user_id,
        analysis_type=ANALYSIS_TYPE,
        input_image_hash=_get_input_image_hash(processed),
        result=base_result,
        model_name=os.getenv("OPENAI_MODEL"),
    )

    return _build_result_payload(
        ai_analysis=ai_analysis,
        technical_analysis=technical_analysis,
        trade_signal=trade_signal,
        image_info=processed["imageInfo"],
        analysis_id=analysis_log["id"],
        usage_status=updated_usage_status or usage_status_before,
    )
