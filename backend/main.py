from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai_analysis import PROMPT_VERSION, analyze_chart_image_with_ai
from analysis_repository import (
    build_cache_key,
    create_analysis_log,
    find_cached_analysis,
    get_analysis_log,
    list_analysis_logs,
)
from auth import get_or_create_user, get_user_id_from_header, update_user_plan
from billing import (
    assert_can_analyze,
    coerce_analysis_mode_for_plan,
    get_usage_status,
    record_usage,
    resolve_request_identity,
)
from database import init_db
from feedback_repository import create_feedback
from image_processing import normalize_analysis_mode, process_image_for_ai
from market_data import (
    build_yfinance_candidates,
    fetch_ohlcv_from_candidates,
    map_timeframe_to_yfinance,
    should_run_market_validation,
    validate_ohlcv_data,
)
from pattern_analysis import detectPatternCandidates, merge_pattern_candidates
from performance import build_performance_report, measure_step, now_ms
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
    cache_hit: bool = False,
    analysis_mode: str | None = None,
    prompt_version: str | None = None,
    performance: dict[str, Any] | None = None,
    analysis_id: int | None = None,
    usage_status: dict[str, Any] | None = None,
    applied_analysis_mode: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "cacheHit": cache_hit,
        "analysisMode": analysis_mode,
        "appliedAnalysisMode": applied_analysis_mode or analysis_mode,
        "promptVersion": prompt_version,
        "aiAnalysis": ai_analysis.model_dump(mode="json"),
        "technicalAnalysis": technical_analysis,
        "tradeSignal": trade_signal,
        "imageInfo": image_info,
    }
    if analysis_id is not None:
        payload["analysisId"] = analysis_id
    if usage_status is not None:
        payload["usageStatus"] = usage_status
    if performance is not None:
        payload["performance"] = performance
    return payload


def _performance_enabled() -> bool:
    return os.getenv("ENABLE_PERFORMANCE_DEBUG", "false").lower() == "true"


def _attach_runtime_fields(
    result: dict[str, Any],
    *,
    cache_hit: bool,
    analysis_mode: str,
    prompt_version: str,
    analysis_id: int | None,
    usage_status: dict[str, Any] | None,
    performance: dict[str, Any] | None,
    applied_analysis_mode: str | None = None,
) -> dict[str, Any]:
    payload = {
        **result,
        "cacheHit": cache_hit,
        "analysisMode": analysis_mode,
        "appliedAnalysisMode": applied_analysis_mode or analysis_mode,
        "promptVersion": prompt_version,
    }
    if analysis_id is not None:
        payload["analysisId"] = analysis_id
    if usage_status is not None:
        payload["usageStatus"] = usage_status
    if performance is not None:
        payload["performance"] = performance
    return payload


def _get_input_image_hash(processed: dict[str, Any]) -> str | None:
    optimization = (processed.get("imageInfo") or {}).get("optimization") or {}
    return optimization.get("originalSha256") or optimization.get("processedSha256")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/usage-status")
