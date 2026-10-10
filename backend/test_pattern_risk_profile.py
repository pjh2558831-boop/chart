from __future__ import annotations

from ai_analysis import AI_ANALYSIS_RESPONSE_SCHEMA
from pattern_analysis import build_data_provenance, merge_pattern_candidates
from schemas import AIAnalysis, normalize_pattern_candidate
from trading_report import (
    _apply_pattern_score_caps,
    _build_pattern_risk_profile,
    _calculate_scores,
    _has_validated_pattern_certainty,
)


def _candidate(*, name: str = "head_and_shoulders", confidence: int = 64) -> dict:
    return {
        "name": name,
        "label": "헤드앤숄더" if name == "head_and_shoulders" else "이중천장",
        "category": "reversal",
        "confidence": "medium",
        "confidenceScore": confidence,
        "source": "image",
        "priceLevels": {
            "leftShoulder": 218,
            "head": 236,
            "rightShoulder": 220,
            "neckline": 200,
            "confirmationLevel": 200,
            "invalidationLevel": 215,
        },
        "evidence": ["세 개의 고점 구조와 넥라인 후보가 관찰됩니다."],
        "direction": "bearish",
        "stage": "neckline_test",
        "breakoutDirection": "downside_candidate",
        "confirmationCondition": "200 부근 넥라인 이탈 여부를 확인합니다.",
        "invalidationCondition": "215 부근 회복 시 패턴 위험이 약화됩니다.",
        "entryLogic": "넥라인 확인 전 신규 진입을 보류합니다.",
        "conflictsWithMomentum": True,
        "conflictExplanation": "단기 모멘텀 개선과 구조적 하락 반전 후보가 충돌합니다.",
        "riskLevel": "high",
    }


def _score_summary() -> dict:
    return {
        "totalScore": 82,
        "riskScore": 20,
        "entryScores": {
            "currentEntry": {"score": 88, "label": "현재가 진입 유리"},
            "pullbackEntry": {"score": 90, "label": "눌림목 진입 우세"},
            "breakoutEntry": {"score": 92, "label": "돌파 진입 우세"},
        },
    }


def test_suspected_head_and_shoulders() -> None:
    profile = _build_pattern_risk_profile(
        {"patternCandidates": [_candidate()]},
        current=202,
        supports=[200, 190],
        resistances=[215, 236],
        pivot=215,
    )
    assert profile is not None
    assert profile["stage"] == "neckline_test"
    assert profile["shouldAffectDecision"] is True
    score = _score_summary()
    _apply_pattern_score_caps(score, profile)
    assert score["entryScores"]["currentEntry"]["score"] <= 35
    assert score["entryScores"]["pullbackEntry"]["score"] <= 45
    assert score["entryScores"]["breakoutEntry"]["score"] <= 55
    assert score["totalScore"] <= 50
    assert score["riskScore"] >= 55


def test_confirmed_head_and_shoulders() -> None:
    profile = _build_pattern_risk_profile(
        {"patternCandidates": [_candidate(confidence=82)]},
        current=198,
        supports=[200, 190],
        resistances=[215, 236],
        pivot=215,
    )
    assert profile is not None
    assert profile["stage"] == "confirmed"
    score = _score_summary()
    _apply_pattern_score_caps(score, profile)
    assert score["entryScores"]["currentEntry"]["score"] <= 25
    assert score["entryScores"]["pullbackEntry"]["score"] <= 30
    assert score["entryScores"]["breakoutEntry"]["score"] <= 40
    assert score["totalScore"] <= 40
    assert score["riskScore"] >= 70


def test_double_top_and_non_bearish_candidate() -> None:
    double_top = _build_pattern_risk_profile(
        {"patternCandidates": [_candidate(name="double_top")]},
        current=202,
        supports=[200],
        resistances=[215],
        pivot=215,
    )
    assert double_top is not None and double_top["primaryPattern"] == "double_top"
    normal = _build_pattern_risk_profile(
        {"patternCandidates": [{**_candidate(), "name": "double_bottom", "breakoutDirection": "upside_candidate"}]},
        current=202,
        supports=[200],
        resistances=[215],
        pivot=215,
    )
    assert normal is None


def test_price_mismatch_blocks_live_merge() -> None:
    provenance = build_data_provenance(
        {"priceAxisObservations": {"currentPriceEstimate": {"value": 202}}},
        {"latestClose": 220},
    )
    assert provenance["hasPriceMismatch"] is True
    assert provenance["shouldMergeLiveLevels"] is False
    merged = merge_pattern_candidates([_candidate()], [])
    assert merged[0]["source"] == "image"
    assert merged[0]["confidenceScore"] == 64


def test_compatible_merge_preserves_image_structure() -> None:
    image_candidate = _candidate()
    live_candidate = {
        **_candidate(confidence=70),
        "direction": None,
        "stage": None,
        "priceLevels": {"neckline": 201, "confirmationLevel": 201, "invalidationLevel": 224},
    }
    merged = merge_pattern_candidates([image_candidate], [live_candidate])
    assert len(merged) == 1
    assert merged[0]["source"] == "mixed"
    assert merged[0]["stage"] == "neckline_test"
    assert merged[0]["direction"] == "bearish"
    assert merged[0]["priceLevels"]["leftShoulder"] == 218
    assert merged[0]["priceLevels"]["head"] == 236
    assert merged[0]["priceLevels"]["neckline"] == 201
    assert merged[0]["conflictsWithMomentum"] is True


def test_pattern_contract_preserves_structure_fields() -> None:
    normalized = normalize_pattern_candidate(
        {
            **_candidate(),
            "name": "헤드 앤 숄더",
            "label": "헤드앤숄더 의심",
            "priceLevels": {
                "leftShoulder": 218,
                "head": 236,
                "rightShoulder": 221,
                "neckline": 201,
                "confirmationLevel": 199,
                "invalidationLevel": 225,
                "breakout": 225,
                "breakdown": 199,
            },
        },
        image_based=True,
    )
    assert normalized["name"] == "head_and_shoulders"
    assert normalized["stage"] == "neckline_test"
    assert normalized["direction"] == "bearish"
    assert normalized["priceLevels"]["leftShoulder"] == 218
    assert normalized["priceLevels"]["head"] == 236
    assert normalized["priceLevels"]["rightShoulder"] == 221
    assert normalized["priceLevels"]["breakdownPrice"] == 199
    assert normalized["conflictsWithMomentum"] is True
    korean_suspected = normalize_pattern_candidate({**_candidate(), "name": "헤드앤숄더 의심"}, image_based=True)
    assert korean_suspected["name"] == "head_and_shoulders"


def test_structured_output_contract_is_default_safe() -> None:
    properties = AI_ANALYSIS_RESPONSE_SCHEMA["properties"]
    required = set(AI_ANALYSIS_RESPONSE_SCHEMA["required"])
    for field in ("visualStructure", "lineAnalysis", "interpretationLayers", "patternMomentumConflict"):
        assert field in properties
        assert field in required
    pattern_schema = properties["patternCandidates"]["items"]
    for field in ("direction", "stage", "priceLevels", "conflictsWithMomentum", "conflictExplanation"):
        assert field in pattern_schema["properties"]
        assert field in pattern_schema["required"]

    def assert_strict_required(schema: object, path: str = "root") -> None:
        if not isinstance(schema, dict):
            return
        schema_type = schema.get("type")
        if schema_type == "object" or isinstance(schema_type, list) and "object" in schema_type:
            schema_properties = schema.get("properties") or {}
            assert set(schema.get("required") or []) == set(schema_properties), f"strict required mismatch at {path}"
            for key, child in schema_properties.items():
                assert_strict_required(child, f"{path}.{key}")
        items = schema.get("items")
        if items is not None:
            assert_strict_required(items, f"{path}[]")

    assert_strict_required(AI_ANALYSIS_RESPONSE_SCHEMA)

    parsed = AIAnalysis.model_validate(
        {
            "symbolDetection": {
                "detectedName": None,
                "detectedTicker": None,
                "detectedMarket": "UNKNOWN",
                "detectedExchange": None,
                "currency": None,
                "confidence": "low",
                "reason": "확인 필요",
            },
            "chartType": "candlestick",
            "timeframeEstimate": "일봉 추정",
            "visualTrend": "unknown",
            "visualStructure": None,
            "lineAnalysis": [],
            "interpretationLayers": None,
            "patternMomentumConflict": None,
            "patternCandidates": [],
            "visibleIndicators": [],
            "visualSupportZones": [],
            "visualResistanceZones": [],
            "priceAxisObservations": {},
            "indicatorReadings": {},
            "volumeObservation": "확인 필요",
            "riskNotes": [],
            "summary": "구조 확인이 필요합니다.",
            "disclaimer": "투자 참고용입니다.",
        }
    )
    assert parsed.visualStructure is None
    assert parsed.lineAnalysis == []
    assert parsed.patternMomentumConflict is None