async def usage_status(request: Request) -> dict[str, Any]:
    identity = resolve_request_identity(request)
    return get_usage_status(identity)


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
async def analyze_chart(
    request: Request,
    file: UploadFile = File(...),
    analysis_mode: str = Form("standard"),
) -> dict[str, Any]:
    total_started_at = now_ms()
    timings: dict[str, float] = {}
    requested_analysis_mode = normalize_analysis_mode(analysis_mode)
    model_name = os.getenv("OPENAI_MODEL") or "gpt-4.1-mini"

    identity = resolve_request_identity(request)
    user_id = identity["id"] if identity["type"] == "user" else None
    guest_id = identity["id"] if identity["type"] == "guest" else None
    normalized_analysis_mode = coerce_analysis_mode_for_plan(identity["plan"], requested_analysis_mode)
    _validate_upload_metadata(file)

    usage_status_before = assert_can_analyze(identity, ANALYSIS_TYPE)
    filename = file.filename or "uploaded-image"
    content_type = file.content_type

    with measure_step("imageReadMs", timings):
        contents = await file.read(MAX_FILE_SIZE_BYTES + 1)
        await file.close()

    if not contents:
        raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없습니다.")
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="파일 크기는 최대 5MB까지 가능합니다.")

    try:
        with measure_step("imageProcessingMs", timings):
            processed = process_image_for_ai(
                image_bytes=contents,
                filename=filename,
                content_type=content_type,
                mode=normalized_analysis_mode,
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    input_image_hash = _get_input_image_hash(processed)
    cache_key = (
        build_cache_key(
            input_image_hash=input_image_hash,
            model_name=model_name,
            prompt_version=PROMPT_VERSION,
            analysis_mode=normalized_analysis_mode,
        )
        if input_image_hash
        else None
    )

    cached_analysis = None
    if input_image_hash:
        try:
            with measure_step("cacheLookupMs", timings):
                cached_analysis = find_cached_analysis(
                    user_id=user_id,
                    guest_id=guest_id,
                    input_image_hash=input_image_hash,
                    model_name=model_name,
                    prompt_version=PROMPT_VERSION,
                    analysis_mode=normalized_analysis_mode,
                )
        except Exception as exc:  # pragma: no cover - cache should never break analysis
            logger.warning("Cache lookup failed: %s", exc)
            timings.setdefault("cacheLookupMs", 0.0)

    if cached_analysis is not None:
        with measure_step("dbSaveMs", timings):
            record_usage(identity, ANALYSIS_TYPE)
            updated_usage_status = get_usage_status(identity)
        timings["totalMs"] = round(now_ms() - total_started_at, 2)
        performance = build_performance_report(timings) if _performance_enabled() else None
        return _attach_runtime_fields(
            cached_analysis["result"],
            cache_hit=True,
            analysis_mode=normalized_analysis_mode,
            applied_analysis_mode=normalized_analysis_mode,
            prompt_version=PROMPT_VERSION,
            analysis_id=cached_analysis["id"],
            usage_status=updated_usage_status or usage_status_before,
            performance=performance,
        )

    try:
        with measure_step("aiRequestMs", timings):
            ai_analysis = analyze_chart_image_with_ai(images=processed["images"])
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    with measure_step("postProcessMs", timings):
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

    base_result = _build_result_payload(
        ai_analysis=ai_analysis,
        technical_analysis=technical_analysis,
        trade_signal=trade_signal,
        image_info=processed["imageInfo"],
        cache_hit=False,
        analysis_mode=normalized_analysis_mode,
        applied_analysis_mode=normalized_analysis_mode,
        prompt_version=PROMPT_VERSION,
    )
    with measure_step("dbSaveMs", timings):
        record_usage(identity, ANALYSIS_TYPE)
        updated_usage_status = get_usage_status(identity)
        analysis_log = create_analysis_log(
            user_id=user_id,
            guest_id=guest_id,
            analysis_type=ANALYSIS_TYPE,
            input_image_hash=input_image_hash,
            result=base_result,
            model_name=model_name,
            prompt_version=PROMPT_VERSION,
            analysis_mode=normalized_analysis_mode,
            cache_key=cache_key,
        )

    timings["totalMs"] = round(now_ms() - total_started_at, 2)
    performance = build_performance_report(timings) if _performance_enabled() else None

    return _build_result_payload(
        ai_analysis=ai_analysis,
        technical_analysis=technical_analysis,
        trade_signal=trade_signal,
        image_info=processed["imageInfo"],
        cache_hit=False,
        analysis_mode=normalized_analysis_mode,
        applied_analysis_mode=normalized_analysis_mode,
        prompt_version=PROMPT_VERSION,
        performance=performance,
        analysis_id=analysis_log["id"],
        usage_status=updated_usage_status or usage_status_before,
    )