def test_interpretation_layers_can_create_strict_hs_fallback() -> None:
    profile = _build_pattern_risk_profile(
        {
            "patternCandidates": [],
            "visualStructure": {
                "swingHighs": [
                    {"order": 1, "price": 218, "role": "left_shoulder"},
                    {"order": 2, "price": 236, "role": "head"},
                    {"order": 3, "price": 221, "role": "right_shoulder"},
                ],
                "swingLows": [
                    {"order": 1, "price": 200, "role": "neckline_touch"},
                    {"order": 2, "price": 202, "role": "neckline_touch"},
                ],
            },
            "lineAnalysis": [{"type": "neckline", "priceLow": 199, "priceHigh": 202}],
            "interpretationLayers": {
                "shortTermState": "상승추세 눌림",
                "structuralPatternRisk": "헤드앤숄더 의심 / 넥라인 테스트",
                "coexistenceSummary": "단기 지지 반응과 구조적 패턴 위험이 함께 관찰됩니다.",
            },
            "patternMomentumConflict": {
                "exists": True,
                "explanation": "단기 모멘텀은 개선되지만 세 고점 구조가 남아 있습니다.",
            },
        },
        current=202,
        supports=[190],
        resistances=[225, 236],
        pivot=225,
    )
    assert profile is not None
    assert profile["primaryPattern"] == "head_and_shoulders"
    assert profile["stage"] == "neckline_test"
    assert profile["confidence"] == 60
    assert profile["shouldAffectDecision"] is True
    assert profile["conflictsWithMomentum"] is True
    assert profile["keyLevel"] == "200 부근"


def test_incomplete_structure_does_not_create_false_hs() -> None:
    profile = _build_pattern_risk_profile(
        {
            "patternCandidates": [],
            "visualStructure": {
                "swingHighs": [{"order": 1, "price": 236, "role": "head"}],
                "swingLows": [{"order": 1, "price": 202, "role": "support"}],
            },
            "lineAnalysis": [{"type": "support", "price": 202}],
            "interpretationLayers": {
                "shortTermState": "상승추세 눌림",
                "structuralPatternRisk": "헤드앤숄더 가능성 확인 필요",
            },
        },
        current=204,
        supports=[202],
        resistances=[220],
        pivot=220,
    )
    assert profile is None


def test_explicit_hs_candidate_missing_neckline_is_watch_only() -> None:
    candidate = _candidate()
    candidate["priceLevels"] = {
        "leftShoulder": 218,
        "head": 236,
        "rightShoulder": 220,
        "invalidationLevel": 220,
    }
    profile = _build_pattern_risk_profile(
        {"patternCandidates": [candidate]},
        current=205,
        supports=[200],
        resistances=[220],
        pivot=220,
    )
    assert profile is not None
    assert profile["validationLevel"] == "watch"
    assert profile["shouldAffectDecision"] is False
    assert profile["shouldAffectScore"] is False
    assert "NECKLINE_MISSING" in profile["missingRequirements"]
    score = _score_summary()
    _apply_pattern_score_caps(score, profile)
    assert score["totalScore"] == 82


def test_explicit_hs_candidate_complete_structure_is_decision_grade() -> None:
    profile = _build_pattern_risk_profile(
        {"patternCandidates": [_candidate()]},
        current=202,
        supports=[190],
        resistances=[220],
        pivot=220,
    )
    assert profile is not None
    assert profile["validationLevel"] == "decision"
    assert profile["shouldAffectScore"] is True
    assert "STRUCTURE_COMPLETE" in profile["validationReasons"]


def test_explicit_hs_candidate_three_highs_without_neckline_has_no_cap() -> None:
    candidate = _candidate(confidence=60)
    candidate["priceLevels"] = {
        "leftShoulder": 218,
        "head": 236,
        "rightShoulder": 221,
        "invalidationLevel": 221,
    }
    profile = _build_pattern_risk_profile(
        {
            "patternCandidates": [candidate],
            "visualStructure": {
                "swingHighs": [
                    {"order": 1, "price": 218, "role": "resistance"},
                    {"order": 2, "price": 236, "role": "higher_high"},
                    {"order": 3, "price": 221, "role": "lower_high"},
                ],
                "swingLows": [{"order": 1, "price": 205, "role": "higher_low"}],
            },
        },
        current=210,
        supports=[205],
        resistances=[221],
        pivot=221,
    )
    assert profile is not None
    assert profile["shouldAffectScore"] is False
    assert profile["scoreCaps"] is None
    assert "NECKLINE_MISSING" in profile["missingRequirements"]


def test_invalidated_hs_candidate_has_no_bearish_cap() -> None:
    candidate = {**_candidate(confidence=82), "stage": "invalidated"}
    profile = _build_pattern_risk_profile(
        {"patternCandidates": [candidate]},
        current=210,
        supports=[200],
        resistances=[220],
        pivot=220,
    )
    assert profile is not None
    assert profile["stage"] == "invalidated"
    assert profile["shouldAffectDecision"] is False
    assert profile["shouldAffectScore"] is False


def test_confirmed_breakout_with_weak_hs_stays_constructive() -> None:
    profile = _build_pattern_risk_profile(
        {"patternCandidates": [_candidate(confidence=60)]},
        current=210,
        supports=[200],
        resistances=[220],
        pivot=205,
        breakout_retest_confirmed=True,
    )
    assert profile is not None
    assert profile["validationLevel"] == "watch"
    assert profile["shouldAffectScore"] is False
    assert "CONFIRMED_BREAKOUT_PROTECTION" in profile["missingRequirements"]


def test_double_top_missing_neckline_is_watch_only() -> None:
    candidate = _candidate(name="double_top")
    candidate["priceLevels"] = {"patternHigh": 220, "invalidationLevel": 222}
    profile = _build_pattern_risk_profile(
        {"patternCandidates": [candidate]},
        current=205,
        supports=[200],
        resistances=[220],
        pivot=220,
    )
    assert profile is not None
    assert profile["primaryPattern"] == "double_top"
    assert profile["validationLevel"] == "watch"
    assert profile["shouldAffectScore"] is False
    assert "DECISION_KEY_LEVEL_MISSING" in profile["missingRequirements"]


def test_failed_breakout_decision_grade_bearish_risk() -> None:
    candidate = {
        **_candidate(name="failed_breakout", confidence=82),
        "label": "돌파 실패",
        "stage": "failed",
        "priceLevels": {
            "breakout": 210,
            "confirmationLevel": 210,
            "invalidationLevel": 212,
        },
        "evidence": ["저항 돌파 후 가격이 다시 돌파선 아래로 밀렸습니다."],
    }
    profile = _build_pattern_risk_profile(
        {"patternCandidates": [candidate]},
        current=205,
        supports=[200],
        resistances=[210],
        pivot=210,
    )
    assert profile is not None
    assert profile["primaryPattern"] == "failed_breakout"
    assert profile["validationLevel"] == "strong"
    assert profile["shouldAffectScore"] is True
    score = _score_summary()
    _apply_pattern_score_caps(score, profile)
    assert score["totalScore"] <= 40


def test_no_pattern_variants_do_not_create_risk_profile() -> None:
    base_candidate = _candidate()
    variants = [
        [],
        [{**base_candidate, "name": "no_clear_pattern", "direction": "neutral", "breakoutDirection": "neutral"}],
        [{**base_candidate, "name": "unknown", "direction": "uncertain", "breakoutDirection": "unknown"}],
        [{**base_candidate, "name": "box_range", "direction": "neutral", "breakoutDirection": "neutral"}],
    ]
    for candidates in variants:
        profile = _build_pattern_risk_profile(
            {"patternCandidates": candidates},
            current=205,
            supports=[200],
            resistances=[220],
            pivot=220,
        )
        assert profile is None


def test_strong_pattern_preserves_bullish_momentum_conflict() -> None:
    candidate = {**_candidate(confidence=82), "stage": "confirmed"}
    profile = _build_pattern_risk_profile(
        {
            "patternCandidates": [candidate],
            "patternMomentumConflict": {
                "exists": True,
                "momentumBias": "bullish",
                "patternBias": "bearish",
                "explanation": "단기 반등과 구조적 하락 위험이 충돌합니다.",
            },
        },
        current=198,
        supports=[190],
        resistances=[220],
        pivot=220,
    )
    assert profile is not None
    assert profile["validationLevel"] == "strong"
    assert profile["conflictsWithMomentum"] is True
    assert profile["conflictExplanation"]


def _raw_score(ai_analysis: dict, *, pattern_is_certain: bool) -> dict:
    return _calculate_scores(
        ai_analysis=ai_analysis,
        current=202,
        pivot=215,
        short_stop=190,
        risk_reward={"value": 1.2, "interpretation": "조건부 손익비"},
        support_broken=False,
        near_resistance=False,
        pattern_is_certain=pattern_is_certain,
    )


def test_watch_only_pattern_does_not_gain_raw_score_certainty() -> None:
    candidate = _candidate()
    candidate["priceLevels"] = {"leftShoulder": 218, "head": 236, "rightShoulder": 220}
    ai_analysis = {"visualTrend": "sideways", "patternCandidates": [candidate], "visibleIndicators": []}
    profile = _build_pattern_risk_profile(
        ai_analysis,
        current=202,
        supports=[200],
        resistances=[215],
        pivot=215,
    )
    assert profile is not None and profile["validationLevel"] == "watch"
    assert _has_validated_pattern_certainty(ai_analysis, profile) is False
    watch_score = _raw_score(ai_analysis, pattern_is_certain=_has_validated_pattern_certainty(ai_analysis, profile))
    no_pattern_score = _raw_score({**ai_analysis, "patternCandidates": []}, pattern_is_certain=False)
    assert watch_score["totalScore"] == no_pattern_score["totalScore"]
    assert watch_score["buyScore"] == no_pattern_score["buyScore"]
    assert watch_score["riskScore"] == no_pattern_score["riskScore"]


def test_decision_grade_pattern_is_raw_score_certain_before_caps() -> None:
    candidate = _candidate()
    ai_analysis = {"visualTrend": "sideways", "patternCandidates": [candidate], "visibleIndicators": []}
    profile = _build_pattern_risk_profile(
        ai_analysis,
        current=202,
        supports=[200],
        resistances=[215],
        pivot=215,
    )
    assert profile is not None and profile["validationLevel"] == "decision"
    assert _has_validated_pattern_certainty(ai_analysis, profile) is True
    certain_score = _raw_score(ai_analysis, pattern_is_certain=True)
    uncertain_score = _raw_score(ai_analysis, pattern_is_certain=False)
    assert certain_score["totalScore"] > uncertain_score["totalScore"]
    assert certain_score["riskScore"] < uncertain_score["riskScore"]


def test_complete_bullish_pattern_avoids_unnecessary_uncertainty_penalty() -> None:
    candidate = {
        **_candidate(name="falling_wedge", confidence=68),
        "direction": "bullish",
        "stage": "breakout_test",
        "breakoutDirection": "upside_candidate",
        "priceLevels": {"breakout": 210, "confirmationLevel": 210, "invalidationLevel": 198},
        "evidence": ["상단 돌파 시도와 거래량 회복이 함께 관찰됩니다."],
        "confirmationCondition": "210 상단 안착을 확인합니다.",
        "invalidationCondition": "198 이탈 시 후보를 무효화합니다.",
    }
    ai_analysis = {"patternCandidates": [candidate]}
    assert _has_validated_pattern_certainty(ai_analysis, None) is True


def test_duplicate_pattern_keeps_structurally_complete_candidate() -> None:
    strong = _candidate(confidence=64)
    weak = {
        **_candidate(confidence=78),
        "stage": "uncertain",
        "direction": "uncertain",
        "priceLevels": {"neckline": 201},
        "evidence": ["패턴 가능성만 관찰됩니다."],
    }
    merged = merge_pattern_candidates([strong, weak], [])
    assert len(merged) == 1
    assert merged[0]["stage"] == "neckline_test"
    assert merged[0]["direction"] == "bearish"
    assert merged[0]["priceLevels"]["head"] == 236
    assert len(merged[0]["evidence"]) == 2


def test_duplicate_pattern_uses_confidence_and_evidence_after_structure() -> None:
    base = _candidate(confidence=58)
    richer = {
        **_candidate(confidence=74),
        "evidence": ["구조 근거 1", "구조 근거 2", "구조 근거 3"],
    }
    merged = merge_pattern_candidates([base, richer], [])
    assert len(merged) == 1
    assert merged[0]["confidenceScore"] == 74
    assert len(merged[0]["evidence"]) == 4


def test_merged_pattern_candidates_are_limited_to_three() -> None:
    names = ["head_and_shoulders", "double_top", "descending_triangle", "rising_wedge", "failed_breakout"]
    candidates = [{**_candidate(name=name, confidence=60 + index), "name": name} for index, name in enumerate(names)]
    merged = merge_pattern_candidates(candidates, [])
    assert len(merged) == 3


def run() -> None:
    tests = [
        test_suspected_head_and_shoulders,
        test_confirmed_head_and_shoulders,
        test_double_top_and_non_bearish_candidate,
        test_price_mismatch_blocks_live_merge,
        test_compatible_merge_preserves_image_structure,
        test_pattern_contract_preserves_structure_fields,
        test_structured_output_contract_is_default_safe,
        test_interpretation_layers_can_create_strict_hs_fallback,
        test_incomplete_structure_does_not_create_false_hs,
        test_explicit_hs_candidate_missing_neckline_is_watch_only,
        test_explicit_hs_candidate_complete_structure_is_decision_grade,
        test_explicit_hs_candidate_three_highs_without_neckline_has_no_cap,
        test_invalidated_hs_candidate_has_no_bearish_cap,
        test_confirmed_breakout_with_weak_hs_stays_constructive,
        test_double_top_missing_neckline_is_watch_only,
        test_failed_breakout_decision_grade_bearish_risk,
        test_no_pattern_variants_do_not_create_risk_profile,
        test_strong_pattern_preserves_bullish_momentum_conflict,
        test_watch_only_pattern_does_not_gain_raw_score_certainty,
        test_decision_grade_pattern_is_raw_score_certain_before_caps,
        test_complete_bullish_pattern_avoids_unnecessary_uncertainty_penalty,
        test_duplicate_pattern_keeps_structurally_complete_candidate,
        test_duplicate_pattern_uses_confidence_and_evidence_after_structure,
        test_merged_pattern_candidates_are_limited_to_three,
    ]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print("All pattern risk profile tests passed.")


if __name__ == "__main__":
    run()
