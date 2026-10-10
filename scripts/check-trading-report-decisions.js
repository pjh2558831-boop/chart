#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const sourcePath = path.join(frontendDir, "lib", "tradingReportViewModel.ts");
const institutionalSourcePath = path.join(frontendDir, "lib", "institutionalReportViewModel.ts");
const ts = require(path.join(frontendDir, "node_modules", "typescript"));

function transpileTsModule(filePath, requireOverride = require) {
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  });
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    console,
    process: { env: { NODE_ENV: "production" } },
    require: requireOverride,
  };
  vm.runInNewContext(compiled.outputText, sandbox, { filename: filePath });
  return module.exports;
}

function loadTradingReportModule() {
  return transpileTsModule(sourcePath, (request) => {
      if (request.includes("../types/analysis")) return {};
      return require(request);
  });
}

function loadInstitutionalReportModule(tradingReportModule) {
  return transpileTsModule(institutionalSourcePath, (request) => {
    if (request.includes("../types/analysis")) return {};
    if (request === "./tradingReportViewModel" || request.endsWith("/tradingReportViewModel")) return tradingReportModule;
    return require(request);
  });
}

function mergeDeep(base, override) {
  if (!override || typeof override !== "object") return base;
  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === "object" && !Array.isArray(value) && base && typeof base[key] === "object" && !Array.isArray(base[key])) {
      output[key] = mergeDeep(base[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function riskReward(value, label = "손익비 확인") {
  return {
    value,
    label,
    interpretation: value === null ? "진입가, 손절가, 목표가 확인이 필요합니다." : "조건부 대응 기준 손익비입니다.",
  };
}

function baseReport(overrides = {}) {
  const report = {
    analysisMeta: {
      symbol: "TEST",
      chartTimeframe: "이미지 기준 추정",
      currentPriceZone: "100 부근",
      keyPivotPrice: "110 부근",
      mainSupports: ["95 부근", "90 부근"],
      mainResistances: ["110 부근", "120 부근"],
      analyzedAt: "2026-05-18 00:00 KST",
      dataBasis: "image_only",
      priceUnit: "이미지 축 기준 추정",
      priceUnitConfidence: "low",
    },
    marketContext: {
      priceLocation: "middle_range",
      rangePosition: 0.5,
      isExtendedMove: false,
      nearSupport: false,
      nearResistance: false,
      breakoutRetestConfirmed: false,
      chartRegime: "sideways",
      chartRegimeConfidence: "medium",
      chartRegimeReasons: ["지지와 저항 사이에서 방향 확인이 필요합니다."],
    },
    finalSummary: {
      finalAction: "WAIT",
      title: "방향 확인 대기",
      oneLineConclusion: "지지와 저항 확인이 필요합니다.",
      confidence: "medium",
      reason: "이미지 기반 기술적 분석입니다.",
    },
    scoreSummary: {
      totalScore: 50,
      totalLabel: "확인 필요",
      buyScore: 45,
      buyLabel: "매수 주의",
      holdScore: 55,
      holdLabel: "관망 가능",
      riskScore: 50,
      riskLabel: "주의",
      explanation: "조건 확인이 필요합니다.",
      entryScores: {
        currentEntry: { score: 45, label: "현재가 진입 확인 필요", explanation: "현재가 진입은 확인이 필요합니다." },
        pullbackEntry: { score: 55, label: "눌림목 진입 확인 필요", explanation: "눌림목 진입은 확인이 필요합니다." },
        breakoutEntry: { score: 55, label: "돌파 진입 확인 필요", explanation: "돌파 진입은 확인이 필요합니다." },
      },
      scoreFactors: { positive: [], negative: [], risk: [] },
    },
    priceRoles: {
      current: { priceZone: "100 부근", meaning: "현재가" },
      pivot: { priceZone: "110 부근", meaning: "핵심 전환 가격" },
      pullbackEntry: { priceZone: "95 부근", condition: "지지 확인" },
      breakoutEntry: { priceZone: "110 부근", condition: "돌파 후 재지지" },
      stopLoss: { shortTerm: "93 부근", conservative: "90 부근", invalidation: "85 부근" },
      targets: {
        pullbackTargets: ["110 부근", "120 부근"],
        breakoutTargets: ["120 부근", "130 부근"],
        holderTargets: ["110 부근", "120 부근"],
      },
    },
    userActionGuide: {
      nonHolder: "확인 전 신규 진입은 보류합니다.",
      holder: "주요 지지선 이탈 전까지 관망합니다.",
      shortTermTrader: "짧은 손절 기준이 필요합니다.",
      addBuyer: "추가 매수는 확인 이후가 유리합니다.",
      stopLoss: "단기 지지 이탈 시 손절 기준입니다.",
    },
    tradePlan: {
      entry: {
        pullbackEntry: { priceZone: "95 부근", condition: "지지 확인", action: "눌림목 대기" },
        breakoutEntry: { priceZone: "110 부근", condition: "돌파 후 재지지", action: "돌파 확인" },
        noChaseZone: { priceZone: "110 부근", reason: "추격매수 주의" },
      },
      stopLoss: {
        priceZone: "93 부근",
        condition: "93 이탈",
        meaning: "단기 손절 기준",
        shortTerm: { priceZone: "93 부근", condition: "93 이탈", meaning: "단기 손절" },
        conservative: { priceZone: "90 부근", condition: "90 이탈", meaning: "보수적 손절" },
      },
      stopLossByEntry: {
        currentEntry: { priceZone: "93 부근", condition: "93 이탈", explanation: "현재가 진입 손절 기준" },
        pullbackEntry: { priceZone: "90 부근", condition: "90 이탈", explanation: "눌림목 실패 기준" },
        breakoutEntry: { priceZone: "110 부근", condition: "110 재이탈", explanation: "핵심 전환 가격 재이탈 시 돌파 실패" },
        mediumTermInvalidation: { priceZone: "85 부근", condition: "85 이탈", explanation: "중기 무효화" },
      },
      targets: {
        firstTarget: { priceZone: "120 부근", action: "1차 목표" },
        secondTarget: { priceZone: "130 부근", action: "2차 목표" },
        pullbackTargets: {
          firstTarget: { priceZone: "110 부근", action: "눌림목 1차 목표" },
          secondTarget: { priceZone: "120 부근", action: "눌림목 2차 목표" },
        },
        breakoutTargets: {
          firstTarget: { priceZone: "120 부근", action: "돌파 1차 목표" },
          secondTarget: { priceZone: "130 부근", action: "돌파 2차 목표" },
        },
      },
      invalidation: {
        condition: "85 이탈",
        meaning: "중기 관점 약화",
        midTerm: { priceZone: "85 부근", condition: "85 이탈", meaning: "중기 무효화" },
      },
      riskReward: riskReward(1.4),
      riskRewardByEntry: {
        current: riskReward(1.2),
        pullback: riskReward(1.6),
        breakout: riskReward(1.4),
      },
      transitionLevel: { priceZone: "110 부근", explanation: "핵심 전환 가격" },
    },
    keyLevels: {
      supports: [
        { label: "1차 지지", priceZone: "95 부근", meaning: "주요 지지", reliability: "medium" },
        { label: "2차 지지", priceZone: "90 부근", meaning: "하단 지지", reliability: "low" },
      ],
      resistances: [
        { label: "1차 저항", priceZone: "110 부근", meaning: "핵심 저항", reliability: "medium" },
        { label: "2차 저항", priceZone: "120 부근", meaning: "상단 저항", reliability: "low" },
      ],
    },
    scenarios: {
      bullish: { condition: "저항 돌파", expectedMove: "상단 시도", action: "확인 후 대응" },
      neutral: { condition: "박스권", expectedMove: "횡보", action: "확인 대기" },
      bearish: { condition: "지지 이탈", expectedMove: "하락", action: "손절 확인" },
    },
    patternAnalysis: {
      primaryPattern: {
        name: "명확한 패턴 없음",
        confidence: "low",
        reason: "패턴보다 가격 반응 확인이 중요합니다.",
        confirmationCondition: "지지/저항 반응 확인",
        invalidationCondition: "주요 가격대 이탈",
        tradingMeaning: "방향 확인이 필요합니다.",
      },
      secondaryPattern: null,
      excludedPatterns: [],
    },
    indicatorAnalysis: {
      confirmed: [
        { name: "이동평균선", signal: "neutral", explanation: "방향성 확인이 필요합니다." },
      ],
      unavailable: [
        { name: "RSI", reason: "이미지에서 명확히 확인되지 않습니다." },
      ],
    },
    evidence: {
      positive: [],
      negative: [],
      riskFactors: ["이미지 기반 분석 한계"],
    },
    disclaimer: "본 분석은 차트 이미지 기반의 기술적 분석 참고 정보입니다.",
  };
  return {
    analysisId: 1,
    tradingReport: mergeDeep(report, overrides),
  };
}

const scenarios = [
  {
    name: "Downtrend",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "88 부근", keyPivotPrice: "105 부근", mainSupports: ["90 부근", "85 부근"], mainResistances: ["105 부근", "115 부근"] },
      marketContext: { chartRegime: "downtrend", priceLocation: "lower_range", nearSupport: false, breakoutRetestConfirmed: false, chartRegimeReasons: ["주요 지지선 이탈 가능성이 있어 하락 추세 우려가 있습니다."] },
      finalSummary: { finalAction: "PULLBACK_BUY_CANDIDATE", title: "눌림목 매수 후보" },
      scoreSummary: {
        totalScore: 78,
        buyScore: 80,
        holdScore: 50,
        riskScore: 72,
        entryScores: {
          currentEntry: { score: 90, label: "현재가 진입 유리", explanation: "raw high score" },
          pullbackEntry: { score: 100, label: "눌림목 진입 유리", explanation: "raw high score" },
          breakoutEntry: { score: 80, label: "돌파 진입 후보", explanation: "raw high score" },
        },
      },
      priceRoles: { current: { priceZone: "88 부근" }, pivot: { priceZone: "105 부근" }, pullbackEntry: { priceZone: "90 부근" }, stopLoss: { shortTerm: "90 부근", conservative: "85 부근", invalidation: "80 부근" } },
      tradePlan: {
        stopLoss: { priceZone: "90 부근", shortTerm: { priceZone: "90 부근" } },
        riskRewardByEntry: { current: riskReward(0.5), pullback: riskReward(0.8), breakout: riskReward(1.1) },
      },
      evidence: { negative: ["lower high lower low 하락 약세"], riskFactors: ["주요 지지선 이탈 위험"] },
    }),
    check: (report) => {
      const entry = entries(report);
      return [
        expect(["downtrend", "support_breakdown"].includes(report.chartRegime?.type), "regime should be downtrend or support_breakdown"),
        expect(entry.current <= 45, "currentEntry should be capped at 45 or lower"),
        expect(entry.pullback <= 55, "pullbackEntry should be capped at 55 or lower"),
        expect(entry.breakout <= 60, "breakoutEntry should not be high without reclaim"),
        expect(!/강한 매수|돌파 매수 후보|현재가.*유리/.test(actionText(report)), "should not communicate strong buy"),
      ];
    },
  },
  {
    name: "Overextended surge",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "118 부근", keyPivotPrice: "120 부근", mainSupports: ["100 부근", "95 부근"], mainResistances: ["120 부근", "130 부근"] },
      marketContext: { chartRegime: "overextended_surge", priceLocation: "overextended", isExtendedMove: true, nearResistance: true, breakoutRetestConfirmed: false, chartRegimeReasons: ["현재가가 주요 저항에 가까워 추격매수 손익비가 낮습니다."] },
      scoreSummary: {
        riskScore: 65,
        holdScore: 82,
        entryScores: {
          currentEntry: { score: 85, label: "현재가 진입 유리", explanation: "raw high score" },
          pullbackEntry: { score: 75, label: "눌림목 진입 후보", explanation: "future setup" },
          breakoutEntry: { score: 70, label: "돌파 진입 후보", explanation: "raw high score" },
        },
      },
      priceRoles: { current: { priceZone: "118 부근" }, pivot: { priceZone: "120 부근" }, pullbackEntry: { priceZone: "100 부근" }, stopLoss: { shortTerm: "100 부근", conservative: "95 부근", invalidation: "90 부근" } },
      tradePlan: { riskRewardByEntry: { current: riskReward(0.4), pullback: riskReward(1.8), breakout: riskReward(0.9) } },
      evidence: { positive: ["급등 이후 거래량 증가"], negative: ["윗꼬리 과열 가능성"], riskFactors: ["지지선 이격 큼"] },
    }),
    check: (report) => {
      const entry = entries(report);
      return [
        expect(report.chartRegime?.type === "overextended_surge", "regime should be overextended_surge"),
        expect(entry.current <= 40, "currentEntry should be capped at 40 or lower"),
        expect(/추격|눌림|익절|급등/.test(actionText(report)), "action should communicate chase caution or waiting"),
        expect(!/현재가.*유리|즉시 매수|매수 우위/.test(actionText(report)), "should not imply immediate current-price buy"),
      ];
    },
  },
  {
    name: "Breakout retest confirmed",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "105 부근", keyPivotPrice: "100 부근", mainSupports: ["100 부근", "95 부근"], mainResistances: ["115 부근", "125 부근"] },
      marketContext: { chartRegime: "breakout_retest_confirmed", priceLocation: "breakout_area", nearResistance: false, breakoutRetestConfirmed: true, chartRegimeReasons: ["핵심 전환 가격 위에서 버티며 재지지 가능성이 보입니다."] },
      scoreSummary: { riskScore: 45, entryScores: { breakoutEntry: { score: 5, label: "돌파 진입 부적합", explanation: "raw low score" } } },
      priceRoles: { current: { priceZone: "105 부근" }, pivot: { priceZone: "100 부근" }, pullbackEntry: { priceZone: "100 부근" }, stopLoss: { shortTerm: "100 부근", conservative: "95 부근", invalidation: "90 부근" }, targets: { breakoutTargets: ["115 부근", "125 부근"] } },
      tradePlan: {
        stopLossByEntry: { breakoutEntry: { priceZone: "100 부근", condition: "100 재이탈", explanation: "핵심 전환 가격 재이탈 시 돌파 실패" } },
        riskRewardByEntry: { current: riskReward(1.2), pullback: riskReward(1.4), breakout: riskReward(2.0) },
      },
      indicatorAnalysis: { confirmed: [{ name: "거래량", signal: "bullish", explanation: "상승 구간 거래량 증가" }], unavailable: [] },
    }),
    check: (report) => {
      const entry = entries(report);
      const stopText = [
        report.tradePlan.stopLossByEntry?.breakoutEntry?.condition,
        report.tradePlan.stopLossByEntry?.breakoutEntry?.explanation,
      ].join(" ");
      return [
        expect(report.chartRegime?.type === "breakout_retest_confirmed", "regime should be breakout_retest_confirmed"),
        expect(entry.breakout >= 65, "breakoutEntry should be 65 or higher"),
        expect(/돌파|재지지|BREAKOUT/.test(actionText(report)), "action should mention breakout/retest context"),
        expect(/재이탈|돌파 실패|전환 가격/.test(stopText), "breakout stop should use pivot re-breakdown/failure"),
      ];
    },
  },
  {
    name: "Breakout wait",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "99 부근", keyPivotPrice: "100 부근", mainSupports: ["92 부근"], mainResistances: ["100 부근", "110 부근"] },
      marketContext: { chartRegime: "breakout_wait", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false, chartRegimeReasons: ["돌파 후 재지지가 아직 확인되지 않았습니다."] },
      scoreSummary: { entryScores: { breakoutEntry: { score: 85, label: "돌파 진입 유리", explanation: "raw high score" }, pullbackEntry: { score: 68, label: "눌림목 후보", explanation: "support interest" } } },
      priceRoles: { current: { priceZone: "99 부근" }, pivot: { priceZone: "100 부근" }, pullbackEntry: { priceZone: "92 부근" }, targets: { breakoutTargets: ["110 부근"] } },
      tradePlan: { riskRewardByEntry: { current: riskReward(0.7), pullback: riskReward(1.5), breakout: riskReward(1.2) } },
    }),
    check: (report) => {
      const entry = entries(report);
      return [
        expect(["breakout_wait", "resistance_test"].includes(report.chartRegime?.type), "regime should be breakout_wait or resistance_test"),
        expect(entry.breakout < 65, "breakoutEntry should remain below 65"),
        expect(/돌파|확인|대기/.test(actionText(report)), "action should communicate breakout confirmation wait"),
        expect(!/돌파 매수 후보/.test(actionText(report)), "should not be breakout buy candidate before retest"),
      ];
    },
  },
  {
    name: "Range lower support",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "102 부근", keyPivotPrice: "115 부근", mainSupports: ["100 부근", "96 부근"], mainResistances: ["115 부근", "125 부근"] },
      marketContext: { chartRegime: "range_lower_support", priceLocation: "lower_range", nearSupport: true, nearResistance: false, breakoutRetestConfirmed: false, chartRegimeReasons: ["박스권 하단에 가까워 일부 익절보다 지지 확인이 우선입니다."] },
      scoreSummary: { entryScores: { currentEntry: { score: 55, label: "소액 조건부", explanation: "near support" }, pullbackEntry: { score: 80, label: "눌림목 진입 유리", explanation: "clear support" } } },
      priceRoles: { current: { priceZone: "102 부근" }, pivot: { priceZone: "115 부근" }, pullbackEntry: { priceZone: "100 부근" } },
      tradePlan: { riskRewardByEntry: { current: riskReward(1.4), pullback: riskReward(2.0), breakout: riskReward(1.1) } },
    }),
    check: (report) => [
      expect(report.chartRegime?.type === "range_lower_support", "regime should be range_lower_support"),
      expect(/지지|눌림|반등/.test(actionText(report)), "action should include support/pullback/rebound context"),
      expect(!/일부 익절|저항 근접/.test(actionText(report)), "partial profit should not be main action near lower support"),
    ],
  },
  {
    name: "Range upper resistance",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "118 부근", keyPivotPrice: "120 부근", mainSupports: ["100 부근"], mainResistances: ["120 부근", "130 부근"] },
      marketContext: { chartRegime: "range_upper_resistance", priceLocation: "upper_range", nearResistance: true, breakoutRetestConfirmed: false, chartRegimeReasons: ["현재가는 상단 저항에 가깝습니다."] },
      scoreSummary: { holdScore: 70, entryScores: { currentEntry: { score: 90, label: "현재가 진입 유리", explanation: "raw high score" }, pullbackEntry: { score: 70, label: "future pullback", explanation: "future setup" } } },
      priceRoles: { current: { priceZone: "118 부근" }, pivot: { priceZone: "120 부근" }, pullbackEntry: { priceZone: "100 부근" } },
      tradePlan: { riskRewardByEntry: { current: riskReward(0.7), pullback: riskReward(1.8), breakout: riskReward(1.1) } },
    }),
    check: (report) => {
      const text = actionText(report);
      return [
        expect(["range_upper_resistance", "resistance_test"].includes(report.chartRegime?.type), "regime should be range_upper_resistance or resistance_test"),
        expect(entries(report).current < 80, "currentEntry should be capped below 80"),
        expect(/저항|저항권|돌파|추격|익절|확인/.test(text), "action should communicate upper resistance/chase caution"),
        expect(!/지지권 눌림목 매수 후보/.test(text), "should not be lower-support pullback candidate"),
        expect(!/일부 익절/.test(text) || /보유자/.test(text), "partial profit should be holder-only"),
      ];
    },
  },
  {
    name: "Healthy pullback",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "104 부근", keyPivotPrice: "115 부근", mainSupports: ["102 부근", "100 부근"], mainResistances: ["115 부근", "125 부근"] },
      marketContext: { chartRegime: "healthy_pullback", priceLocation: "near_support", nearSupport: true, breakoutRetestConfirmed: false, chartRegimeReasons: ["상승 흐름 속 정상 눌림 구간입니다."] },
      scoreSummary: { riskScore: 45, entryScores: { currentEntry: { score: 55, label: "소액 조건부", explanation: "near support" }, pullbackEntry: { score: 78, label: "눌림목 후보", explanation: "support confirmed" } } },
      priceRoles: { current: { priceZone: "104 부근" }, pullbackEntry: { priceZone: "102 부근" }, stopLoss: { shortTerm: "100 부근", conservative: "96 부근", invalidation: "92 부근" } },
      tradePlan: { riskRewardByEntry: { current: riskReward(1.3), pullback: riskReward(1.8), breakout: riskReward(1.2) } },
      evidence: { positive: ["상승 추세 유지"], negative: [], riskFactors: ["이미지 기반 확인 필요"] },
    }),
    check: (report) => [
      expect(["healthy_pullback", "range_lower_support", "uptrend_pullback", "uptrend_consolidation"].includes(report.chartRegime?.type), "regime should be healthy_pullback or uptrend/support-equivalent"),
      expect(/눌림|지지|반등/.test(actionText(report)), "action should communicate pullback/support confirmation"),
      expect(!/NO_TRADE|매매 부적합|일부 익절/.test(actionText(report)), "should not be no-trade or partial-profit main action"),
    ],
  },
  {
    name: "Sideways",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "120 부근", keyPivotPrice: "140 부근", mainSupports: ["100 부근"], mainResistances: ["140 부근"] },
      marketContext: { chartRegime: "sideways", priceLocation: "middle_range", rangePosition: 0.5, nearSupport: false, nearResistance: false, breakoutRetestConfirmed: false, chartRegimeReasons: ["지지와 저항 사이에서 방향 확인이 필요한 구간입니다."] },
      priceRoles: { current: { priceZone: "120 부근" }, pivot: { priceZone: "140 부근" }, pullbackEntry: { priceZone: "100 부근" }, targets: { pullbackTargets: ["140 부근"], breakoutTargets: ["150 부근"] } },
      keyLevels: {
        supports: [{ label: "주요 지지", priceZone: "100 부근", meaning: "하단 지지", reliability: "medium" }],
        resistances: [{ label: "주요 저항", priceZone: "140 부근", meaning: "상단 저항", reliability: "medium" }],
      },
      scoreSummary: { entryScores: { currentEntry: { score: 50, label: "확인 필요", explanation: "middle range" }, pullbackEntry: { score: 55, label: "확인 필요", explanation: "wait" }, breakoutEntry: { score: 55, label: "확인 필요", explanation: "wait" } } },
      tradePlan: {
        transitionLevel: { priceZone: "140 부근", condition: "140 돌파 확인", meaning: "상단 전환 가격" },
        entry: {
          currentEntry: { condition: "방향 확인 후 대응", priceZone: "120 부근" },
          pullbackEntry: { condition: "100 지지 확인", priceZone: "100 부근" },
          breakoutEntry: { condition: "140 돌파 후 재지지", priceZone: "140 부근" },
        },
        targets: {
          firstTarget: { priceZone: "140 부근" },
          secondTarget: { priceZone: "150 부근" },
          pullbackTargets: { firstTarget: { priceZone: "140 부근" } },
          breakoutTargets: { firstTarget: { priceZone: "150 부근" } },
        },
        riskRewardByEntry: { current: riskReward(1.0), pullback: riskReward(1.2), breakout: riskReward(1.2) },
      },
    }),
    check: (report) => {
      const entry = entries(report);
      return [
        expect(report.chartRegime?.type === "sideways", "regime should be sideways"),
        expect(Math.max(entry.current, entry.pullback, entry.breakout) < 80, "entry scores should not be extremely high"),
        expect(/방향|확인|대기|돌파/.test(actionText(report)), "action should communicate confirmation/wait"),
        expect(!/강한 매수|돌파 매수 후보|지지권 눌림목 매수 후보/.test(actionText(report)), "should not be strong buy or support candidate"),
      ];
    },
  },
  {
    name: "Balanced non-extreme raw scores",
    raw: baseReport({
      marketContext: { chartRegime: "sideways", priceLocation: "middle_range", nearSupport: false, nearResistance: false, breakoutRetestConfirmed: false },
      scoreSummary: {
        riskScore: 50,
        entryScores: {
          currentEntry: { score: 0, label: "현재가 진입 부적합", explanation: "raw extreme low" },
          pullbackEntry: { score: 100, label: "눌림목 진입 유리", explanation: "raw extreme high" },
          breakoutEntry: { score: 5, label: "돌파 진입 부적합", explanation: "raw extreme low" },
        },
      },
      tradePlan: { riskRewardByEntry: { current: riskReward(1.1), pullback: riskReward(1.6), breakout: riskReward(1.1) } },
    }),
    check: (report) => {
      const entry = entries(report);
      return [
        expect(entry.current >= 20, "non-extreme currentEntry should not remain 0"),
        expect(entry.pullback <= 75, "future/non-confirmed pullbackEntry should not remain 85+"),
        expect(entry.breakout >= 25, "usable but unconfirmed breakoutEntry should not remain 0~10"),
      ];
    },
  },
  {
    name: "Pullback RR support floor",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "102 부근", keyPivotPrice: "115 부근", mainSupports: ["100 부근"], mainResistances: ["115 부근"] },
      marketContext: { chartRegime: "range_lower_support", priceLocation: "near_support", nearSupport: true, breakoutRetestConfirmed: false },
      scoreSummary: {
        riskScore: 45,
        entryScores: {
          currentEntry: { score: 25, label: "현재가 진입 불리", explanation: "raw low" },
          pullbackEntry: { score: 10, label: "눌림목 진입 부적합", explanation: "raw low despite RR" },
          breakoutEntry: { score: 30, label: "돌파 진입 확인 필요", explanation: "raw low" },
        },
      },
      priceRoles: { current: { priceZone: "102 부근" }, pivot: { priceZone: "115 부근" }, pullbackEntry: { priceZone: "100 부근" }, stopLoss: { shortTerm: "96 부근", conservative: "92 부근", invalidation: "90 부근" } },
      tradePlan: {
        stopLossByEntry: { pullbackEntry: { priceZone: "96 부근", condition: "96 이탈", explanation: "눌림목 실패 기준" } },
        riskRewardByEntry: { current: riskReward(1.2), pullback: riskReward(2.2), breakout: riskReward(1.1) },
      },
    }),
    check: (report) => [
      expect(entries(report).pullback >= 40, "pullbackEntry with valid support and RR 2.0+ should not stay below 40"),
      expect(/지지|눌림|조건부|후보|유리/.test(report.scoreSummary?.entryScores?.pullbackEntry?.label || ""), "pullback label should remain support/conditional oriented"),
    ],
  },
  {
    name: "Unconfirmed breakout balanced",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "99 부근", keyPivotPrice: "100 부근", mainSupports: ["92 부근"], mainResistances: ["100 부근", "110 부근"] },
      marketContext: { chartRegime: "breakout_wait", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { entryScores: { breakoutEntry: { score: 5, label: "돌파 진입 부적합", explanation: "raw low before breakout" } } },
      priceRoles: { current: { priceZone: "99 부근" }, pivot: { priceZone: "100 부근" }, targets: { breakoutTargets: ["110 부근"] } },
      tradePlan: {
        stopLossByEntry: { breakoutEntry: { priceZone: "100 부근", condition: "100 재이탈", explanation: "돌파 실패" } },
        riskRewardByEntry: { current: riskReward(0.8), pullback: riskReward(1.4), breakout: riskReward(1.3) },
      },
    }),
    check: (report) => {
      const entry = entries(report);
      const label = report.scoreSummary?.entryScores?.breakoutEntry?.label || "";
      return [
        expect(entry.breakout >= 40 && entry.breakout <= 60, "unconfirmed but usable breakout should be roughly 40~60"),
        expect(/돌파 확인 필요/.test(label), "unconfirmed breakout label should be 돌파 확인 필요"),
      ];
    },
  },
  {
    name: "Near target current cap",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "118.8 부근", keyPivotPrice: "120 부근", mainSupports: ["100 부근"], mainResistances: ["120 부근"] },
      marketContext: { chartRegime: "range_upper_resistance", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 55, entryScores: { currentEntry: { score: 95, label: "현재가 진입 유리", explanation: "raw high near target" } } },
      priceRoles: { current: { priceZone: "118.8 부근" }, pivot: { priceZone: "120 부근" }, targets: { pullbackTargets: ["120 부근"], breakoutTargets: ["125 부근"] } },
      tradePlan: { riskRewardByEntry: { current: riskReward(0.6), pullback: riskReward(1.7), breakout: riskReward(1.1) } },
    }),
    check: (report) => {
      const current = entries(report).current;
      const label = report.scoreSummary?.entryScores?.currentEntry?.label || "";
      return [
        expect(current < 80, "currentEntry near resistance/target should not remain 80+"),
        expect(/추격|저항|불리|확인|부적합/.test(label), "currentEntry label should be cautious near resistance"),
      ];
    },
  },
  {
    name: "Near resistance non-invalid current floor",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "118.8 부근", keyPivotPrice: "120 부근", mainSupports: ["115 부근"], mainResistances: ["120 부근", "130 부근"] },
      marketContext: { chartRegime: "range_upper_resistance", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 55, entryScores: { currentEntry: { score: 5, label: "현재가 진입 부적합", explanation: "raw low near resistance" } } },
      priceRoles: { current: { priceZone: "118.8 부근" }, pivot: { priceZone: "120 부근" }, targets: { pullbackTargets: ["130 부근"], breakoutTargets: ["130 부근"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "115 부근", condition: "115 이탈", explanation: "현재가 진입 손절 기준" } },
        riskRewardByEntry: { current: riskReward(1.6), pullback: riskReward(1.7), breakout: riskReward(1.1) },
      },
    }),
    check: (report) => {
      const current = entries(report).current;
      const label = report.scoreSummary?.entryScores?.currentEntry?.label || "";
      return [
        expect(current >= 20 && current <= 40, "near-resistance but non-invalid currentEntry should be roughly 20~40"),
        expect(/추격|저항|불리|확인/.test(label), "near-resistance currentEntry label should stay cautious"),
      ];
    },
  },
  {
    name: "Ideal breakout high but not perfect",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "106 부근", keyPivotPrice: "100 부근", mainSupports: ["100 부근"], mainResistances: ["118 부근", "130 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "breakout_retest_confirmed", priceLocation: "breakout_area", breakoutRetestConfirmed: true, nearResistance: false },
      scoreSummary: { riskScore: 35, entryScores: { breakoutEntry: { score: 100, label: "돌파 진입 유리", explanation: "raw perfect" } } },
      priceRoles: { current: { priceZone: "106 부근" }, pivot: { priceZone: "100 부근" }, targets: { breakoutTargets: ["118 부근", "130 부근"] } },
      tradePlan: {
        stopLossByEntry: { breakoutEntry: { priceZone: "100 부근", condition: "100 재이탈", explanation: "핵심 전환 가격 재이탈 시 돌파 실패" } },
        riskRewardByEntry: { current: riskReward(1.4), pullback: riskReward(1.7), breakout: riskReward(2.8) },
      },
      indicatorAnalysis: { confirmed: [{ name: "거래량", signal: "bullish", explanation: "상승 구간 거래량 증가" }], unavailable: [] },
    }),
    check: (report) => {
      const breakout = entries(report).breakout;
      return [
        expect(breakout >= 75, "confirmed breakout should stay high"),
        expect(breakout < 100, "even ideal breakout should not default to 100"),
      ];
    },
  },
  {
    name: "RSI overbought signal",
    raw: baseReport({
      indicatorAnalysis: {
        confirmed: [{ name: "RSI", signal: "bullish", explanation: "RSI 77.27 과매수권으로 추격매수 부담이 있습니다." }],
        unavailable: [],
      },
      technicalAnalysis: {
        rsi: { value: 77.27, interpretation: "과매수권" },
      },
    }),
    check: (report, vm) => {
      const rsi = vm.indicators.find((item) => item.name === "RSI");
      return [
        expect(Boolean(rsi), "RSI row should exist"),
        expect(/주의|과열/.test(rsi?.signal || ""), "RSI overbought should map to caution/overheat"),
        expect((rsi?.signal || "") !== "매수", "RSI overbought must not be mapped to 매수"),
      ];
    },
  },
  {
    name: "Price role collapse target warning",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "280 부근", keyPivotPrice: "280 부근", mainSupports: ["274 부근", "271 부근"], mainResistances: ["280 부근"] },
      marketContext: { chartRegime: "unknown", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      priceRoles: {
        current: { priceZone: "280 부근" },
        pivot: { priceZone: "280 부근" },
        pullbackEntry: { priceZone: "274 부근" },
        targets: { pullbackTargets: ["280 부근"], breakoutTargets: ["280 부근"], holderTargets: ["280 부근"] },
      },
      keyLevels: {
        supports: [{ label: "1차 지지", priceZone: "274 부근", meaning: "재지지 후보", reliability: "medium" }],
        resistances: [{ label: "1차 저항", priceZone: "280 부근", meaning: "목표가 근접", reliability: "medium" }],
      },
      tradePlan: {
        entry: { breakoutEntry: { priceZone: "280 부근", condition: "280 돌파 후 재지지", action: "돌파 확인" } },
        targets: {
          firstTarget: { priceZone: "280 부근", action: "기존 목표" },
          pullbackTargets: { firstTarget: { priceZone: "280 부근", action: "눌림목 목표" } },
          breakoutTargets: { firstTarget: { priceZone: "280 부근", action: "돌파 목표" } },
        },
        riskRewardByEntry: { current: riskReward(0.4), pullback: riskReward(1.4), breakout: riskReward(0.8) },
      },
    }),
    check: (report, vm) => [
      expect(/목표가 근접|상승 여지 제한|상단 목표 미확인/.test(`${vm.keyLevels.target} ${vm.keyLevels.targetGapLabel} ${vm.keyLevels.targetGapExplanation}`), "collapsed target should be shown as near/limited/unknown"),
      expect(!(/^280/.test(vm.keyLevels.target) && !/목표가 근접|상승 여지 제한|상단 목표 미확인/.test(`${vm.keyLevels.target} ${vm.keyLevels.targetGapLabel}`)), "target must not be same current price without warning"),
    ],
  },
  {
    name: "Resistance test future pullback display",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "118 부근", keyPivotPrice: "120 부근", mainSupports: ["100 부근"], mainResistances: ["120 부근", "130 부근"] },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: {
        riskScore: 55,
        entryScores: {
          currentEntry: { score: 35, label: "추격 주의", explanation: "near resistance" },
          pullbackEntry: { score: 88, label: "눌림목 진입 우세", explanation: "future pullback" },
          breakoutEntry: { score: 55, label: "돌파 확인 필요", explanation: "wait" },
        },
      },
      priceRoles: { current: { priceZone: "118 부근" }, pivot: { priceZone: "120 부근" }, pullbackEntry: { priceZone: "100 부근" } },
      tradePlan: { riskRewardByEntry: { current: riskReward(0.6), pullback: riskReward(2.0), breakout: riskReward(1.1) } },
    }),
    check: (report, vm) => [
      expect(/미래 눌림목 관심|돌파 확인 우선|돌파 확인 대기|저항권 진입 주의/.test(vm.scorePanel.entryScoreLabel), "score panel should label future pullback or confirmation priority"),
      expect(!/눌림목 진입 우세/.test(vm.scorePanel.entryScoreLabel), "score panel must not show 눌림목 진입 우세 as main label near resistance"),
    ],
  },
  {
    name: "Overheated breakout regime",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "280 부근", keyPivotPrice: "280 부근", mainSupports: ["274 부근", "271 부근"], mainResistances: ["280 부근", "292 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "unknown", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 58, entryScores: { currentEntry: { score: 85, label: "현재가 진입 유리", explanation: "raw high" } } },
      priceRoles: { current: { priceZone: "280 부근" }, pivot: { priceZone: "280 부근" }, pullbackEntry: { priceZone: "274 부근" }, targets: { breakoutTargets: ["292 부근"] } },
      tradePlan: { riskRewardByEntry: { current: riskReward(0.7), pullback: riskReward(1.7), breakout: riskReward(1.1) } },
      indicatorAnalysis: { confirmed: [{ name: "RSI", signal: "neutral", explanation: "RSI 77 과매수권" }, { name: "MACD", signal: "bullish", explanation: "상승 모멘텀 유지" }], unavailable: [] },
      evidence: { positive: ["급등 돌파 이후 MACD 상승 모멘텀"], negative: ["RSI 과매수권으로 추격매수 부담"], riskFactors: ["현재가가 목표/저항권에 가까움"] },
    }),
    check: (report) => [
      expect(["overheated_breakout", "overextended_surge", "resistance_test"].includes(report.chartRegime?.type), "overheated breakout should map to overheated/overextended/resistance-test category"),
      expect(/추격|주의|재지지|눌림|저항/.test(actionText(report)), "final action should warn chasing risk or require retest"),
      expect(!/현재가.*유리|즉시 매수|매수 우위/.test(actionText(report)), "overheated breakout must not imply favorable current buy"),
    ],
  },
  {
    name: "Uptrend pullback beats range lower",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "951 부근", keyPivotPrice: "1085 부근", mainSupports: ["900 부근"], mainResistances: ["1085 부근"] },
      marketContext: { chartRegime: "unknown", priceLocation: "lower_range", rangePosition: 0.25, nearSupport: true, nearResistance: false, breakoutRetestConfirmed: false },
      priceRoles: { current: { priceZone: "951 부근" }, pivot: { priceZone: "1085 부근" }, pullbackEntry: { priceZone: "900 부근" } },
      tradePlan: { riskRewardByEntry: { current: riskReward(1.3), pullback: riskReward(2.1), breakout: riskReward(1.2) } },
      evidence: { positive: ["강한 상승추세 higher high higher low 구름 지지 위 controlled pullback"], negative: [], riskFactors: ["지지 확인 필요"] },
    }),
    check: (report) => [
      expect(["uptrend_pullback", "uptrend_consolidation"].includes(report.chartRegime?.type), "strong uptrend pullback should be uptrend pullback/consolidation"),
      expect(report.chartRegime?.type !== "range_lower_support", "uptrend pullback should not become range_lower_support without sideways range evidence"),
    ],
  },
  {
    name: "Downtrend rebound not healthy pullback",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "630 부근", keyPivotPrice: "667 부근", mainSupports: ["590 부근"], mainResistances: ["667 부근"] },
      marketContext: { chartRegime: "unknown", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      priceRoles: { current: { priceZone: "630 부근" }, pivot: { priceZone: "667 부근" }, pullbackEntry: { priceZone: "590 부근" } },
      tradePlan: { riskRewardByEntry: { current: riskReward(0.8), pullback: riskReward(1.8), breakout: riskReward(1.1) } },
      evidence: { positive: ["저점에서 반등 recover"], negative: ["이전 강한 하락 decline 이후 overhead 매물 저항 테스트"], riskFactors: ["돌파 후 재지지 미확인"] },
    }),
    check: (report) => [
      expect(["downtrend_rebound", "resistance_test"].includes(report.chartRegime?.type), "downtrend rebound should be downtrend_rebound or resistance_test"),
      expect(report.chartRegime?.type !== "healthy_pullback", "downtrend rebound must not become healthy_pullback"),
    ],
  },
  {
    name: "Controlled strong trend current entry allowed",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "105 부근", keyPivotPrice: "104 부근", mainSupports: ["101 부근", "98 부근"], mainResistances: ["118 부근", "126 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_consolidation", priceLocation: "breakout_area", nearSupport: false, nearResistance: false, breakoutRetestConfirmed: true, chartRegimeReasons: ["강한 상승 추세 이후 전환 가격 위에서 지지 유지"] },
      scoreSummary: {
        riskScore: 42,
        entryScores: {
          currentEntry: { score: 62, label: "현재가 조건부", explanation: "controlled risk" },
          pullbackEntry: { score: 66, label: "눌림목 후보", explanation: "pullback still valid" },
          breakoutEntry: { score: 60, label: "돌파 확인", explanation: "retest area" },
        },
      },
      priceRoles: { current: { priceZone: "105 부근" }, pivot: { priceZone: "104 부근" }, pullbackEntry: { priceZone: "101 부근" }, targets: { pullbackTargets: ["118 부근"], breakoutTargets: ["118 부근", "126 부근"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "101 부근", condition: "101 이탈", explanation: "짧은 손절 기준" } },
        riskRewardByEntry: { current: riskReward(1.7), pullback: riskReward(2.0), breakout: riskReward(1.6) },
      },
      indicatorAnalysis: { confirmed: [{ name: "MACD", signal: "bullish", explanation: "상승 모멘텀 유지" }, { name: "거래량", signal: "bullish", explanation: "상승 구간 거래량 증가" }], unavailable: [] },
      evidence: { positive: ["strong uptrend higher high higher low MACD bullish 거래량 증가"], negative: [], riskFactors: ["손절 기준 엄수"] },
    }),
    check: (report) => {
      const current = entries(report).current;
      const text = actionText(report);
      return [
        expect(current >= 40, "strong trend with controlled risk should not force currentEntry below 40"),
        expect(!/부적합/.test(report.scoreSummary?.entryScores?.currentEntry?.label || ""), "currentEntry should not be labeled 부적합"),
        expect(/현재가|소액|분할|모멘텀|조건부|PULLBACK|눌림/.test(text), "final action should allow controlled current entry or clearly preserve pullback context"),
        expect(!/무조건 매수|확정 매수|강력 매수/.test(text), "must not use reckless buy wording"),
      ];
    },
  },
  {
    name: "Near resistance momentum strong can be small entry",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "118 부근", keyPivotPrice: "120 부근", mainSupports: ["115 부근", "110 부근"], mainResistances: ["120 부근", "130 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "breakout_wait", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false, chartRegimeReasons: ["저항 직전이지만 거래량과 모멘텀 증가"] },
      scoreSummary: {
        riskScore: 50,
        entryScores: {
          currentEntry: { score: 58, label: "현재가 조건부", explanation: "momentum near resistance" },
          pullbackEntry: { score: 62, label: "눌림목 후보", explanation: "future setup" },
          breakoutEntry: { score: 58, label: "돌파 확인", explanation: "watch" },
        },
      },
      priceRoles: { current: { priceZone: "118 부근" }, pivot: { priceZone: "120 부근" }, pullbackEntry: { priceZone: "115 부근" }, targets: { pullbackTargets: ["130 부근"], breakoutTargets: ["130 부근", "138 부근"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "115 부근", condition: "115 이탈", explanation: "짧은 손절 기준" } },
        targets: {
          firstTarget: { priceZone: "130 부근" },
          secondTarget: { priceZone: "138 부근" },
          breakoutTargets: { firstTarget: { priceZone: "130 부근" }, secondTarget: { priceZone: "138 부근" } },
        },
        riskRewardByEntry: { current: riskReward(1.5), pullback: riskReward(1.8), breakout: riskReward(1.6) },
      },
      indicatorAnalysis: { confirmed: [{ name: "MACD", signal: "bullish", explanation: "MACD 상승 모멘텀 유지" }, { name: "이동평균선", signal: "bullish", explanation: "가격이 단기 이동평균선 위에서 유지" }, { name: "거래량", signal: "bullish", explanation: "돌파 직전 거래량 증가" }], unavailable: [] },
      evidence: { positive: ["MACD bullish moving average volume breakout momentum"], negative: ["저항 근접"], riskFactors: ["돌파 실패 시 빠른 손절 필요"] },
    }),
    check: (report, vm) => {
      const current = entries(report).current;
      const label = report.scoreSummary?.entryScores?.currentEntry?.label || "";
      const text = actionText(report);
      return [
        expect(current >= 45 && current <= 65, "strong momentum near resistance can show currentEntry around 45~65"),
        expect(/현재가 소액|돌파 전 소액|조건부|분할|저항/.test(`${label} ${vm.scorePanel.entryScoreLabel}`), "label should indicate small/conditional/pre-breakout entry context"),
        expect(!/무조건 매수|확정 매수|강력 매수/.test(text), "must not use reckless buy wording"),
      ];
    },
  },
  {
    name: "Low target gap blocks aggressive current entry",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "120 부근", keyPivotPrice: "120 부근", mainSupports: ["115 부근"], mainResistances: ["120 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 45, entryScores: { currentEntry: { score: 70, label: "현재가 진입 유리", explanation: "raw high" } } },
      priceRoles: { current: { priceZone: "120 부근" }, pivot: { priceZone: "120 부근" }, pullbackEntry: { priceZone: "115 부근" }, targets: { pullbackTargets: ["120 부근"], breakoutTargets: ["120 부근"] } },
      tradePlan: {
        targets: { firstTarget: { priceZone: "120 부근" }, breakoutTargets: { firstTarget: { priceZone: "120 부근" } } },
        riskRewardByEntry: { current: riskReward(0.5), pullback: riskReward(1.5), breakout: riskReward(0.7) },
      },
      indicatorAnalysis: { confirmed: [{ name: "MACD", signal: "bullish", explanation: "상승 모멘텀 일부 유지" }], unavailable: [] },
    }),
    check: (report, vm) => {
      const text = `${actionText(report)} ${vm.finalAction.title} ${vm.keyLevels.targetGapLabel} ${vm.keyLevels.targetGapExplanation}`;
      return [
        expect(!["CURRENT_PARTIAL_ENTRY", "CURRENT_STARTER_POSITION", "MOMENTUM_CONTINUATION_ENTRY", "PRE_BREAKOUT_AGGRESSIVE_ENTRY"].includes(report.finalSummary?.actionState), "low target gap must not allow current aggressive entry"),
        expect(/추격매수 주의|목표 여유 낮음|목표가 근접|상승 여지 제한|저항권/.test(text), "low target gap should communicate chase caution or low target room"),
      ];
    },
  },
  {
    name: "RSI extreme parabolic blocks current partial entry",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "150 부근", keyPivotPrice: "150 부근", mainSupports: ["120 부근"], mainResistances: ["150 부근", "158 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "overheated_breakout", priceLocation: "overextended", isExtendedMove: true, nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 62, entryScores: { currentEntry: { score: 75, label: "현재가 진입 유리", explanation: "raw momentum" }, pullbackEntry: { score: 68, label: "눌림목 후보", explanation: "future" } } },
      priceRoles: { current: { priceZone: "150 부근" }, pivot: { priceZone: "150 부근" }, pullbackEntry: { priceZone: "120 부근" }, targets: { breakoutTargets: ["158 부근"] } },
      tradePlan: { stopLossByEntry: { currentEntry: { priceZone: "120 부근", condition: "120 이탈", explanation: "지지선 이탈" } }, riskRewardByEntry: { current: riskReward(1.2), pullback: riskReward(1.7), breakout: riskReward(1.1) } },
      indicatorAnalysis: { confirmed: [{ name: "RSI", signal: "caution", explanation: "RSI 82 과매수 극단 과열" }, { name: "MACD", signal: "bullish", explanation: "상승 모멘텀 유지" }], unavailable: [] },
      evidence: { positive: ["parabolic surge 급등"], negative: ["RSI 82 극단 과열"], riskFactors: ["지지선 이격 큼"] },
    }),
    check: (report) => {
      const text = actionText(report);
      return [
        expect(!["CURRENT_PARTIAL_ENTRY", "CURRENT_STARTER_POSITION", "MOMENTUM_CONTINUATION_ENTRY", "PRE_BREAKOUT_AGGRESSIVE_ENTRY"].includes(report.finalSummary?.actionState), "RSI extreme/parabolic move must not allow current partial entry"),
        expect(/추격|주의|위험|과열|눌림|재지지/.test(text), "final action should remain caution/risk/retest oriented"),
      ];
    },
  },
  {
    name: "Support breakdown blocks aggressive entry",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "88 부근", keyPivotPrice: "100 부근", mainSupports: ["90 부근"], mainResistances: ["100 부근"] },
      marketContext: { chartRegime: "support_breakdown", priceLocation: "lower_range", nearSupport: false, nearResistance: false, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 76, entryScores: { currentEntry: { score: 70, label: "현재가 조건부", explanation: "raw high despite breakdown" } } },
      priceRoles: { current: { priceZone: "88 부근" }, pivot: { priceZone: "100 부근" }, pullbackEntry: { priceZone: "90 부근" }, stopLoss: { shortTerm: "90 부근", conservative: "85 부근" } },
      tradePlan: {
        stopLoss: { priceZone: "90 부근", shortTerm: { priceZone: "90 부근" } },
        stopLossByEntry: { currentEntry: { priceZone: "90 부근", condition: "90 이탈", explanation: "주요 지지 이탈" } },
        riskRewardByEntry: { current: riskReward(1.5), pullback: riskReward(1.4), breakout: riskReward(1.2) },
      },
      evidence: { negative: ["주요 지지선 이탈 breakdown"], riskFactors: ["risk high"] },
    }),
    check: (report) => {
      const text = actionText(report);
      return [
        expect(!["CURRENT_PARTIAL_ENTRY", "CURRENT_STARTER_POSITION", "MOMENTUM_CONTINUATION_ENTRY", "PRE_BREAKOUT_AGGRESSIVE_ENTRY"].includes(report.finalSummary?.actionState), "support breakdown must block aggressive entry"),
        expect(/위험|보류|이탈|AVOID|RISK/.test(text), "support breakdown should communicate risk/avoid"),
      ];
    },
  },
  {
    name: "Valid pullback but current entry also possible",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "105 부근", keyPivotPrice: "110 부근", mainSupports: ["102 부근"], mainResistances: ["120 부근", "128 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_pullback", priceLocation: "near_support", nearSupport: true, nearResistance: false, breakoutRetestConfirmed: false },
      scoreSummary: {
        riskScore: 46,
        entryScores: {
          currentEntry: { score: 55, label: "현재가 조건부", explanation: "current possible" },
          pullbackEntry: { score: 72, label: "눌림목 후보", explanation: "valid pullback" },
          breakoutEntry: { score: 55, label: "돌파 확인", explanation: "watch" },
        },
      },
      priceRoles: { current: { priceZone: "105 부근" }, pivot: { priceZone: "110 부근" }, pullbackEntry: { priceZone: "102 부근" }, targets: { pullbackTargets: ["120 부근"], breakoutTargets: ["120 부근", "128 부근"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "102 부근", condition: "102 이탈", explanation: "짧은 손절" }, pullbackEntry: { priceZone: "100 부근", condition: "100 이탈", explanation: "눌림목 실패" } },
        riskRewardByEntry: { current: riskReward(1.4), pullback: riskReward(2.1), breakout: riskReward(1.2) },
      },
      indicatorAnalysis: { confirmed: [{ name: "MACD", signal: "bullish", explanation: "상승 모멘텀 유지" }], unavailable: [] },
      evidence: { positive: ["strong uptrend support intact MACD bullish"], negative: [], riskFactors: ["손절 기준 확인"] },
    }),
    check: (report, vm) => {
      const text = `${actionText(report)} ${vm.finalAction.title} ${vm.scorePanel.entryScoreLabel}`;
      return [
        expect(entries(report).current >= 45, "currentEntry should remain viable when stop is clear"),
        expect(/현재가|소액|분할|조건부|눌림목 추가|지지 확인/.test(text), "final action should mention current small/conditional possibility or pullback add path"),
        expect(!/^눌림 대기$/.test(vm.hero.signalLabel), "hero signal should not collapse only to generic 눌림 대기"),
      ];
    },
  },
  {
    name: "ReportDecision strong uptrend pullback invariant",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "951 부근", keyPivotPrice: "1085 부근", mainSupports: ["900 부근"], mainResistances: ["1085 부근", "1160 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_pullback", priceLocation: "lower_range", rangePosition: 0.28, nearSupport: true, nearResistance: false },
      scoreSummary: { riskScore: 42, entryScores: { currentEntry: { score: 58, label: "현재가 조건부", explanation: "support intact" }, pullbackEntry: { score: 74, label: "눌림목 후보", explanation: "support reaction candidate" }, breakoutEntry: { score: 55, label: "돌파 확인", explanation: "watch" } } },
      priceRoles: { current: { priceZone: "951 부근" }, pivot: { priceZone: "1085 부근" }, pullbackEntry: { priceZone: "900 부근" }, targets: { pullbackTargets: ["1085 부근"], breakoutTargets: ["1160 부근"] } },
      evidence: { positive: ["strong prior uptrend higher high higher low rising support"], negative: [], riskFactors: ["지지 반응 확인 필요"] },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.chartRegime === "uptrend_pullback", "ReportDecision should keep uptrend_pullback"),
      expect(vm.reportDecision.chartRegime !== "range_lower_support", "strong uptrend pullback must not be plain range_lower_support"),
      expect(/눌림|현재가|지지|분할|조건부/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "decision should allow pullback/current conditional path"),
    ],
  },
  {
    name: "ReportDecision uptrend consolidation invariant",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "230 부근", keyPivotPrice: "250 부근", mainSupports: ["210 부근"], mainResistances: ["250 부근", "260 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_consolidation", priceLocation: "middle_range", nearSupport: false, nearResistance: false, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 44, entryScores: { currentEntry: { score: 52, label: "현재가 조건부", explanation: "trend intact" }, pullbackEntry: { score: 66, label: "지지 확인 시 관심", explanation: "support confirmation" }, breakoutEntry: { score: 61, label: "돌파 확인 필요", explanation: "breakout wait" } } },
      priceRoles: { current: { priceZone: "230 부근" }, pivot: { priceZone: "250 부근" }, pullbackEntry: { priceZone: "210 부근" }, targets: { pullbackTargets: ["250 부근"], breakoutTargets: ["260 부근"] } },
      tradePlan: {
        entry: { pullbackEntry: { priceZone: "210 부근", condition: "210 지지 확인", action: "눌림목 확인" }, breakoutEntry: { priceZone: "250 부근", condition: "250 돌파 후 재지지", action: "돌파 확인" } },
        riskRewardByEntry: { current: riskReward(1.4), pullback: riskReward(1.8), breakout: riskReward(1.5) },
      },
      evidence: { positive: ["uptrend consolidation above moving averages support intact"], negative: [], riskFactors: ["방향 확인 필요"] },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.chartRegime !== "downtrend" && vm.reportDecision.chartRegime !== "downtrend_rebound", "uptrend consolidation fixture must not collapse into a downtrend regime"),
      expect(!/하락|downtrend/i.test(`${vm.reportDecision.finalActionLabel} ${vm.hero.trendLabel}`), "uptrend consolidation must not show downtrend label"),
      expect(["watch", "caution", "buy", "neutral"].includes(vm.reportDecision.finalActionTone), "uptrend consolidation should not default to risk tone"),
    ],
  },
  {
    name: "ReportDecision overheated breakout invariant",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "280 부근", keyPivotPrice: "280 부근", mainSupports: ["274 부근"], mainResistances: ["280 부근", "292 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "overheated_breakout", priceLocation: "overextended", isExtendedMove: true, nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 62, entryScores: { currentEntry: { score: 72, label: "현재가 진입 유리", explanation: "raw high" }, pullbackEntry: { score: 64, label: "눌림목 후보", explanation: "future" }, breakoutEntry: { score: 56, label: "돌파 확인", explanation: "watch" } } },
      indicatorAnalysis: { confirmed: [{ name: "RSI", signal: "caution", explanation: "RSI 77 과매수권" }, { name: "MACD", signal: "bullish", explanation: "상승 모멘텀" }], unavailable: [] },
      evidence: { positive: ["급등 breakout"], negative: ["과매수 추격매수 부담"], riskFactors: ["저항 근접"] },
    }),
    check: (report, vm) => [
      expect(["overheated_breakout", "overextended_surge", "resistance_test"].includes(vm.reportDecision.chartRegime), "overheated breakout should be overheated/overextended/resistance-test"),
      expect(vm.reportDecision.finalActionTone === "caution" || vm.reportDecision.finalActionTone === "risk", "overheated breakout should be caution/risk tone"),
      expect(!/단순 매수|매수 우세|현재가 진입 유리/.test(vm.reportDecision.displayedEntrySignal.label), "overheated breakout must not show simple buy"),
    ],
  },
  {
    name: "ReportDecision resistance test invariant",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "137 부근", keyPivotPrice: "140 부근", mainSupports: ["135 부근"], mainResistances: ["137 부근", "140 부근"] },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 52, entryScores: { currentEntry: { score: 34, label: "추격 주의", explanation: "near resistance" }, pullbackEntry: { score: 88, label: "눌림목 진입 우세", explanation: "future pullback" }, breakoutEntry: { score: 58, label: "돌파 확인 필요", explanation: "watch" } } },
      priceRoles: { current: { priceZone: "137 부근" }, pivot: { priceZone: "140 부근" }, pullbackEntry: { priceZone: "135 부근" }, targets: { breakoutTargets: ["145 부근"] } },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.chartRegime === "resistance_test", "ReportDecision should keep resistance_test"),
      expect(/돌파|재지지|저항|미래 눌림목/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "resistance test should prioritize breakout/retest/future pullback"),
      expect(!/눌림목 진입 우세/.test(vm.reportDecision.displayedEntrySignal.label), "resistance test must not show immediate pullback buy favored"),
    ],
  },
  {
    name: "ReportDecision downtrend rebound invariant",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "630 부근", keyPivotPrice: "667 부근", mainSupports: ["590 부근"], mainResistances: ["667 부근"] },
      marketContext: { chartRegime: "unknown", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 56, entryScores: { currentEntry: { score: 42, label: "현재가 불리", explanation: "rebound resistance" }, pullbackEntry: { score: 75, label: "눌림목 후보", explanation: "future" }, breakoutEntry: { score: 60, label: "돌파 확인", explanation: "wait" } } },
      evidence: { positive: ["저점 반등 rebound"], negative: ["prior strong decline downtrend overhead resistance"], riskFactors: ["전환 미확인"] },
    }),
    check: (report, vm) => [
      expect(["downtrend_rebound", "resistance_test"].includes(vm.reportDecision.chartRegime), "downtrend rebound should be downtrend_rebound/resistance_test"),
      expect(vm.reportDecision.chartRegime !== "healthy_pullback", "downtrend rebound must not become healthy_pullback"),
      expect(/돌파|저항|재지지|반등/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "downtrend rebound should require resistance confirmation"),
    ],
  },
  {
    name: "ReportDecision breakout retest confirmed invariant",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "112 부근", keyPivotPrice: "110 부근", mainSupports: ["110 부근", "104 부근"], mainResistances: ["124 부근", "132 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "breakout_retest_confirmed", priceLocation: "breakout_area", breakoutRetestConfirmed: true, nearSupport: true, nearResistance: false },
      scoreSummary: { riskScore: 38, entryScores: { currentEntry: { score: 62, label: "현재가 조건부", explanation: "above pivot" }, pullbackEntry: { score: 66, label: "재지지 관심", explanation: "hold pivot" }, breakoutEntry: { score: 74, label: "돌파 진입 후보", explanation: "retest confirmed" } } },
      priceRoles: { current: { priceZone: "112 부근" }, pivot: { priceZone: "110 부근" }, pullbackEntry: { priceZone: "110 부근" }, breakoutEntry: { priceZone: "110 부근" }, targets: { pullbackTargets: ["124 부근"], breakoutTargets: ["124 부근", "132 부근"] } },
      tradePlan: {
        entry: { pullbackEntry: { priceZone: "110 부근", condition: "110 재지지 유지", action: "재지지 확인" }, breakoutEntry: { priceZone: "110 부근", condition: "110 위 재지지 확인", action: "돌파 진입" } },
        riskRewardByEntry: { current: riskReward(1.6), pullback: riskReward(1.8), breakout: riskReward(2.0) },
      },
      evidence: { positive: ["breakout retest confirmed above pivot"], negative: [], riskFactors: ["110 재이탈 확인"] },
    }),
    check: (report, vm) => {
      const scores = Object.values(entries(report));
      return [
        expect(vm.reportDecision.chartRegime === "breakout_retest_confirmed", "ReportDecision should keep breakout_retest_confirmed"),
        expect((vm.reportDecision.entryStrategies.breakout.score ?? 0) >= 65 && /돌파|재지지/.test(vm.reportDecision.entryStrategies.breakout.label), "breakout retest should keep breakout/retest entry valid"),
        expect(!scores.every((score) => score <= 20), "breakout retest entries must not all be near zero"),
      ];
    },
  },
  {
    name: "ReportDecision breakout wait state before breakout",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "447 부근", keyPivotPrice: "450 부근", mainSupports: ["430 부근"], mainResistances: ["450 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 48, entryScores: { currentEntry: { score: 40, label: "현재가 확인 필요", explanation: "저항 아래" }, pullbackEntry: { score: 58, label: "눌림목 후보", explanation: "지지 확인" }, breakoutEntry: { score: 62, label: "돌파 확인", explanation: "450 돌파 확인" } } },
      priceRoles: { current: { priceZone: "447 부근" }, pivot: { priceZone: "450 부근" }, breakoutEntry: { priceZone: "450 부근" }, pullbackEntry: { priceZone: "430 부근" }, targets: { breakoutTargets: ["475 부근"] } },
      tradePlan: {
        entry: { breakoutEntry: { priceZone: "450 부근", condition: "450 돌파 후 안착", action: "돌파 확인" } },
        stopLoss: { priceZone: "430 부근", condition: "430 이탈", meaning: "단기 손절", shortTerm: { priceZone: "430 부근", condition: "430 이탈", meaning: "단기 손절" } },
        stopLossByEntry: { currentEntry: { priceZone: "430 부근", condition: "430 이탈", explanation: "짧은 손절" }, breakoutEntry: { priceZone: "450 부근", condition: "450 재이탈", explanation: "돌파 실패" } },
        targets: { firstTarget: { priceZone: "475 부근", action: "1차 목표" }, breakoutTargets: { firstTarget: { priceZone: "475 부근", action: "돌파 목표" } } },
      },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.breakoutState === "breakout_wait", "price below breakout level should be breakout_wait"),
      expect(/돌파 확인 대기|돌파 확인 우선|저항/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "before breakout should still emphasize breakout confirmation"),
    ],
  },
  {
    name: "ReportDecision bullish breakout attempt state",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "450 부근", keyPivotPrice: "450 부근", mainSupports: ["430 부근"], mainResistances: ["450 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false, chartRegimeReasons: ["저항 돌파 시도와 모멘텀 개선"] },
      scoreSummary: { riskScore: 42, entryScores: { currentEntry: { score: 45, label: "현재가 확인 필요", explanation: "돌파 시도" }, pullbackEntry: { score: 56, label: "지지 확인", explanation: "지지 반응" }, breakoutEntry: { score: 65, label: "돌파 확인", explanation: "450 안착 확인" } } },
      priceRoles: { current: { priceZone: "450 부근" }, pivot: { priceZone: "450 부근" }, breakoutEntry: { priceZone: "450 부근" }, pullbackEntry: { priceZone: "430 부근" }, targets: { breakoutTargets: ["475 부근"] } },
      tradePlan: {
        entry: { breakoutEntry: { priceZone: "450 부근", condition: "450 돌파 후 안착", action: "돌파 확인" } },
        stopLoss: { priceZone: "430 부근", condition: "430 이탈", meaning: "단기 손절", shortTerm: { priceZone: "430 부근", condition: "430 이탈", meaning: "단기 손절" } },
        stopLossByEntry: { currentEntry: { priceZone: "430 부근", condition: "430 이탈", explanation: "짧은 손절" }, breakoutEntry: { priceZone: "450 부근", condition: "450 재이탈", explanation: "돌파 실패" } },
        targets: { firstTarget: { priceZone: "475 부근", action: "1차 목표" }, breakoutTargets: { firstTarget: { priceZone: "475 부근", action: "돌파 목표" } } },
      },
      indicatorAnalysis: { confirmed: [{ name: "RSI", signal: "neutral", explanation: "RSI 64로 과열 전 모멘텀 우호" }, { name: "MACD", signal: "buy", explanation: "MACD 상승 전환" }] },
      evidence: { positive: ["상승 모멘텀과 거래량 증가, MACD 개선"], negative: [], riskFactors: ["안착 실패 시 손절"] },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.breakoutState === "breakout_attempt", "price at breakout level should be breakout_attempt"),
      expect(vm.reportDecision.trendOpportunity === "bullish_breakout_attempt", "bullish evidence at level should be bullish_breakout_attempt"),
      expect((vm.reportDecision.entryStrategies.breakout.score ?? 0) >= 65, "bullish breakout attempt should lift breakout display score to 65+"),
      expect(/돌파 시도|안착 확인|소액/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "breakout attempt should show anchoring/attempt wording"),
    ],
  },
  {
    name: "ReportDecision breakout confirmed does not stay waiting",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "456 부근", keyPivotPrice: "450 부근", mainSupports: ["430 부근"], mainResistances: ["450 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "breakout_area", nearResistance: false, breakoutRetestConfirmed: true },
      scoreSummary: { riskScore: 40, entryScores: { currentEntry: { score: 45, label: "현재가 조건부", explanation: "450 위" }, pullbackEntry: { score: 55, label: "지지 확인", explanation: "430 지지" }, breakoutEntry: { score: 58, label: "돌파 확인", explanation: "450 위 안착" } } },
      priceRoles: { current: { priceZone: "456 부근" }, pivot: { priceZone: "450 부근" }, breakoutEntry: { priceZone: "450 부근" }, pullbackEntry: { priceZone: "450 부근" }, targets: { breakoutTargets: ["475 부근"] } },
      tradePlan: {
        entry: { breakoutEntry: { priceZone: "450 부근", condition: "450 위 안착", action: "돌파 확인" } },
        stopLoss: { priceZone: "450 부근", condition: "450 재이탈", meaning: "돌파 실패", shortTerm: { priceZone: "450 부근", condition: "450 재이탈", meaning: "단기 손절" } },
        stopLossByEntry: { currentEntry: { priceZone: "450 부근", condition: "450 재이탈", explanation: "돌파 실패" }, breakoutEntry: { priceZone: "450 부근", condition: "450 재이탈", explanation: "돌파 실패" } },
        targets: { firstTarget: { priceZone: "475 부근", action: "1차 목표" }, breakoutTargets: { firstTarget: { priceZone: "475 부근", action: "돌파 목표" } } },
      },
      evidence: { positive: ["breakout above pivot bullish momentum"], negative: [], riskFactors: ["450 재이탈 주의"] },
    }),
    check: (report, vm) => [
      expect(["breakout_confirmed", "breakout_retest_confirmed"].includes(vm.reportDecision.breakoutState), "price above breakout level should be breakout_confirmed or retest-confirmed"),
      expect((vm.reportDecision.entryStrategies.breakout.score ?? 0) >= 70, "breakout confirmed should lift breakout display score to 70+"),
      expect(!/돌파 확인 대기|신규 진입 보류 \/ 돌파 확인 대기/.test(vm.reportDecision.primaryStrategy.title), "confirmed breakout must not keep breakout-wait title"),
      expect(/돌파 성공|안착 확인|재지지/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "confirmed breakout should show success/anchoring/retest wording"),
    ],
  },
  {
    name: "ReportDecision breakout retest state with calibrated scores",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "452 부근", keyPivotPrice: "450 부근", mainSupports: ["450 부근"], mainResistances: ["450 부근", "475 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "breakout_area", nearSupport: true, nearResistance: false, breakoutRetestConfirmed: true, chartRegimeReasons: ["450 돌파 후 재지지 확인"] },
      scoreSummary: { riskScore: 36, entryScores: { currentEntry: { score: 44, label: "현재가 확인", explanation: "450 위 재지지" }, pullbackEntry: { score: 52, label: "재지지 관심", explanation: "450 지지" }, breakoutEntry: { score: 59, label: "돌파 확인", explanation: "450 위 재지지" } } },
      priceRoles: { current: { priceZone: "452 부근" }, pivot: { priceZone: "450 부근" }, breakoutEntry: { priceZone: "450 부근" }, pullbackEntry: { priceZone: "450 부근" }, targets: { breakoutTargets: ["475 부근"] } },
      tradePlan: {
        entry: { breakoutEntry: { priceZone: "450 부근", condition: "450 재지지", action: "돌파 후 재지지" } },
        stopLoss: { priceZone: "450 부근", condition: "450 재이탈", meaning: "돌파 실패", shortTerm: { priceZone: "450 부근", condition: "450 재이탈", meaning: "단기 손절" } },
        stopLossByEntry: { currentEntry: { priceZone: "450 부근", condition: "450 재이탈", explanation: "돌파 실패" }, breakoutEntry: { priceZone: "450 부근", condition: "450 재이탈", explanation: "돌파 실패" } },
        targets: { firstTarget: { priceZone: "475 부근", action: "1차 목표" }, breakoutTargets: { firstTarget: { priceZone: "475 부근", action: "돌파 목표" } } },
      },
      evidence: { positive: ["breakout retest confirmed above pivot"], negative: [], riskFactors: ["450 재이탈 주의"] },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.breakoutState === "breakout_retest_confirmed", "retest evidence should create breakout_retest_confirmed"),
      expect((vm.reportDecision.entryStrategies.breakout.score ?? 0) >= 75, "retest confirmed should lift breakout display score to 75+"),
      expect((vm.reportDecision.entryStrategies.current.score ?? 0) >= 60, "retest confirmed should allow controlled current display score 60+"),
      expect(/재지지|진입 후보/.test(vm.reportDecision.primaryStrategy.title), "retest confirmed should not remain overly defensive"),
    ],
  },
  {
    name: "ReportDecision uptrend continuation display scores",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "230 부근", keyPivotPrice: "240 부근", mainSupports: ["220 부근"], mainResistances: ["250 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_consolidation", priceLocation: "middle_range", nearSupport: false, nearResistance: false, breakoutRetestConfirmed: false, chartRegimeReasons: ["상승 추세 유지와 이동평균 지지"] },
      scoreSummary: { riskScore: 34, entryScores: { currentEntry: { score: 42, label: "현재가 조건부", explanation: "추세 유지" }, pullbackEntry: { score: 58, label: "눌림 관심", explanation: "220 지지" }, breakoutEntry: { score: 48, label: "돌파 확인", explanation: "240 돌파" } } },
      priceRoles: { current: { priceZone: "230 부근" }, pivot: { priceZone: "240 부근" }, pullbackEntry: { priceZone: "220 부근" }, breakoutEntry: { priceZone: "240 부근" }, targets: { pullbackTargets: ["270 부근"], breakoutTargets: ["270 부근"] } },
      tradePlan: {
        stopLoss: { priceZone: "220 부근", condition: "220 이탈", meaning: "추세 약화", shortTerm: { priceZone: "220 부근", condition: "220 이탈", meaning: "단기 손절" } },
        stopLossByEntry: { currentEntry: { priceZone: "220 부근", condition: "220 이탈", explanation: "추세 약화" }, pullbackEntry: { priceZone: "220 부근", condition: "220 이탈", explanation: "눌림 실패" } },
        targets: { firstTarget: { priceZone: "270 부근", action: "1차 목표" }, pullbackTargets: { firstTarget: { priceZone: "270 부근", action: "눌림 목표" } }, breakoutTargets: { firstTarget: { priceZone: "270 부근", action: "돌파 목표" } } },
      },
      indicatorAnalysis: { confirmed: [{ name: "MACD", signal: "buy", explanation: "MACD 상승 추세 유지" }, { name: "RSI", signal: "neutral", explanation: "RSI 62로 과열 전" }] },
      evidence: { positive: ["상승 추세 유지, 모멘텀 우호, 거래량 확인"], negative: [], riskFactors: ["220 이탈 주의"] },
    }),
    check: (report, vm) => [
      expect(["uptrend_continuation", "controlled_uptrend_entry"].includes(vm.reportDecision.trendOpportunity), "uptrend evidence should create trendOpportunity"),
      expect((vm.reportDecision.entryStrategies.current.score ?? 0) >= 50, "uptrend continuation should keep current display score at least 50"),
      expect(Math.max(vm.reportDecision.entryStrategies.current.score ?? 0, vm.reportDecision.entryStrategies.pullback.score ?? 0, vm.reportDecision.entryStrategies.breakout.score ?? 0) >= 45, "uptrend continuation entries must not all stay below 45"),
    ],
  },
  {
    name: "ReportDecision overheated uptrend blocks aggressive strategy",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "150 부근", keyPivotPrice: "155 부근", mainSupports: ["125 부근"], mainResistances: ["151 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "overheated_breakout", priceLocation: "overextended", isExtendedMove: true, nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 62, entryScores: { currentEntry: { score: 66, label: "현재가 분할 진입", explanation: "raw aggressive" }, pullbackEntry: { score: 55, label: "눌림 대기", explanation: "wait" }, breakoutEntry: { score: 58, label: "돌파 확인", explanation: "wait" } } },
      priceRoles: { current: { priceZone: "150 부근" }, pivot: { priceZone: "155 부근" }, pullbackEntry: { priceZone: "125 부근" }, breakoutEntry: { priceZone: "155 부근" }, targets: { breakoutTargets: ["151 부근"] } },
      indicatorAnalysis: { confirmed: [{ name: "RSI", signal: "caution", explanation: "RSI 81 과열" }] },
      evidence: { positive: ["상승 모멘텀"], negative: ["RSI 81 과열, 목표 여유 낮음"], riskFactors: ["추격매수 주의"] },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.trendOpportunity === "none", "overheated RSI should block trendOpportunity"),
      expect(!/현재가 분할진입 가능|현재가 소액 진입 가능|상승 지속 매수 후보/.test(vm.reportDecision.primaryStrategy.title), "overheated uptrend must not show aggressive primary strategy"),
    ],
  },
  {
    name: "ReportDecision failed breakout state blocks bullish label",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "444 부근", keyPivotPrice: "450 부근", mainSupports: ["430 부근"], mainResistances: ["450 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 56, entryScores: { currentEntry: { score: 55, label: "현재가 조건부", explanation: "raw" }, pullbackEntry: { score: 52, label: "눌림 관심", explanation: "raw" }, breakoutEntry: { score: 64, label: "돌파 확인", explanation: "raw" } } },
      priceRoles: { current: { priceZone: "444 부근" }, pivot: { priceZone: "450 부근" }, breakoutEntry: { priceZone: "450 부근" }, pullbackEntry: { priceZone: "430 부근" }, targets: { breakoutTargets: ["475 부근"] } },
      tradePlan: { entry: { breakoutEntry: { priceZone: "450 부근", condition: "450 회복 후 안착", action: "재확인" } }, stopLossByEntry: { currentEntry: { priceZone: "430 부근", condition: "430 이탈", explanation: "손절" }, breakoutEntry: { priceZone: "450 부근", condition: "450 재이탈", explanation: "돌파 실패" } } },
      evidence: { positive: [], negative: ["450 돌파 실패 후 재이탈, failed breakout"], riskFactors: ["회복 전 신규 진입 신중"] },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.breakoutState === "failed_breakout", "failed breakout evidence below level should be failed_breakout"),
      expect((vm.reportDecision.entryStrategies.current.score ?? 0) <= 35, "failed breakout should cap current display score"),
      expect(/돌파 실패|신규 진입 신중/.test(vm.reportDecision.primaryStrategy.title), "failed breakout should use defensive title"),
      expect(!/매수 우세|현재가 진입 유리|현재가 분할/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "failed breakout must not show bullish entry label"),
    ],
  },
  {
    name: "ReportDecision range lower support invariant",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "96 부근", keyPivotPrice: "110 부근", mainSupports: ["95 부근"], mainResistances: ["110 부근"] },
      marketContext: { chartRegime: "range_lower_support", priceLocation: "lower_range", rangePosition: 0.15, nearSupport: true, nearResistance: false },
      scoreSummary: { riskScore: 46, entryScores: { currentEntry: { score: 50, label: "현재가 확인 필요", explanation: "range lower" }, pullbackEntry: { score: 66, label: "지지 확인 시 관심", explanation: "support reaction" }, breakoutEntry: { score: 45, label: "돌파 대기", explanation: "not ready" } } },
      evidence: { positive: ["range sideways box lower support"], negative: [], riskFactors: ["지지 확인 필요"] },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.chartRegime === "range_lower_support", "ReportDecision should keep range_lower_support"),
      expect(/지지|눌림|확인|관심/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "range lower support should focus support reaction"),
      expect(!/강력 매수|무조건 매수|매수 우세/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "range lower support must not become strong buy without confirmation"),
    ],
  },
  {
    name: "ReportDecision support breakdown invariant",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "88 부근", keyPivotPrice: "100 부근", mainSupports: ["90 부근"], mainResistances: ["100 부근"] },
      marketContext: { chartRegime: "support_breakdown", priceLocation: "lower_range", nearSupport: false, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 78, entryScores: { currentEntry: { score: 76, label: "현재가 분할 진입", explanation: "bad raw" }, pullbackEntry: { score: 52, label: "눌림목 후보", explanation: "bad raw" }, breakoutEntry: { score: 45, label: "돌파 대기", explanation: "bad raw" } } },
      priceRoles: { current: { priceZone: "88 부근" }, pivot: { priceZone: "100 부근" }, pullbackEntry: { priceZone: "90 부근" }, stopLoss: { shortTerm: "90 부근", conservative: "85 부근", invalidation: "80 부근" }, targets: { breakoutTargets: ["100 부근"] } },
      tradePlan: {
        stopLoss: { priceZone: "90 부근", condition: "90 이탈", meaning: "지지 이탈", shortTerm: { priceZone: "90 부근", condition: "90 이탈", meaning: "단기 손절" } },
        stopLossByEntry: { currentEntry: { priceZone: "90 부근", condition: "90 이탈", explanation: "지지선 이탈" } },
        riskRewardByEntry: { current: riskReward(0.5), pullback: riskReward(0.7), breakout: riskReward(0.8) },
      },
      evidence: { negative: ["support breakdown 주요 지지 이탈"], riskFactors: ["위험 높음"] },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.chartRegime === "support_breakdown", "ReportDecision should keep support_breakdown"),
      expect(vm.reportDecision.finalActionTone === "risk", "support breakdown should use risk tone"),
      expect((vm.reportDecision.entryStrategies.current.score ?? 0) <= 30, "support breakdown should cap current display score defensively"),
      expect(!/분할 진입 가능|소액 진입 가능|현재가 분할/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`), "support breakdown must forbid current partial entry"),
    ],
  },
  {
    name: "ReportDecision separates new-entry and holder guidance",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "137 부근", keyPivotPrice: "140 부근", mainSupports: ["135 부근"], mainResistances: ["140 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 54, entryScores: { currentEntry: { score: 35, label: "추격 주의", explanation: "저항권 근접" }, pullbackEntry: { score: 70, label: "미래 눌림목 관심", explanation: "지지 확인 필요" }, breakoutEntry: { score: 62, label: "돌파 확인", explanation: "140 안착 확인" } } },
      priceRoles: { current: { priceZone: "137 부근" }, pivot: { priceZone: "140 부근" }, pullbackEntry: { priceZone: "135 부근" }, targets: { breakoutTargets: ["145 부근"] } },
      userActionGuide: {
        nonHolder: "신규 진입은 돌파 확인 전까지 신중합니다.",
        holder: "보유자는 135 이탈 여부를 보며 비중 축소를 검토합니다.",
      },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      const primaryText = `${decision.primaryStrategy.title} ${decision.primaryStrategy.summary}`;
      return [
        expect(typeof decision.newEntryDecision === "string" && decision.newEntryDecision.length > 0, "ReportDecision should expose newEntryDecision"),
        expect(typeof decision.holderDecision === "string" && decision.holderDecision.length > 0, "ReportDecision should expose holderDecision"),
        expect(decision.newEntryDecision !== decision.holderDecision, "new-entry and holder guidance must stay separated"),
        expect(!/일부 익절|수익 실현|비중 축소/.test(primaryText), "holder-only profit/trim wording must not become primary new-entry strategy"),
        expect(/돌파|재지지|지지|확인|신중/.test(`${decision.newEntryDecision} ${decision.mustConfirmCondition}`), "new-entry guidance should require confirmation near resistance"),
      ];
    },
  },
  {
    name: "ReportDecision low confidence softens new-entry guidance",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "가격 확인 필요", keyPivotPrice: "", mainSupports: [], mainResistances: [], priceUnitConfidence: "low" },
      chartRegime: { type: "unknown", confidence: "low", reasons: ["가격 역할 확인 필요"] },
      marketContext: { chartRegime: "unknown", priceLocation: "middle_range", nearSupport: false, nearResistance: false, chartRegimeConfidence: "low" },
      finalSummary: { finalAction: "WATCH", title: "조건부 관심", oneLineConclusion: "추가 확인 필요", confidence: "low", reason: "이미지 정보가 불완전합니다." },
      scoreSummary: { riskScore: 52, entryScores: { currentEntry: { score: 35, label: "확인 필요", explanation: "가격 역할 불명확" }, pullbackEntry: { score: 40, label: "확인 필요", explanation: "지지 확인 필요" }, breakoutEntry: { score: 40, label: "확인 필요", explanation: "돌파 기준 확인 필요" } } },
      priceRoles: { current: { priceZone: "가격 확인 필요" }, pivot: { priceZone: "확인 필요" }, targets: { breakoutTargets: [] } },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      const text = `${decision.primaryStrategy.title} ${decision.primaryStrategy.summary} ${decision.newEntryDecision} ${decision.mustConfirmCondition}`;
      return [
        expect(/확인|신중|보류/.test(text), "low confidence should soften final display wording"),
        expect(!/강력 매수|무조건 매수|확정 매수|적극 매수|매수 우세/.test(text), "low confidence must not expose aggressive buy wording"),
        expect(decision.mustNotTradeReason ? /신뢰도|확인|불명확/.test(decision.mustNotTradeReason) : true, "low confidence should explain why confirmation is needed"),
      ];
    },
  },
  {
    name: "ReportDecision Phase3 incomplete scenario caps score",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "100 부근", keyPivotPrice: "110 부근", mainSupports: ["확인 필요"], mainResistances: ["110 부근"], priceUnitConfidence: "low" },
      marketContext: { chartRegime: "unknown", priceLocation: "middle_range", nearSupport: false, nearResistance: false, chartRegimeConfidence: "low" },
      scoreSummary: { riskScore: 48, entryScores: { currentEntry: { score: 82, label: "현재가 진입 유리", explanation: "raw bullish but incomplete" }, pullbackEntry: { score: 78, label: "눌림목 관심", explanation: "support unknown" }, breakoutEntry: { score: 76, label: "돌파 관심", explanation: "target unknown" } } },
      priceRoles: { current: { priceZone: "100 부근" }, pivot: { priceZone: "110 부근" }, pullbackEntry: { priceZone: "확인 필요" }, stopLoss: { shortTerm: "확인 필요", conservative: "확인 필요", invalidation: "확인 필요" }, targets: { pullbackTargets: ["확인 필요"], breakoutTargets: ["확인 필요"] } },
      tradePlan: {
        entry: {
          pullbackEntry: { priceZone: "확인 필요", condition: "확인 필요", action: "확인 필요" },
          breakoutEntry: { priceZone: "110 부근", condition: "확인 필요", action: "확인 필요" },
        },
        stopLoss: { priceZone: "확인 필요", condition: "확인 필요", meaning: "확인 필요", shortTerm: { priceZone: "확인 필요", condition: "확인 필요", meaning: "확인 필요" } },
        stopLossByEntry: {
          currentEntry: { priceZone: "확인 필요", condition: "확인 필요", explanation: "확인 필요" },
          pullbackEntry: { priceZone: "확인 필요", condition: "확인 필요", explanation: "확인 필요" },
          breakoutEntry: { priceZone: "확인 필요", condition: "확인 필요", explanation: "확인 필요" },
        },
        targets: { firstTarget: { priceZone: "확인 필요", action: "확인 필요" }, breakoutTargets: { firstTarget: { priceZone: "확인 필요", action: "확인 필요" } } },
        riskRewardByEntry: { current: riskReward(null), pullback: riskReward(null), breakout: riskReward(null) },
      },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      const warnings = [
        ...(decision.entryStrategies.current.completenessWarnings ?? []),
        ...(decision.entryStrategies.pullback.completenessWarnings ?? []),
        ...(decision.entryStrategies.breakout.completenessWarnings ?? []),
        ...(decision.consistencyWarnings ?? []),
      ].join(" ");
      return [
        expect((decision.entryStrategies.current.score ?? 0) <= 50, "incomplete current scenario should be capped to 50 or lower"),
        expect(/SCENARIO_INCOMPLETE|MISSING_CONFIRMATION|MISSING_INVALIDATION|MISSING_TARGET/.test(warnings), "incomplete scenario should expose completeness warning codes"),
        expect(!/현재가 진입 유리|매수 우세|강력 매수/.test(`${decision.displayedEntrySignal.label} ${decision.primaryStrategy.title}`), "incomplete data must not keep aggressive buy wording"),
      ];
    },
  },
  {
    name: "ReportDecision Phase3 entry scenarios expose execution fields",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "100 부근", keyPivotPrice: "115 부근", mainSupports: ["96 부근"], mainResistances: ["115 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_pullback", priceLocation: "lower_range", nearSupport: true, nearResistance: false },
      scoreSummary: { riskScore: 38, entryScores: { currentEntry: { score: 55, label: "현재가 조건부", explanation: "support intact" }, pullbackEntry: { score: 72, label: "눌림목 후보", explanation: "support reaction" }, breakoutEntry: { score: 54, label: "돌파 확인", explanation: "watch breakout" } } },
      priceRoles: { current: { priceZone: "100 부근" }, pivot: { priceZone: "115 부근" }, pullbackEntry: { priceZone: "96 부근" }, stopLoss: { shortTerm: "92 부근", conservative: "88 부근", invalidation: "85 부근" }, targets: { pullbackTargets: ["115 부근", "128 부근"], breakoutTargets: ["128 부근"] } },
      tradePlan: {
        entry: { pullbackEntry: { priceZone: "96 부근", condition: "96 지지 반응 확인", action: "눌림목 접근" }, breakoutEntry: { priceZone: "115 부근", condition: "115 돌파 후 재지지", action: "돌파 확인" } },
        stopLossByEntry: { currentEntry: { priceZone: "92 부근", condition: "92 이탈", explanation: "단기 손절" }, pullbackEntry: { priceZone: "92 부근", condition: "92 이탈", explanation: "눌림 실패" }, breakoutEntry: { priceZone: "115 부근", condition: "115 재이탈", explanation: "돌파 실패" } },
        riskRewardByEntry: { current: riskReward(1.4), pullback: riskReward(1.8), breakout: riskReward(1.3) },
      },
    }),
    check: (report, vm) => {
      const pullback = vm.reportDecision.entryStrategies.pullback;
      return [
        expect(Boolean(pullback.entryTrigger && pullback.confirmationCondition && pullback.invalidation && pullback.target1), "entry strategy should expose trigger/confirmation/invalidation/target fields"),
        expect(/지지|확인|반응/.test(`${pullback.label} ${pullback.condition} ${pullback.confirmationCondition}`), "uptrend pullback should require support reaction confirmation"),
        expect(!/일부 익절|수익 실현|비중 축소/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.primaryStrategy.summary}`), "new-entry primary strategy must not become holder-only wording"),
      ];
    },
  },
  {
    name: "ReportDecision Phase4 support breakdown caps signal score",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "88 부근", keyPivotPrice: "100 부근", mainSupports: ["90 부근"], mainResistances: ["100 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "support_breakdown", priceLocation: "lower_range", nearSupport: false, nearResistance: false },
      scoreSummary: { totalScore: 92, buyScore: 88, riskScore: 82, entryScores: { currentEntry: { score: 86, label: "현재가 진입 유리", explanation: "bad raw" }, pullbackEntry: { score: 78, label: "눌림목 관심", explanation: "bad raw" }, breakoutEntry: { score: 72, label: "돌파 관심", explanation: "bad raw" } } },
      priceRoles: { current: { priceZone: "88 부근" }, pivot: { priceZone: "100 부근" }, pullbackEntry: { priceZone: "90 부근" }, stopLoss: { shortTerm: "90 부근", conservative: "85 부근", invalidation: "80 부근" }, targets: { breakoutTargets: ["100 부근"] } },
      tradePlan: { riskRewardByEntry: { current: riskReward(0.5), pullback: riskReward(0.8), breakout: riskReward(0.7) } },
      evidence: { negative: ["support breakdown"], riskFactors: ["high risk"] },
    }),
    check: (report, vm) => {
      const summary = vm.reportDecision.signalSummary;
      const warnings = `${summary.scoreWarnings?.join(" ") ?? ""} ${(vm.reportDecision.consistencyWarnings ?? []).join(" ")}`;
      return [
        expect((summary.overallScore ?? 100) <= 49, "support breakdown displayed overall score should be capped to 49 or lower"),
        expect(/SCORE_CAPPED_BY_STATE/.test(warnings), "support breakdown high raw score should produce SCORE_CAPPED_BY_STATE"),
        expect((vm.reportDecision.entryStrategies.current.score ?? 100) <= 30, "support breakdown current entry should stay capped"),
      ];
    },
  },
  {
    name: "ReportDecision Phase4 downtrend rebound momentum does not over-score",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "137 부근", keyPivotPrice: "140 부근", mainSupports: ["135 부근"], mainResistances: ["137 부근", "140 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "downtrend_rebound", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { totalScore: 86, buyScore: 84, riskScore: 56, entryScores: { currentEntry: { score: 70, label: "현재가 진입 유리", explanation: "momentum bounce" }, pullbackEntry: { score: 75, label: "눌림목 후보", explanation: "future" }, breakoutEntry: { score: 64, label: "돌파 확인", explanation: "140 확인" } } },
      priceRoles: { current: { priceZone: "137 부근" }, pivot: { priceZone: "140 부근" }, pullbackEntry: { priceZone: "135 부근" }, targets: { breakoutTargets: ["145 부근"] } },
      evidence: { positive: ["MACD rebound momentum"], negative: ["prior downtrend overhead resistance"], riskFactors: ["trend reversal unconfirmed"] },
    }),
    check: (report, vm) => {
      const summary = vm.reportDecision.signalSummary;
      const text = `${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`;
      return [
        expect((summary.overallScore ?? 100) <= 64, "downtrend rebound with momentum should not show high total score"),
        expect(/SCORE_CAPPED_BY_STATE|CURRENT_ENTRY_SCORE_CAPPED/.test(summary.scoreWarnings?.join(" ") ?? ""), "downtrend rebound should have state/current score cap warning"),
        expect(!/매수 우세|현재가 진입 유리|강력 매수/.test(text), "downtrend rebound must not show high-confidence immediate new-entry wording"),
      ];
    },
  },
  {
    name: "ReportDecision Phase4 overheated breakout caps signal score",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "280 부근", keyPivotPrice: "280 부근", mainSupports: ["270 부근"], mainResistances: ["280 부근", "292 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "overheated_breakout", priceLocation: "overextended", nearResistance: true, isExtendedMove: true, breakoutRetestConfirmed: false },
      scoreSummary: { totalScore: 90, buyScore: 88, riskScore: 66, entryScores: { currentEntry: { score: 82, label: "현재가 진입 유리", explanation: "raw overheated" }, pullbackEntry: { score: 72, label: "눌림목 후보", explanation: "future" }, breakoutEntry: { score: 68, label: "돌파 확인", explanation: "watch retest" } } },
      indicatorAnalysis: { confirmed: [{ name: "RSI", signal: "caution", explanation: "RSI 78 과열" }, { name: "MACD", signal: "bullish", explanation: "momentum positive" }], unavailable: [] },
      evidence: { positive: ["breakout momentum"], negative: ["overheated extended"], riskFactors: ["target near"] },
    }),
    check: (report, vm) => {
      const summary = vm.reportDecision.signalSummary;
      const text = `${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.explanation} ${vm.reportDecision.newEntryDecision ?? ""} ${vm.reportDecision.mustConfirmCondition ?? ""}`;
      return [
        expect((summary.overallScore ?? 100) <= 59, "overheated breakout displayed total should be capped unless retest confirmed"),
        expect(/SCORE_CAPPED_BY_STATE/.test(summary.scoreWarnings?.join(" ") ?? ""), "overheated breakout should produce SCORE_CAPPED_BY_STATE"),
        expect(/재지지|확인|추격|눌림/.test(text), "overheated breakout should keep retest/confirmation wording"),
      ];
    },
  },
  {
    name: "ReportDecision Phase4 low confidence caps score summary",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "가격 확인 필요", keyPivotPrice: "", mainSupports: [], mainResistances: [], priceUnitConfidence: "low" },
      chartRegime: { type: "unknown", confidence: "low", reasons: ["가격 역할 확인 필요"] },
      marketContext: { chartRegime: "unknown", priceLocation: "middle_range", nearSupport: false, nearResistance: false, chartRegimeConfidence: "low" },
      scoreSummary: { totalScore: 82, buyScore: 76, riskScore: 50, entryScores: { currentEntry: { score: 80, label: "현재가 진입 유리", explanation: "raw high but low confidence" }, pullbackEntry: { score: 76, label: "눌림목 후보", explanation: "unknown support" }, breakoutEntry: { score: 70, label: "돌파 후보", explanation: "unknown breakout" } } },
      priceRoles: { current: { priceZone: "가격 확인 필요" }, pivot: { priceZone: "확인 필요" }, targets: { breakoutTargets: [] } },
    }),
    check: (report, vm) => {
      const summary = vm.reportDecision.signalSummary;
      return [
        expect((summary.overallScore ?? 100) <= 55, "low confidence should cap displayed overall score"),
        expect((summary.dataConfidenceScore ?? 100) <= 45, "low confidence should lower dataConfidenceScore"),
        expect(/SCORE_CAPPED_BY_CONFIDENCE|SCORE_CAPPED_BY_INCOMPLETE_SCENARIO/.test(summary.scoreWarnings?.join(" ") ?? ""), "low confidence should produce score warning"),
      ];
    },
  },
  {
    name: "ReportDecision Phase4 price collapse lowers risk reward score",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "100 부근", keyPivotPrice: "105 부근", mainSupports: ["95 부근"], mainResistances: ["100 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { totalScore: 84, buyScore: 78, riskScore: 50, entryScores: { currentEntry: { score: 72, label: "현재가 진입 유리", explanation: "bad raw" }, pullbackEntry: { score: 70, label: "눌림목 관심", explanation: "future" }, breakoutEntry: { score: 65, label: "돌파 확인", explanation: "watch" } } },
      priceRoles: { current: { priceZone: "100 부근" }, pivot: { priceZone: "105 부근" }, pullbackEntry: { priceZone: "95 부근" }, targets: { breakoutTargets: ["100 부근"], pullbackTargets: ["100 부근"] } },
      tradePlan: { targets: { firstTarget: { priceZone: "100 부근", action: "1차 목표" } }, riskRewardByEntry: { current: riskReward(0.8), pullback: riskReward(1.0), breakout: riskReward(1.0) } },
    }),
    check: (report, vm) => {
      const summary = vm.reportDecision.signalSummary;
      const warnings = `${summary.scoreWarnings?.join(" ") ?? ""} ${(vm.reportDecision.consistencyWarnings ?? []).join(" ")}`;
      return [
        expect((summary.riskRewardScore ?? 100) <= 40, "target collapse should lower riskRewardScore"),
        expect(/SCORE_CAPPED_BY_PRICE_COLLAPSE|SCORE_CAPPED_BY_LOW_RR/.test(warnings), "target collapse should produce score cap warning"),
        expect((summary.overallScore ?? 100) <= 64, "target collapse near resistance should keep overall score conservative"),
      ];
    },
  },
  {
    name: "ReportDecision Phase4 breakout target overlap caps reliability",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "98 부근", keyPivotPrice: "100 부근", mainSupports: ["94 부근"], mainResistances: ["100 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "breakout_wait", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { totalScore: 78, buyScore: 72, riskScore: 45, entryScores: { currentEntry: { score: 55, label: "조건부", explanation: "near resistance" }, pullbackEntry: { score: 58, label: "지지 확인", explanation: "support" }, breakoutEntry: { score: 88, label: "돌파 진입 유리", explanation: "raw high" } } },
      priceRoles: { current: { priceZone: "98 부근" }, pivot: { priceZone: "100 부근" }, breakoutEntry: { priceZone: "100 부근" }, pullbackEntry: { priceZone: "94 부근" }, targets: { breakoutTargets: ["100 부근"] } },
      tradePlan: { targets: { firstTarget: { priceZone: "100 부근", action: "1차 목표" }, breakoutTargets: { firstTarget: { priceZone: "100 부근", action: "돌파 1차 목표" } } } },
    }),
    check: (report, vm) => {
      const summary = vm.reportDecision.signalSummary;
      const warnings = `${summary.scoreWarnings?.join(" ") ?? ""} ${(vm.reportDecision.consistencyWarnings ?? []).join(" ")}`;
      return [
        expect((summary.breakoutReliabilityScore ?? 100) <= 55, "breakout target overlap should cap breakout reliability"),
        expect(/BREAKOUT_SCORE_CAPPED|BREAKOUT_TARGET_OVERLAP/.test(warnings), "breakout target overlap should produce warning"),
      ];
    },
  },
  {
    name: "ReportDecision Phase4 valid uptrend pullback preserves useful score",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "100 부근", keyPivotPrice: "확인 필요", mainSupports: ["95 부근", "92 부근"], mainResistances: ["120 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_pullback", priceLocation: "lower_range", nearSupport: true, nearResistance: false, chartRegimeConfidence: "high" },
      finalSummary: { confidence: "high", finalAction: "PULLBACK_ENTRY", title: "상승추세 눌림", oneLineConclusion: "지지 확인 시 관심", reason: "추세와 지지가 유지됩니다." },
      scoreSummary: { totalScore: 74, buyScore: 70, riskScore: 38, entryScores: { currentEntry: { score: 55, label: "현재가 조건부", explanation: "support intact" }, pullbackEntry: { score: 76, label: "눌림목 후보", explanation: "support reaction" }, breakoutEntry: { score: 58, label: "돌파 확인", explanation: "watch" } } },
      priceRoles: { current: { priceZone: "100 부근" }, pivot: { priceZone: "확인 필요" }, pullbackEntry: { priceZone: "95 부근" }, breakoutEntry: { priceZone: "확인 필요" }, stopLoss: { shortTerm: "88 부근", conservative: "84 부근", invalidation: "80 부근" }, targets: { pullbackTargets: ["130 부근", "150 부근"], breakoutTargets: ["130 부근", "150 부근"], holderTargets: ["130 부근", "150 부근"] } },
      tradePlan: {
        entry: {
          pullbackEntry: { priceZone: "95 부근", condition: "지지 확인", action: "눌림목 대기" },
          breakoutEntry: { priceZone: "확인 필요", condition: "돌파 기준 확인", action: "돌파 확인" },
          noChaseZone: { priceZone: "120 부근", reason: "추격매수 주의" },
        },
        stopLoss: {
          priceZone: "88 부근",
          condition: "88 이탈",
          meaning: "단기 손절 기준",
          shortTerm: { priceZone: "88 부근", condition: "88 이탈", meaning: "단기 손절" },
          conservative: { priceZone: "84 부근", condition: "84 이탈", meaning: "보수적 손절" },
        },
        stopLoss: { priceZone: "36", condition: "36 이탈", meaning: "현재가 조건부 손절" },
        stopLossByEntry: {
          currentEntry: { priceZone: "88 부근", condition: "88 이탈", explanation: "현재가 조건부 접근 손절 기준" },
          pullbackEntry: { priceZone: "84 부근", condition: "84 이탈", explanation: "눌림목 실패 기준" },
          breakoutEntry: { priceZone: "확인 필요", condition: "돌파 기준 재확인", explanation: "돌파 실패 기준" },
          mediumTermInvalidation: { priceZone: "80 부근", condition: "80 이탈", explanation: "중기 무효화" },
        },
        targets: {
          firstTarget: { priceZone: "130 부근", action: "1차 목표" },
          secondTarget: { priceZone: "150 부근", action: "2차 목표" },
          pullbackTargets: {
            firstTarget: { priceZone: "130 부근", action: "눌림목 1차 목표" },
            secondTarget: { priceZone: "150 부근", action: "눌림목 2차 목표" },
          },
          breakoutTargets: {
            firstTarget: { priceZone: "130 부근", action: "돌파 1차 목표" },
            secondTarget: { priceZone: "150 부근", action: "돌파 2차 목표" },
          },
        },
        riskRewardByEntry: { current: riskReward(1.4), pullback: riskReward(1.8), breakout: riskReward(1.3) },
        transitionLevel: { priceZone: "확인 필요", explanation: "핵심 전환 가격 확인 필요" },
      },
      keyLevels: {
        supports: [
          { label: "1차 지지", priceZone: "95 부근", meaning: "주요 지지", reliability: "high" },
          { label: "2차 지지", priceZone: "92 부근", meaning: "하단 지지", reliability: "medium" },
        ],
        resistances: [
          { label: "1차 저항", priceZone: "120 부근", meaning: "상단 저항", reliability: "medium" },
        ],
      },
      evidence: { positive: ["strong uptrend support intact volume increase"], negative: [], riskFactors: ["support confirmation"] },
    }),
    check: (report, vm) => {
      const summary = vm.reportDecision.signalSummary;
      const warnings = summary.scoreWarnings?.join(" ") ?? "";
      return [
        expect((summary.overallScore ?? 0) >= 60, "valid uptrend pullback should preserve useful overall score"),
        expect((summary.riskRewardScore ?? 0) >= 55, "valid separated pullback should keep usable riskRewardScore"),
        expect(!/SCORE_CAPPED_BY_STATE|SCORE_CAPPED_BY_PRICE_COLLAPSE/.test(warnings), "clean uptrend pullback should not be over-capped by state or price collapse"),
      ];
    },
  },
  {
    name: "ReportDecision Phase4 malformed score fields stay safe",
    raw: baseReport({
      scoreSummary: { totalScore: "bad", buyScore: "oops", riskScore: "NaN", entryScores: { currentEntry: { score: "bad", label: "확인 필요", explanation: "bad score" }, pullbackEntry: { score: null, label: "확인 필요", explanation: "missing" }, breakoutEntry: { score: undefined, label: "확인 필요", explanation: "missing" } } },
      analysisMeta: { currentPriceZone: "가격 확인 필요", keyPivotPrice: "확인 필요", mainSupports: [], mainResistances: [], priceUnitConfidence: "low" },
      marketContext: { chartRegime: "unknown", chartRegimeConfidence: "low", priceLocation: "middle_range" },
    }),
    check: (report, vm) => {
      const summary = vm.reportDecision.signalSummary;
      const values = [
        summary.overallScore,
        summary.momentumScore,
        summary.breakoutScore,
        summary.riskScore,
        summary.dataConfidenceScore,
        summary.riskRewardScore,
      ].filter((value) => value !== null && value !== undefined);
      return [
        expect(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100), "malformed score fields should normalize into safe score range or null"),
        expect(typeof summary.entryPerspective === "string" && summary.entryPerspective.length > 0, "malformed score fields should still keep safe entryPerspective"),
      ];
    },
  },
  {
    name: "ReportDecision price role target current collapse uses next target",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "100 부근", keyPivotPrice: "105 부근", mainSupports: ["95 부근"], mainResistances: ["105 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_consolidation", priceLocation: "middle_range", nearResistance: false, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 42, entryScores: { currentEntry: { score: 55, label: "조건부", explanation: "target collapse fixture" }, pullbackEntry: { score: 64, label: "지지 확인", explanation: "support" }, breakoutEntry: { score: 58, label: "돌파 확인", explanation: "breakout" } } },
      priceRoles: { current: { priceZone: "100 부근" }, pivot: { priceZone: "105 부근" }, pullbackEntry: { priceZone: "95 부근" }, targets: { breakoutTargets: ["100 부근", "120 부근"], pullbackTargets: ["100 부근", "120 부근"] } },
      tradePlan: {
        targets: { firstTarget: { priceZone: "100 부근", action: "1차 목표" }, secondTarget: { priceZone: "120 부근", action: "2차 목표" }, breakoutTargets: { firstTarget: { priceZone: "100 부근", action: "돌파 1차 목표" }, secondTarget: { priceZone: "120 부근", action: "돌파 2차 목표" } } },
        stopLoss: { priceZone: "95 부근", condition: "95 이탈", meaning: "손절", shortTerm: { priceZone: "95 부근", condition: "95 이탈", meaning: "손절" } },
      },
    }),
    check: (report, vm) => {
      const warnings = (vm.reportDecision.consistencyWarnings ?? []).join(" ");
      const targetText = vm.reportDecision.priceRoles.target?.text ?? "";
      return [
        expect(/TARGET_TOO_CLOSE|PRICE_ROLE_COLLAPSE/.test(warnings), "target=current should add collapse warning code"),
        expect(!/^100/.test(targetText), "collapsed target1 must not remain normal upside target"),
        expect(targetText.length > 0, "target should move to next valid target or safe target fallback"),
      ];
    },
  },
  {
    name: "ReportDecision price role current resistance overlap downgrades current entry",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "100 부근", keyPivotPrice: "100 부근", mainSupports: ["94 부근"], mainResistances: ["100 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      scoreSummary: { riskScore: 50, entryScores: { currentEntry: { score: 62, label: "현재가 진입 유리", explanation: "raw bullish near resistance" }, pullbackEntry: { score: 70, label: "미래 눌림목 관심", explanation: "future" }, breakoutEntry: { score: 64, label: "돌파 확인", explanation: "100 돌파" } } },
      priceRoles: { current: { priceZone: "100 부근" }, pivot: { priceZone: "100 부근" }, breakoutEntry: { priceZone: "100 부근" }, pullbackEntry: { priceZone: "94 부근" }, targets: { breakoutTargets: ["112 부근"] } },
    }),
    check: (report, vm) => {
      const warnings = (vm.reportDecision.consistencyWarnings ?? []).join(" ");
      const text = `${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label} ${vm.reportDecision.displayedEntrySignal.explanation}`;
      return [
        expect(/RESISTANCE_TOO_CLOSE/.test(warnings), "current=resistance should add resistance proximity warning"),
        expect(/돌파|재지지|추격|확인|신중/.test(text), "current=resistance should show confirmation-first wording"),
        expect(!/현재가 진입 유리|매수 우세|강력 매수/.test(text), "current=resistance must not show aggressive current-entry wording"),
      ];
    },
  },
  {
    name: "ReportDecision price role breakout target overlap uses next target",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "98 부근", keyPivotPrice: "100 부근", mainSupports: ["94 부근"], mainResistances: ["100 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "breakout_wait", priceLocation: "near_resistance", nearResistance: true, breakoutRetestConfirmed: false },
      priceRoles: { current: { priceZone: "98 부근" }, pivot: { priceZone: "100 부근" }, breakoutEntry: { priceZone: "100 부근" }, pullbackEntry: { priceZone: "94 부근" }, targets: { breakoutTargets: ["100 부근", "112 부근"] } },
      tradePlan: {
        entry: { breakoutEntry: { priceZone: "100 부근", condition: "100 돌파 후 안착", action: "돌파 확인" } },
        targets: { firstTarget: { priceZone: "100 부근", action: "1차 목표" }, secondTarget: { priceZone: "112 부근", action: "2차 목표" }, breakoutTargets: { firstTarget: { priceZone: "100 부근", action: "돌파 1차 목표" }, secondTarget: { priceZone: "112 부근", action: "돌파 2차 목표" } } },
      },
    }),
    check: (report, vm) => {
      const warnings = (vm.reportDecision.consistencyWarnings ?? []).join(" ");
      const targetText = vm.reportDecision.priceRoles.target?.text ?? "";
      return [
        expect(/BREAKOUT_TARGET_OVERLAP|PRICE_ROLE_COLLAPSE/.test(warnings), "breakout=target1 should add overlap warning"),
        expect(!/^100/.test(targetText), "breakout-level target1 must not remain normal target"),
        expect(targetText.length > 0, "overlapped breakout target should move to target2 or safe fallback"),
      ];
    },
  },
  {
    name: "ReportDecision price role support stop overlap is labeled",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "100 부근", keyPivotPrice: "110 부근", mainSupports: ["90 부근"], mainResistances: ["110 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_pullback", priceLocation: "lower_range", nearSupport: true, breakoutRetestConfirmed: false },
      priceRoles: { current: { priceZone: "100 부근" }, pivot: { priceZone: "110 부근" }, pullbackEntry: { priceZone: "92 부근" }, stopLoss: { shortTerm: "90 부근", conservative: "90 부근", invalidation: "90 부근" }, targets: { breakoutTargets: ["118 부근"] } },
      tradePlan: {
        stopLoss: { priceZone: "90 부근", condition: "90 이탈", meaning: "손절", shortTerm: { priceZone: "90 부근", condition: "90 이탈", meaning: "손절" }, conservative: { priceZone: "90 부근", condition: "90 이탈", meaning: "보수 손절" } },
        invalidation: { condition: "90 이탈", meaning: "관점 약화", midTerm: { priceZone: "90 부근", condition: "90 이탈", meaning: "무효화" } },
      },
    }),
    check: (report, vm) => {
      const warnings = (vm.reportDecision.consistencyWarnings ?? []).join(" ");
      const stopStatus = vm.reportDecision.priceRoles.stopLoss?.status ?? "";
      return [
        expect(/SUPPORT_STOP_OVERLAP/.test(warnings), "support=stop should add overlap warning"),
        expect(/지지|같은 가격대|손절/.test(stopStatus), "support=stop should be labeled as an overlapping zone"),
      ];
    },
  },
  {
    name: "ReportDecision valid uptrend separated price roles stay useful",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "100 부근", keyPivotPrice: "110 부근", mainSupports: ["95 부근", "92 부근"], mainResistances: ["110 부근"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_pullback", priceLocation: "lower_range", nearSupport: true, nearResistance: false },
      priceRoles: { current: { priceZone: "100 부근" }, pivot: { priceZone: "110 부근" }, pullbackEntry: { priceZone: "95 부근" }, stopLoss: { shortTerm: "88 부근", conservative: "84 부근", invalidation: "80 부근" }, targets: { pullbackTargets: ["130 부근", "150 부근"], breakoutTargets: ["130 부근", "150 부근"], holderTargets: ["130 부근", "150 부근"] } },
      keyLevels: {
        supports: [{ label: "1차 지지", priceZone: "95 부근", meaning: "주요 지지", reliability: "medium" }],
        resistances: [{ label: "1차 저항", priceZone: "110 부근", meaning: "주요 저항", reliability: "medium" }],
      },
      tradePlan: {
        stopLoss: { priceZone: "88 부근", condition: "88 이탈", meaning: "손절", shortTerm: { priceZone: "88 부근", condition: "88 이탈", meaning: "손절" }, conservative: { priceZone: "84 부근", condition: "84 이탈", meaning: "보수 손절" } },
        invalidation: { condition: "80 이탈", meaning: "관점 약화", midTerm: { priceZone: "80 부근", condition: "80 이탈", meaning: "무효화" } },
        targets: {
          firstTarget: { priceZone: "130 부근", action: "1차 목표" },
          secondTarget: { priceZone: "150 부근", action: "2차 목표" },
          pullbackTargets: { firstTarget: { priceZone: "130 부근", action: "눌림 1차 목표" }, secondTarget: { priceZone: "150 부근", action: "눌림 2차 목표" } },
          breakoutTargets: { firstTarget: { priceZone: "130 부근", action: "돌파 1차 목표" }, secondTarget: { priceZone: "150 부근", action: "돌파 2차 목표" } },
        },
      },
      evidence: { positive: ["strong uptrend higher high higher low support intact"], negative: [], riskFactors: ["support confirmation"] },
    }),
    check: (report, vm) => {
      const warnings = (vm.reportDecision.consistencyWarnings ?? []).join(" ");
      return [
        expect(!/TARGET_NOT_ABOVE_ENTRY|SUPPORT_STOP_OVERLAP/.test(warnings), `well-separated uptrend support/stop roles should not over-merge (${warnings})`),
        expect(/^130/.test(vm.reportDecision.priceRoles.target?.text ?? ""), `valid target1 should be preserved (${vm.reportDecision.priceRoles.target?.text ?? ""})`),
      ];
    },
  },
  {
    name: "ReportDecision unparsable price roles stay safe",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "현재가 확인 필요", keyPivotPrice: "돌파 기준 확인 필요", mainSupports: ["주요 지지 확인 필요"], mainResistances: ["상단 저항 확인 필요"], priceUnitConfidence: "low" },
      marketContext: { chartRegime: "unknown", priceLocation: "middle_range", nearSupport: false, nearResistance: false },
      priceRoles: { current: { priceZone: "현재가 확인 필요" }, pivot: { priceZone: "돌파 기준 확인 필요" }, pullbackEntry: { priceZone: "주요 지지 확인 필요" }, targets: { breakoutTargets: ["추가 목표 확인 필요"] } },
      tradePlan: { stopLoss: { priceZone: "손절 기준 확인 필요", condition: "확인 필요", meaning: "확인 필요" }, targets: { firstTarget: { priceZone: "추가 목표 확인 필요", action: "확인 필요" } } },
    }),
    check: (report, vm) => {
      const roles = vm.reportDecision.priceRoles;
      const text = [
        roles.currentPrice.text,
        roles.currentPrice.status,
        roles.mainSupport.text,
        roles.mainSupport.status,
        roles.mainResistance.text,
        roles.mainResistance.status,
        roles.breakoutLevel?.text,
        roles.breakoutLevel?.status,
        roles.stopLoss?.text,
        roles.stopLoss?.status,
        roles.invalidation?.text,
        roles.invalidation?.status,
        roles.target?.text,
        roles.target?.status,
        roles.targetStatus,
      ].filter(Boolean).join(" ");
      return [
        expect(!/undefined|null|NaN|Infinity|\[object Object\]/.test(text), "unparsable prices must not leak invalid display tokens"),
        expect(/확인 필요/.test(text), "unparsable prices should keep safe fallback text"),
      ];
    },
  },
  {
    name: "Hero display uses ticker before company name",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "브로드컴", currentPriceZone: "280 부근", priceUnit: "원 기준 추정", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "AVGO", detectedName: "Broadcom", detectedMarket: "KR", currency: "KRW" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayTitle === "AVGO", "Hero title should prefer ticker over company name"),
      expect(vm.hero.stockName === "AVGO", "Legacy stockName should remain ticker-first"),
      expect(vm.hero.companyLine === "Broadcom · US", "Company line should infer US market for US-like ticker"),
      expect(vm.hero.displayCurrencyUnit === "달러 기준 추정", "US-like ticker should not keep KRW fallback when unit confidence is usable"),
    ],
  },
  {
    name: "Hero display alias maps Broadcom without ticker",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "브로드컴", currentPriceZone: "465.5 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "브로드컴", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "AVGO", "Broadcom alias should map to AVGO"),
      expect(vm.hero.displayIdentity.companyLine === "Broadcom · US", "Broadcom alias should produce Broadcom · US"),
      expect(!vm.hero.displayIdentity.companyLine.includes("UNKNOWN"), "Company line must not expose UNKNOWN"),
    ],
  },
  {
    name: "Hero display alias maps Palantir without ticker",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "팔란티어", currentPriceZone: "137 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "팔란티어", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "PLTR", "Palantir alias should map to PLTR"),
      expect(vm.hero.displayIdentity.companyLine === "Palantir · US", "Palantir alias should produce Palantir · US"),
    ],
  },
  {
    name: "Hero display alias maps Korean ServiceNow without ticker",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "서비스나우", currentPriceZone: "735 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "서비스나우", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "NOW", "ServiceNow Korean alias should map to NOW"),
      expect(vm.hero.displayIdentity.companyLine === "ServiceNow · US", "ServiceNow alias should produce ServiceNow · US"),
    ],
  },
  {
    name: "Hero display alias maps English ServiceNow without ticker",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "ServiceNow", currentPriceZone: "735 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "ServiceNow", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "NOW", "ServiceNow English alias should map to NOW"),
      expect(vm.hero.displayIdentity.companyLine === "ServiceNow · US", "ServiceNow English alias should produce ServiceNow · US"),
    ],
  },
  {
    name: "Hero display alias maps Korean CoreWeave without ticker",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "코어위브", currentPriceZone: "68 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "코어위브", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "CRWV", "CoreWeave Korean alias should map to CRWV"),
      expect(vm.hero.displayIdentity.companyLine === "CoreWeave · US", "CoreWeave alias should produce CoreWeave · US"),
    ],
  },
  {
    name: "Hero display alias maps English CoreWeave without ticker",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "CoreWeave", currentPriceZone: "68 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "CoreWeave", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "CRWV", "CoreWeave English alias should map to CRWV"),
      expect(vm.hero.displayIdentity.companyLine === "CoreWeave · US", "CoreWeave English alias should produce CoreWeave · US"),
    ],
  },
  {
    name: "Hero display structured ticker wins over alias",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "서비스나우", currentPriceZone: "735 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "NOW", detectedName: "서비스나우", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "NOW", "Structured ticker should win over alias fallback"),
      expect(vm.hero.displayIdentity.companyLine === "ServiceNow · US", "Structured NOW should keep a safe company line"),
    ],
  },
  {
    name: "Hero display alias maps Credo long company",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "크리드 테크놀로지 그룹 홀딩", currentPriceZone: "88 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "크리드 테크놀로지 그룹 홀딩", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "CRDO", "Credo alias should map to CRDO"),
      expect(vm.hero.displayIdentity.companyLine === "Credo Technology · US", "Credo alias should produce Credo Technology · US"),
    ],
  },
  {
    name: "Hero display keeps QQQ safe",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "QQQ", currentPriceZone: "465.91 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "-", detectedMarket: "KR", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "QQQ", "QQQ symbol should stay as ticker"),
      expect(vm.hero.displayIdentity.companyLine === "QQQ · US", "QQQ company line should infer US"),
      expect(!vm.hero.displayIdentity.companyLine.includes("- · KR"), "QQQ company line must not show broken KR separator"),
    ],
  },
  {
    name: "Hero display keeps valid AAPL symbol",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "AAPL", currentPriceZone: "280 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "Apple", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "AAPL", "AAPL symbol should stay as Hero title"),
      expect(vm.hero.displayIdentity.companyLine === "Apple · US", "AAPL should infer Apple · US through alias/company line"),
    ],
  },
  {
    name: "Hero display supports Korean numeric code",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "삼성전자", currentPriceZone: "70,000 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "005930", detectedName: "삼성전자", detectedMarket: "US", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayTitle === "005930", "Korean numeric stock code should be the Hero title"),
      expect(vm.hero.companyLine === "삼성전자 · KR", "Korean numeric code should infer KR market"),
      expect(vm.hero.displayIdentity.marketLabel === "KR", "Korean numeric code should expose KR marketLabel"),
      expect(vm.hero.displayCurrencyUnit === "원 기준 추정", "Korean numeric code should use KRW-style unit note when confidence is usable"),
    ],
  },
  {
    name: "Hero display alias maps Samsung Electronics name only",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "삼성전자", currentPriceZone: "70,000 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "삼성전자", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "005930", "Samsung Electronics alias should map to 005930"),
      expect(vm.hero.displayIdentity.companyLine === "삼성전자 · KR", "Samsung Electronics alias should produce 삼성전자 · KR"),
      expect(vm.hero.displayIdentity.currencyUnitLabel === "원 기준 추정", "Samsung Electronics alias should use KR unit note"),
    ],
  },
  {
    name: "Hero company line avoids empty separators",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "LITE", currentPriceZone: "55 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "LITE", detectedName: "-", detectedMarket: "US", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.companyLine === "LITE · US", "Missing company name should fall back to ticker plus market"),
      expect(!vm.hero.companyLine.includes("- ·"), "Company line must not render placeholder separator"),
      expect(!vm.hero.companyLine.includes("undefined") && !vm.hero.companyLine.includes("null"), "Company line must not expose invalid tokens"),
    ],
  },
  {
    name: "Hero current price keeps full large number",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "005930", currentPriceZone: "625,266 부근", priceUnit: "원 기준 추정", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "005930", detectedName: "삼성전자", detectedMarket: "KR", currency: "KRW" },
        priceAxisObservations: { currentPriceEstimate: { value: 627000, confidence: "medium" } },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.currentPrice === "627,000", "Hero current price should keep the full formatted number"),
      expect(!vm.hero.currentPrice.includes("..."), "Hero current price must not be ellipsized in data"),
    ],
  },
  {
    name: "Hero current price formats six digit estimate",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "LITE", currentPriceZone: "465,916 부근", priceUnit: "", priceUnitConfidence: "medium" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "LITE", detectedName: "Lumentum", detectedMarket: "US", currency: "" },
        priceAxisObservations: { currentPriceEstimate: { value: 465916, confidence: "medium" } },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.priceText === "465,916", "Hero display identity should format 465916 as 465,916"),
      expect(!vm.hero.displayIdentity.priceText.includes("..."), "Hero display identity price must not be ellipsized"),
    ],
  },
  {
    name: "Hero unknown identity uses safe fallback",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "", currentPriceZone: "", priceUnit: "", priceUnitConfidence: "low" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "", detectedName: "알 수 없는 긴 회사명", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "티커 필요", "Unknown identity should use safe ticker fallback"),
      expect(vm.hero.displayIdentity.marketLabel === "시장 확인 필요", "Unknown market should use safe market fallback"),
      expect(vm.hero.displayIdentity.companyLine === "알 수 없는 긴 회사명 · 시장 확인 필요", "Unknown identity may show company name but must keep market uncertain"),
      expect(!vm.hero.displayIdentity.ticker.includes("..."), "Unknown title fallback must not be ellipsized"),
      expect(!/UNKNOWN|- · KR|- · US|undefined|null/.test(vm.hero.displayIdentity.companyLine), "Unknown identity company line must remain safe"),
    ],
  },
  {
    name: "Hero unknown long English company does not become ticker",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "", currentPriceZone: "102 부근", priceUnit: "", priceUnitConfidence: "low" },
    }), {
      aiAnalysis: {
        symbolDetection: {
          detectedTicker: "",
          detectedName: "Unknown Long Company Holdings Incorporated",
          detectedMarket: "UNKNOWN",
          currency: "",
        },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "티커 필요", "Unknown long company name should not become Hero ticker"),
      expect(!/UNKNOWN|LONG|COMPANY|HOLDINGS|INCORPORATED/.test(vm.hero.displayIdentity.ticker), "Hero title must not extract arbitrary words as ticker"),
      expect(/^Unknown Long Company Holdings/.test(vm.hero.displayIdentity.companyLine) && vm.hero.displayIdentity.companyLine.endsWith("시장 확인 필요"), "Unknown English company may show company name with uncertain market"),
      expect(!vm.hero.displayIdentity.ticker.includes("..."), "Hero title must not be ellipsized"),
      expect(!/UNKNOWN|- · KR|- · US|undefined|null/.test(vm.hero.displayIdentity.companyLine), "Unknown English company line must remain safe"),
    ],
  },
  {
    name: "Hero unresolved known company does not trust mismatched KR market",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "", currentPriceZone: "180 부근", priceUnit: "", priceUnitConfidence: "low" },
    }), {
      aiAnalysis: {
        symbolDetection: {
          detectedTicker: "",
          detectedName: "엔비디아",
          detectedMarket: "KR",
          currency: "",
        },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "NVDA", "NVIDIA alias should resolve to NVDA before fallback market handling"),
      expect(vm.hero.displayIdentity.companyLine === "NVIDIA · US", "NVIDIA alias must not display 엔비디아 · KR"),
      expect(!/엔비디아 · KR/.test(vm.hero.displayIdentity.companyLine), "Unresolved/mismatched market must not show 엔비디아 · KR"),
    ],
  },
  {
    name: "Hero malformed identity uses safe fallback",
    raw: mergeDeep(baseReport({
      analysisMeta: { symbol: "-", currentPriceZone: "", priceUnit: "", priceUnitConfidence: "low" },
    }), {
      aiAnalysis: {
        symbolDetection: { detectedTicker: "-", detectedName: "", detectedMarket: "UNKNOWN", currency: "" },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.displayIdentity.ticker === "티커 필요", "Malformed symbol should use safe title fallback"),
      expect(vm.hero.displayIdentity.companyLine === "종목명을 확인해 주세요", "Malformed identity should use safe company fallback line"),
      expect(!/UNKNOWN|- · KR|- · US|undefined|null/.test(vm.hero.displayIdentity.companyLine), "Malformed identity company line must not expose invalid tokens"),
    ],
  },
  {
    name: "Hero target fallback is user friendly",
    raw: baseReport({
      analysisMeta: { currentPriceZone: "280 부근", keyPivotPrice: "280 부근", mainSupports: ["274 부근"], mainResistances: ["280 부근"] },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true },
      priceRoles: {
        current: { priceZone: "280 부근" },
        pivot: { priceZone: "280 부근" },
        pullbackEntry: { priceZone: "274 부근" },
        targets: { pullbackTargets: ["280 부근"], breakoutTargets: ["280 부근"] },
      },
      tradePlan: {
        targets: { firstTarget: { priceZone: "280 부근", action: "기존 목표" } },
      },
    }),
    check: (report, vm) => [
      expect(vm.reportDecision.priceRoles.targetStatus !== "상단 목표 확인", "Target status must not use vague upper-target text"),
      expect(/목표가 근접|목표 여유 낮음|추가 목표|상승 여지 제한|상단 저항/.test(`${vm.reportDecision.priceRoles.target?.text} ${vm.reportDecision.priceRoles.targetStatus}`), "Collapsed target should show a user-friendly target status"),
    ],
  },
  {
    name: "Hero final signal does not expose internal wording",
    raw: baseReport({
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearResistance: true },
      scoreSummary: {
        riskScore: 55,
        entryScores: {
          currentEntry: { score: 35, label: "추격 주의", explanation: "near resistance" },
          pullbackEntry: { score: 88, label: "눌림목 진입 우세", explanation: "future setup" },
          breakoutEntry: { score: 55, label: "돌파 확인 필요", explanation: "wait" },
        },
      },
    }),
    check: (report, vm) => {
      const text = [
        vm.reportDecision.displayedEntrySignal.explanation,
        vm.reportDecision.primaryStrategy.summary,
        vm.finalAction.subtitle,
        vm.scorePanel.entryScoreExplanation,
      ].join(" ");
      return [
        expect(!/최종 판단이 주의|즉시 진입 우선 레이블|표시하지 않습니다/.test(text), "Final signal text must not expose internal developer wording"),
      ];
    },
  },
  {
    name: "Phase6.5 PLTR-like invalid support stop is rechecked",
    raw: baseReport({
      analysisMeta: {
        symbol: "PLTR",
        currentPriceZone: "148",
        keyPivotPrice: "160",
        mainSupports: ["149"],
        mainResistances: ["160"],
        priceUnitConfidence: "medium",
      },
      marketContext: {
        chartRegime: "resistance_test",
        priceLocation: "near_resistance",
        nearResistance: true,
        breakoutRetestConfirmed: false,
        chartRegimeConfidence: "medium",
      },
      scoreSummary: {
        totalScore: 42,
        buyScore: 48,
        riskScore: 58,
        entryScores: {
          currentEntry: { score: 44, label: "현재가 조건부", explanation: "support/stop role ordering fixture" },
          pullbackEntry: { score: 55, label: "눌림목 관심", explanation: "future support confirmation" },
          breakoutEntry: { score: 62, label: "돌파 확인", explanation: "160 retest needed" },
        },
      },
      priceRoles: {
        current: { priceZone: "148" },
        pivot: { priceZone: "160" },
        pullbackEntry: { priceZone: "149" },
        stopLoss: { shortTerm: "149", conservative: "149", invalidation: "149" },
        targets: { breakoutTargets: ["162", "170"], holderTargets: ["162", "170"] },
      },
      keyLevels: {
        supports: [],
        resistances: [{ label: "저항", priceZone: "160", meaning: "breakout level", reliability: "medium" }],
      },
      tradePlan: {
        entry: {
          pullbackEntry: { priceZone: "149", condition: "149 지지 확인", action: "조건부" },
          breakoutEntry: { priceZone: "160", condition: "160 돌파 후 재지지", action: "돌파 확인" },
        },
        stopLoss: {
          priceZone: "149",
          condition: "149 이탈",
          meaning: "raw invalid stop",
          shortTerm: { priceZone: "149", condition: "149 이탈", meaning: "raw invalid stop" },
          conservative: { priceZone: "149", condition: "149 이탈", meaning: "raw invalid stop" },
        },
        stopLossByEntry: {
          currentEntry: { priceZone: "149", condition: "149 이탈", explanation: "raw invalid current stop" },
          pullbackEntry: { priceZone: "149", condition: "149 이탈", explanation: "raw invalid pullback stop" },
          breakoutEntry: { priceZone: "160", condition: "160 재이탈", explanation: "breakout failure" },
        },
        invalidation: {
          condition: "149 이탈",
          meaning: "raw invalid invalidation",
          midTerm: { priceZone: "149", condition: "149 이탈", meaning: "raw invalid invalidation" },
        },
        targets: {
          firstTarget: { priceZone: "162", action: "1차 목표" },
          secondTarget: { priceZone: "170", action: "2차 목표" },
          breakoutTargets: {
            firstTarget: { priceZone: "162", action: "1차 목표" },
            secondTarget: { priceZone: "170", action: "2차 목표" },
          },
        },
        riskRewardByEntry: { current: riskReward(0.8), pullback: riskReward(1.1), breakout: riskReward(1.4) },
      },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      const warnings = (decision.consistencyWarnings ?? []).join(" ");
      const current = decision.entryStrategies.current;
      const currentText = `${current.label} ${current.condition} ${current.stop} ${current.explanation}`;
      return [
        expect(/SUPPORT_ABOVE_CURRENT/.test(warnings), "support above current should add SUPPORT_ABOVE_CURRENT warning"),
        expect(/INVALID_LONG_STOP/.test(warnings), "stop above current should add INVALID_LONG_STOP warning"),
        expect(/LONG_STOP_RECHECK_REQUIRED/.test(warnings), "missing lower stop should require long stop recheck"),
        expect(decision.priceRoles.mainSupport.value === null || decision.priceRoles.mainSupport.value < 148, "mainSupport must not remain above current"),
        expect(decision.priceRoles.stopLoss?.value === null || (decision.priceRoles.stopLoss?.value ?? 999) < 148, "stopLoss must not remain above current"),
        expect((current.score ?? 100) <= 30, "invalid current long stop should cap current entry score to 30 or lower"),
        expect(current.isComplete === false, "invalid current long stop should mark current scenario incomplete"),
        expect(/재평가|보류|확인|recheck|invalid/i.test(currentText), "current entry should communicate recheck/hold/confirmation"),
        expect(!/^149/.test(current.stop), "current entry stop must not keep 149 as a normal stop"),
      ];
    },
  },
  {
    name: "Phase6.5 readable risky chart confidence is not signal score",
    raw: baseReport({
      analysisMeta: {
        symbol: "TEST",
        currentPriceZone: "88",
        keyPivotPrice: "100",
        mainSupports: ["82"],
        mainResistances: ["100"],
        priceUnitConfidence: "medium",
      },
      marketContext: {
        chartRegime: "support_breakdown",
        priceLocation: "lower_range",
        nearSupport: false,
        nearResistance: false,
        chartRegimeConfidence: "medium",
      },
      finalSummary: { confidence: "medium", finalAction: "WAIT", title: "위험 관리", oneLineConclusion: "risk fixture", reason: "readable chart but low trade score" },
      scoreSummary: {
        totalScore: 5,
        buyScore: 8,
        riskScore: 84,
        entryScores: {
          currentEntry: { score: 5, label: "신규 진입 보류", explanation: "risk" },
          pullbackEntry: { score: 10, label: "지지 회복 확인", explanation: "risk" },
          breakoutEntry: { score: 12, label: "돌파 확인", explanation: "risk" },
        },
      },
      priceRoles: {
        current: { priceZone: "88" },
        pivot: { priceZone: "100" },
        pullbackEntry: { priceZone: "82" },
        targets: { breakoutTargets: ["100"] },
      },
      tradePlan: {
        stopLoss: { priceZone: "82", condition: "82 이탈", meaning: "risk" },
        stopLossByEntry: { currentEntry: { priceZone: "82", condition: "82 이탈", explanation: "risk" } },
      },
    }),
    check: (report, vm) => [
      expect(vm.hero.confidenceScore >= 55, `readable chart confidence should not collapse to signal score (${vm.hero.confidenceScore})`),
      expect(vm.scorePanel.overallScore === 5 || (vm.scorePanel.overallScore ?? 100) <= 49, "signal score should remain separate and conservative"),
    ],
  },
  {
    name: "Phase6.5 resistance retest low raw current score is floored",
    raw: baseReport({
      analysisMeta: {
        symbol: "PLTR",
        currentPriceZone: "137",
        keyPivotPrice: "140",
        mainSupports: ["135"],
        mainResistances: ["140"],
        priceUnitConfidence: "medium",
      },
      marketContext: {
        chartRegime: "resistance_test",
        priceLocation: "near_resistance",
        nearResistance: true,
        breakoutRetestConfirmed: false,
        chartRegimeConfidence: "medium",
      },
      scoreSummary: {
        totalScore: 48,
        buyScore: 45,
        riskScore: 52,
        entryScores: {
          currentEntry: { score: 5, label: "현재가 진입 불리", explanation: "raw too low but not breakdown" },
          pullbackEntry: { score: 58, label: "미래 눌림목 관심", explanation: "future" },
          breakoutEntry: { score: 60, label: "돌파 확인", explanation: "140 confirmation" },
        },
      },
      priceRoles: {
        current: { priceZone: "137" },
        pivot: { priceZone: "140" },
        pullbackEntry: { priceZone: "135" },
        targets: { breakoutTargets: ["145"] },
      },
      tradePlan: {
        stopLoss: { priceZone: "135", condition: "135 이탈", meaning: "short stop" },
        stopLossByEntry: { currentEntry: { priceZone: "135", condition: "135 이탈", explanation: "short stop" } },
        targets: { firstTarget: { priceZone: "145", action: "target" } },
        riskRewardByEntry: { current: riskReward(1.2), pullback: riskReward(1.5), breakout: riskReward(1.3) },
      },
    }),
    check: (report, vm) => {
      const score = vm.reportDecision.entryStrategies.current.score ?? 0;
      const text = `${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label} ${vm.reportDecision.displayedEntrySignal.explanation}`;
      return [
        expect(score >= 20 && score <= 40, `resistance retest current score should be confirmation-first 20~40 (${score})`),
        expect(/돌파|재지지|확인|주의|신중/.test(text), "resistance retest should remain confirmation-first"),
        expect(!/매수 우세|강력 매수|현재가 진입 유리/.test(text), "resistance retest must not show aggressive buy wording"),
      ];
    },
  },
  {
    name: "Phase6.6 uptrend pullback allows conditional support entry",
    raw: baseReport({
      analysisMeta: {
        symbol: "TEST",
        currentPriceZone: "105",
        keyPivotPrice: "118",
        mainSupports: ["101", "98"],
        mainResistances: ["118", "128"],
        priceUnitConfidence: "medium",
      },
      marketContext: {
        chartRegime: "uptrend_pullback",
        priceLocation: "near_support",
        nearSupport: true,
        nearResistance: false,
        chartRegimeConfidence: "medium",
      },
      chartRegime: { type: "uptrend_pullback", confidence: "medium", reasons: ["strong uptrend pullback near support"] },
      scoreSummary: {
        totalScore: 35,
        buyScore: 42,
        riskScore: 38,
        entryScores: {
          currentEntry: { score: 44, label: "현재가 조건부", explanation: "support intact" },
          pullbackEntry: { score: 45, label: "눌림목 확인", explanation: "support reaction" },
          breakoutEntry: { score: 40, label: "돌파 확인", explanation: "watch" },
        },
      },
      priceRoles: {
        current: { priceZone: "105" },
        pivot: { priceZone: "118" },
        pullbackEntry: { priceZone: "101" },
        stopLoss: { shortTerm: "98", conservative: "94", invalidation: "92" },
        targets: { pullbackTargets: ["118", "128"], breakoutTargets: ["128"] },
      },
      evidence: { positive: ["strong uptrend higher high higher low support reaction"], negative: [], riskFactors: ["support confirmation"] },
      tradePlan: {
        entry: {
          pullbackEntry: { priceZone: "101", condition: "101 지지 반응 확인", action: "분할 접근" },
          breakoutEntry: { priceZone: "118", condition: "118 돌파 후 재지지", action: "돌파 확인" },
        },
        stopLossByEntry: {
          currentEntry: { priceZone: "98", condition: "98 이탈", explanation: "단기 손절" },
          pullbackEntry: { priceZone: "98", condition: "98 이탈", explanation: "눌림 실패" },
          breakoutEntry: { priceZone: "118", condition: "118 재이탈", explanation: "돌파 실패" },
        },
        targets: { firstTarget: { priceZone: "118" }, secondTarget: { priceZone: "128" } },
        riskRewardByEntry: { current: riskReward(1.4), pullback: riskReward(1.8), breakout: riskReward(1.2) },
      },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect((decision.entryStrategies.pullback.score ?? 0) >= 70, "valid uptrend pullback should not over-cap pullback entry"),
        expect((decision.signalSummary.overallScore ?? 0) >= 55, "valid uptrend pullback should keep a usable displayed signal score"),
        expect(/지지|조건|분할|반응/.test(`${decision.newEntryDecision ?? ""} ${decision.primaryStrategy.summary}`), "new-entry guidance should allow conditional support-confirmation approach"),
        expect(!/신규 진입 보류|위험 관리 우선/.test(`${decision.primaryStrategy.title} ${decision.newEntryDecision ?? ""}`), "valid uptrend pullback should not default to entry hold/risk wording"),
      ];
    },
  },
  {
    name: "Phase6.6 range lower bounce allows support-reaction setup",
    raw: baseReport({
      analysisMeta: {
        symbol: "TEST",
        currentPriceZone: "102",
        keyPivotPrice: "112",
        mainSupports: ["100", "96"],
        mainResistances: ["112", "120"],
        priceUnitConfidence: "medium",
      },
      marketContext: {
        chartRegime: "range_lower_support",
        priceLocation: "near_support",
        nearSupport: true,
        nearResistance: false,
        chartRegimeConfidence: "medium",
      },
      scoreSummary: {
        totalScore: 30,
        buyScore: 40,
        riskScore: 42,
        entryScores: {
          currentEntry: { score: 38, label: "조건부", explanation: "range lower" },
          pullbackEntry: { score: 45, label: "지지 확인", explanation: "support bounce" },
          breakoutEntry: { score: 35, label: "돌파 확인", explanation: "watch" },
        },
      },
      priceRoles: {
        current: { priceZone: "102" },
        pivot: { priceZone: "112" },
        pullbackEntry: { priceZone: "100" },
        stopLoss: { shortTerm: "96", conservative: "94", invalidation: "92" },
        targets: { pullbackTargets: ["112", "120"], breakoutTargets: ["120"] },
      },
      tradePlan: {
        entry: { pullbackEntry: { priceZone: "100", condition: "100 지지 유지와 반등 확인", action: "조건부 접근" } },
        stopLossByEntry: {
          currentEntry: { priceZone: "96", condition: "96 이탈", explanation: "range support failure" },
          pullbackEntry: { priceZone: "96", condition: "96 이탈", explanation: "support failure" },
        },
        targets: { firstTarget: { priceZone: "112" }, secondTarget: { priceZone: "120" } },
        riskRewardByEntry: { current: riskReward(1.3), pullback: riskReward(1.7), breakout: riskReward(1.1) },
      },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect((decision.entryStrategies.pullback.score ?? 0) >= 60, "range lower support should allow support-reaction pullback score"),
        expect((decision.signalSummary.overallScore ?? 0) >= 52, "range lower support should not collapse displayed signal score"),
        expect(/지지|반응|조건|분할/.test(`${decision.newEntryDecision ?? ""} ${decision.primaryStrategy.entry}`), "range lower support should communicate support reaction approach"),
        expect(!/위험 관리 우선|신규 진입 보류/.test(`${decision.primaryStrategy.title} ${decision.displayedEntrySignal.label}`), "valid range lower bounce should not default to risk-first wording"),
      ];
    },
  },
  {
    name: "Phase6.6 resistance retest keeps breakout interest moderate",
    raw: baseReport({
      analysisMeta: {
        symbol: "TEST",
        currentPriceZone: "137",
        keyPivotPrice: "140",
        mainSupports: ["134"],
        mainResistances: ["140"],
        priceUnitConfidence: "medium",
      },
      marketContext: {
        chartRegime: "resistance_test",
        priceLocation: "near_resistance",
        nearResistance: true,
        breakoutRetestConfirmed: false,
        chartRegimeConfidence: "medium",
      },
      scoreSummary: {
        totalScore: 20,
        buyScore: 32,
        riskScore: 50,
        entryScores: {
          currentEntry: { score: 8, label: "현재가 불리", explanation: "near resistance" },
          pullbackEntry: { score: 40, label: "미래 눌림목 관심", explanation: "future" },
          breakoutEntry: { score: 5, label: "돌파 확인", explanation: "140 confirmation" },
        },
      },
      priceRoles: {
        current: { priceZone: "137" },
        pivot: { priceZone: "140" },
        pullbackEntry: { priceZone: "134" },
        stopLoss: { shortTerm: "134", conservative: "130", invalidation: "128" },
        targets: { breakoutTargets: ["148", "155"] },
      },
      tradePlan: {
        entry: { breakoutEntry: { priceZone: "140", condition: "140 돌파 후 안착 확인", action: "조건부 돌파 접근" } },
        stopLossByEntry: {
          currentEntry: { priceZone: "134", condition: "134 이탈", explanation: "short stop" },
          breakoutEntry: { priceZone: "140", condition: "140 재이탈", explanation: "breakout failure" },
        },
        targets: { firstTarget: { priceZone: "148" }, secondTarget: { priceZone: "155" } },
        riskRewardByEntry: { current: riskReward(1.0), pullback: riskReward(1.5), breakout: riskReward(1.6) },
      },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      const text = `${decision.primaryStrategy.title} ${decision.newEntryDecision ?? ""}`;
      return [
        expect((decision.entryStrategies.current.score ?? 0) >= 25 && (decision.entryStrategies.current.score ?? 0) <= 45, "resistance retest current score should be cautious but not zero"),
        expect((decision.entryStrategies.breakout.score ?? 0) >= 50 && (decision.entryStrategies.breakout.score ?? 0) <= 70, "resistance retest breakout interest should stay moderate"),
        expect(/돌파 확인|조건부|재지지|안착/.test(text), "resistance retest should use breakout/confirmation wording"),
        expect(!/위험 관리 우선|신규 진입 보류/.test(text), "resistance retest should not default to risk-first or hard entry hold without breakdown"),
      ];
    },
  },
  {
    name: "Phase6.6 downtrend rebound remains cautious but not zero",
    raw: baseReport({
      analysisMeta: {
        symbol: "TEST",
        currentPriceZone: "137",
        keyPivotPrice: "140",
        mainSupports: ["135"],
        mainResistances: ["140", "148"],
        priceUnitConfidence: "medium",
      },
      marketContext: {
        chartRegime: "downtrend_rebound",
        priceLocation: "near_resistance",
        nearResistance: true,
        breakoutRetestConfirmed: false,
        chartRegimeConfidence: "medium",
      },
      evidence: { positive: ["rebound from lower zone"], negative: ["prior strong decline downtrend overhead resistance"], riskFactors: ["trend reversal unconfirmed"] },
      scoreSummary: {
        totalScore: 18,
        buyScore: 30,
        riskScore: 56,
        entryScores: {
          currentEntry: { score: 5, label: "현재가 불리", explanation: "rebound into resistance" },
          pullbackEntry: { score: 38, label: "지지 확인", explanation: "future support" },
          breakoutEntry: { score: 5, label: "돌파 확인", explanation: "recovery needed" },
        },
      },
      priceRoles: {
        current: { priceZone: "137" },
        pivot: { priceZone: "140" },
        pullbackEntry: { priceZone: "135" },
        stopLoss: { shortTerm: "135", conservative: "132", invalidation: "130" },
        targets: { breakoutTargets: ["148", "155"] },
      },
      tradePlan: {
        entry: { breakoutEntry: { priceZone: "140", condition: "140 회복 후 재지지 확인", action: "전환 확인" } },
        stopLossByEntry: {
          currentEntry: { priceZone: "135", condition: "135 이탈", explanation: "rebound failure" },
          breakoutEntry: { priceZone: "140", condition: "140 재이탈", explanation: "failed recovery" },
        },
        targets: { firstTarget: { priceZone: "148" }, secondTarget: { priceZone: "155" } },
        riskRewardByEntry: { current: riskReward(1.0), pullback: riskReward(1.4), breakout: riskReward(1.5) },
      },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      const text = `${decision.primaryStrategy.title} ${decision.displayedEntrySignal.label} ${decision.newEntryDecision ?? ""}`;
      return [
        expect((decision.entryStrategies.current.score ?? 0) >= 15 && (decision.entryStrategies.current.score ?? 0) <= 35, "downtrend rebound current score should be cautious but not zero"),
        expect((decision.entryStrategies.breakout.score ?? 0) >= 30 && (decision.entryStrategies.breakout.score ?? 0) <= 55, "downtrend rebound breakout/recovery interest should be moderate-low"),
        expect(/저항 회복|전환|재지지|확인/.test(text), "downtrend rebound should emphasize recovery/confirmation"),
        expect(!/매수 우세|현재가 진입 유리|강력 매수|위험 관리 우선/.test(text), "downtrend rebound should not become aggressive or risk-first without breakdown"),
      ];
    },
  },
  {
    name: "Phase6.6 overheated breakout keeps retest path possible",
    raw: baseReport({
      analysisMeta: {
        symbol: "TEST",
        currentPriceZone: "280",
        keyPivotPrice: "280",
        mainSupports: ["270"],
        mainResistances: ["292"],
        priceUnitConfidence: "medium",
      },
      marketContext: {
        chartRegime: "overheated_breakout",
        priceLocation: "overextended",
        nearResistance: true,
        breakoutRetestConfirmed: false,
        chartRegimeConfidence: "medium",
      },
      scoreSummary: {
        totalScore: 28,
        buyScore: 36,
        riskScore: 64,
        entryScores: {
          currentEntry: { score: 70, label: "현재가 진입 유리", explanation: "raw overheated" },
          pullbackEntry: { score: 5, label: "눌림 확인", explanation: "wait pullback" },
          breakoutEntry: { score: 5, label: "재지지 확인", explanation: "wait retest" },
        },
      },
      priceRoles: {
        current: { priceZone: "280" },
        pivot: { priceZone: "280" },
        pullbackEntry: { priceZone: "270" },
        stopLoss: { shortTerm: "270", conservative: "265", invalidation: "260" },
        targets: { breakoutTargets: ["292", "305"] },
      },
      tradePlan: {
        entry: { pullbackEntry: { priceZone: "270", condition: "270 재지지 확인", action: "눌림 확인" } },
        stopLossByEntry: {
          currentEntry: { priceZone: "270", condition: "270 이탈", explanation: "retest failure" },
          pullbackEntry: { priceZone: "270", condition: "270 이탈", explanation: "pullback failure" },
          breakoutEntry: { priceZone: "280", condition: "280 재이탈", explanation: "breakout failure" },
        },
        targets: { firstTarget: { priceZone: "292" }, secondTarget: { priceZone: "305" } },
        riskRewardByEntry: { current: riskReward(1.0), pullback: riskReward(1.5), breakout: riskReward(1.3) },
      },
      indicatorAnalysis: { confirmed: [{ name: "RSI", signal: "caution", explanation: "RSI 76 과열" }], unavailable: [] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      const text = `${decision.primaryStrategy.title} ${decision.newEntryDecision ?? ""}`;
      return [
        expect((decision.entryStrategies.current.score ?? 100) <= 35, "overheated breakout current chase should stay low"),
        expect((decision.entryStrategies.pullback.score ?? 0) >= 45 || (decision.entryStrategies.breakout.score ?? 0) >= 45, "overheated breakout should keep pullback/retest path possible"),
        expect(/눌림|재지지|조건부|소액|확인/.test(text), "overheated breakout should communicate pullback/retest confirmation path"),
        expect(!/현재가 진입 유리|강력 매수|매수 우세/.test(text), "overheated breakout must not encourage current chase"),
      ];
    },
  },
  {
    name: "Phase7 PLTR-like bullish gap reversal attempt segmentation",
    phase7: true,
    raw: baseReport({
      analysisMeta: {
        symbol: "PLTR",
        currentPriceZone: "159.4",
        keyPivotPrice: "160",
        mainSupports: ["152", "149"],
        mainResistances: ["160", "170"],
        priceUnitConfidence: "medium",
      },
      chartRegime: { type: "downtrend_rebound", confidence: "medium", reasons: ["prior downtrend rebound into resistance"] },
      aiAnalysis: {
        priceAxisObservations: {
          currentPriceEstimate: { value: 159.4, confidence: "medium" },
          visibleSupportPrices: [{ value: 152 }, { value: 149 }],
          visibleResistancePrices: [{ value: 160 }, { value: 170 }],
        },
        symbolDetection: { detectedTicker: "PLTR", detectedName: "Palantir", detectedMarket: "US" },
      },
      marketContext: {
        chartRegime: "downtrend_rebound",
        priceLocation: "near_resistance",
        nearSupport: false,
        nearResistance: true,
        chartRegimeConfidence: "medium",
      },
      finalSummary: {
        finalAction: "WAIT_FOR_BREAKOUT",
        title: "상승 전환 시도",
        oneLineConclusion: "160 돌파와 안착 확인이 핵심",
        confidence: "medium",
        reason: "gap up bullish reversal attempt with strong volume",
      },
      scoreSummary: {
        totalScore: 58,
        buyScore: 64,
        riskScore: 52,
        entryScores: {
          currentEntry: { score: 52, label: "조건부 접근", explanation: "near resistance but momentum improving" },
          pullbackEntry: { score: 56, label: "지지 확인", explanation: "152 support needed" },
          breakoutEntry: { score: 68, label: "돌파 확인", explanation: "160 anchoring confirmation" },
        },
      },
      priceRoles: {
        current: { priceZone: "159.4" },
        pivot: { priceZone: "160" },
        pullbackEntry: { priceZone: "152" },
        stopLoss: { shortTerm: "149", conservative: "146", invalidation: "145" },
        targets: { breakoutTargets: ["170", "180"], pullbackTargets: ["170", "180"] },
      },
      tradePlan: {
        entry: {
          currentEntry: { priceZone: "159.4", condition: "160 안착 확인", action: "조건부 소액 접근" },
          pullbackEntry: { priceZone: "152", condition: "152 지지 반응 확인", action: "지지 확인" },
          breakoutEntry: { priceZone: "160", condition: "160 돌파 후 재지지", action: "돌파 확인" },
        },
        stopLossByEntry: {
          currentEntry: { priceZone: "149", condition: "149 이탈", explanation: "reversal failure" },
          pullbackEntry: { priceZone: "149", condition: "149 이탈", explanation: "support failure" },
          breakoutEntry: { priceZone: "152", condition: "152 재이탈", explanation: "breakout failure" },
        },
        targets: { firstTarget: { priceZone: "170" }, secondTarget: { priceZone: "180" } },
        riskRewardByEntry: { current: riskReward(1.2), pullback: riskReward(1.6), breakout: riskReward(1.5) },
      },
      indicatorAnalysis: {
        confirmed: [
          { name: "RSI", value: "67", signal: "neutral", explanation: "RSI 67 momentum but not extreme" },
          { name: "MACD", signal: "bullish", explanation: "MACD 개선" },
        ],
        unavailable: [],
      },
      evidence: {
        positive: ["갭 상승 strong green candle gap breakout volume expansion MACD 개선 상승 전환 시도"],
        negative: ["160 above anchoring not yet confirmed"],
        riskFactors: ["resistance test needs retest"],
      },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      const text = `${decision.primaryStrategy.title} ${decision.displayedEntrySignal.label}`;
      return [
        expect(/bullish_reversal_attempt|gap_breakout_attempt/.test(decision.refinedRegime ?? ""), "PLTR-like setup should segment as bullish/gap attempt"),
        expect(!/existing_regime/.test(decision.refinedRegime ?? ""), "PLTR-like bullish attempt must not stay existing_regime"),
        expect((decision.signalSummary.overallScore ?? 0) >= 55 && (decision.signalSummary.overallScore ?? 100) <= 70, "PLTR-like attempt overall should be constructive but capped"),
        expect((decision.entryStrategies.current.score ?? 0) >= 35 && (decision.entryStrategies.current.score ?? 100) <= 45, "PLTR-like current score should be conditional near resistance"),
        expect((decision.entryStrategies.breakout.score ?? 0) >= 65, "PLTR-like breakout score should be prioritized"),
        expect((decision.entryStrategies.breakout.score ?? 0) >= (decision.entryStrategies.current.score ?? 0) + 8, "PLTR-like breakout score should outrank current by at least 8"),
        expect(/상승 전환|갭 돌파|안착|확인|돌파/.test(text), "PLTR-like strategy should use reversal/breakout confirmation wording"),
      ];
    },
  },
  {
    name: "Phase7 normal breakout attempt baseline",
    phase7: true,
    raw: baseReport({
      analysisMeta: { symbol: "BASE", currentPriceZone: "449.5", keyPivotPrice: "450", mainSupports: ["435"], mainResistances: ["450", "475"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "resistance_test", priceLocation: "near_resistance", nearSupport: false, nearResistance: true, chartRegimeConfidence: "medium" },
      scoreSummary: {
        totalScore: 57,
        buyScore: 55,
        riskScore: 50,
        entryScores: {
          currentEntry: { score: 46, label: "조건부", explanation: "near resistance" },
          pullbackEntry: { score: 52, label: "지지 확인", explanation: "435 support" },
          breakoutEntry: { score: 62, label: "돌파 확인", explanation: "450 anchoring" },
        },
      },
      priceRoles: { current: { priceZone: "449.5" }, pivot: { priceZone: "450" }, pullbackEntry: { priceZone: "435" }, stopLoss: { shortTerm: "432", conservative: "428", invalidation: "425" }, targets: { breakoutTargets: ["475"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "432", condition: "432 이탈" }, breakoutEntry: { priceZone: "432", condition: "432 이탈" } },
        targets: { firstTarget: { priceZone: "475" } },
        riskRewardByEntry: { current: riskReward(1.2), pullback: riskReward(1.4), breakout: riskReward(1.3) },
      },
      evidence: { positive: ["breakout attempt near resistance"], negative: ["confirmation not complete"], riskFactors: ["needs anchoring"] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect(decision.refinedRegime === "normal_breakout_attempt", "baseline breakout attempt should stay normal_breakout_attempt"),
        expect((decision.signalSummary.overallScore ?? 0) >= 52 && (decision.signalSummary.overallScore ?? 100) <= 64, "normal breakout attempt should stay in 52~64 band"),
        expect((decision.entryStrategies.breakout.score ?? 0) >= 60, "normal breakout attempt should keep breakout path useful"),
      ];
    },
  },
  {
    name: "Phase7 SOXL healthy leveraged pullback segmentation",
    phase7: true,
    raw: baseReport({
      analysisMeta: {
        symbol: "SOXL",
        currentPriceZone: "100",
        keyPivotPrice: "115",
        mainSupports: ["95", "90"],
        mainResistances: ["120", "130"],
        priceUnitConfidence: "medium",
      },
      chartRegime: { type: "uptrend_pullback", confidence: "high", reasons: ["strong uptrend pullback support intact"] },
      aiAnalysis: {
        priceAxisObservations: {
          currentPriceEstimate: { value: 100, confidence: "high" },
          visibleSupportPrices: [{ value: 95 }, { value: 90 }],
          visibleResistancePrices: [{ value: 120 }, { value: 130 }, { value: 140 }],
        },
        symbolDetection: { detectedTicker: "SOXL", detectedName: "SOXL", detectedMarket: "US" },
      },
      marketContext: {
        chartRegime: "uptrend_pullback",
        priceLocation: "near_support",
        nearSupport: true,
        nearResistance: false,
        chartRegimeConfidence: "high",
      },
      finalSummary: {
        finalAction: "PULLBACK_ENTRY",
        title: "상승추세 눌림",
        oneLineConclusion: "주요 지지 반응 확인 후 조건부 접근",
        confidence: "high",
        reason: "strong uptrend controlled pullback support holding",
      },
      scoreSummary: {
        totalScore: 64,
        buyScore: 62,
        riskScore: 42,
        entryScores: {
          currentEntry: { score: 55, label: "조건부 현재가", explanation: "support holding" },
          pullbackEntry: { score: 68, label: "눌림목 후보", explanation: "support reaction" },
          breakoutEntry: { score: 60, label: "돌파 확인", explanation: "watch 45" },
        },
      },
      priceRoles: {
        current: { priceZone: "100" },
        pivot: { priceZone: "115" },
        pullbackEntry: { priceZone: "95" },
        stopLoss: { shortTerm: "88", conservative: "84", invalidation: "80" },
        targets: { pullbackTargets: ["140", "150"], breakoutTargets: ["140", "150"] },
      },
      tradePlan: {
        entry: {
          currentEntry: { priceZone: "100", condition: "95 지지 유지 확인", action: "소액 조건부" },
          pullbackEntry: { priceZone: "95", condition: "95 지지 확인", action: "조건부 분할" },
        },
        stopLoss: { priceZone: "88", condition: "88 이탈", meaning: "현재가 조건부 손절" },
        stopLossByEntry: {
          currentEntry: { priceZone: "88", condition: "88 이탈", explanation: "support failure" },
          pullbackEntry: { priceZone: "88", condition: "88 이탈", explanation: "pullback failure" },
          breakoutEntry: { priceZone: "110", condition: "110 재이탈", explanation: "breakout failure" },
        },
        targets: { firstTarget: { priceZone: "140" }, secondTarget: { priceZone: "150" } },
        riskRewardByEntry: { current: riskReward(1.5), pullback: riskReward(2.0), breakout: riskReward(1.4) },
      },
      evidence: { positive: ["strong uptrend controlled pullback support holding volume increase"], negative: [], riskFactors: ["leveraged ETF risk"] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect(/healthy_uptrend_pullback|overheated_pullback/.test(decision.refinedRegime ?? ""), "SOXL healthy pullback should segment as healthy/overheated pullback"),
        expect((decision.signalSummary.overallScore ?? 0) >= 55 && (decision.signalSummary.overallScore ?? 100) <= 65, "SOXL healthy leveraged pullback overall should sit in controlled 55~65 area"),
        expect((decision.entryStrategies.current.score ?? 0) >= 45 && (decision.entryStrategies.current.score ?? 100) <= 58, "SOXL healthy leveraged current score should be useful but capped"),
        expect((decision.entryStrategies.pullback.score ?? 0) >= 55 && (decision.entryStrategies.pullback.score ?? 100) <= 70, "SOXL healthy leveraged pullback score should remain useful"),
      ];
    },
  },
  {
    name: "Phase7 KORU leveraged support shock",
    phase7: true,
    raw: baseReport({
      analysisMeta: { symbol: "KORU", currentPriceZone: "30", keyPivotPrice: "34", mainSupports: ["29.5"], mainResistances: ["36"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_pullback", priceLocation: "near_support", nearSupport: true, nearResistance: false, chartRegimeConfidence: "medium" },
      scoreSummary: {
        totalScore: 66,
        buyScore: 62,
        riskScore: 62,
        entryScores: {
          currentEntry: { score: 60, label: "현재가 후보", explanation: "raw support test" },
          pullbackEntry: { score: 58, label: "지지 확인", explanation: "support reaction" },
          breakoutEntry: { score: 54, label: "회복 확인", explanation: "breakout recovery" },
        },
      },
      priceRoles: { current: { priceZone: "30" }, pivot: { priceZone: "34" }, pullbackEntry: { priceZone: "29.5" }, stopLoss: { shortTerm: "28.5", conservative: "27.5", invalidation: "27" }, targets: { pullbackTargets: ["36", "40"], breakoutTargets: ["36", "40"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "28.5", condition: "28.5 이탈" }, pullbackEntry: { priceZone: "28.5", condition: "28.5 이탈" } },
        targets: { firstTarget: { priceZone: "36" }, secondTarget: { priceZone: "40" } },
        riskRewardByEntry: { current: riskReward(1.2), pullback: riskReward(1.6), breakout: riskReward(1.3) },
      },
      evidence: { positive: ["support test"], negative: ["large bearish candle sharp drop high volume drop"], riskFactors: ["leveraged ETF support shock"] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      const text = `${decision.primaryStrategy.title} ${decision.displayedEntrySignal.label}`;
      return [
        expect(/support_shock_test|sharp_pullback/.test(decision.refinedRegime ?? ""), "KORU sharp leveraged drop should segment as support shock or sharp pullback"),
        expect((decision.signalSummary.overallScore ?? 100) <= 45, "KORU support shock without confirmation should be capped to 45 or lower"),
        expect((decision.entryStrategies.current.score ?? 100) <= 30, "KORU support shock without confirmation should cap current entry to 30 or lower"),
        expect((decision.consistencyWarnings ?? []).some((warning) => /LEVERAGED_BEARISH_NO_CONFIRMATION_CAP|SUPPORT_BONUS_BLOCKED_BY_TREND_GATE|LEVERAGED_SHARP_DROP_CAP|SUPPORT_SHOCK_SCORE_CAP/.test(warning)), "KORU no-confirmation shock should carry a trend-gate/leveraged cap warning"),
        expect(!/상승 지속|분할진입 후보|매수 후보/.test(text), "KORU support shock should not show bullish continuation label"),
      ];
    },
  },
  {
    name: "Phase7 KORU leveraged support hold with confirmation",
    phase7: true,
    raw: baseReport({
      analysisMeta: { symbol: "KORU", currentPriceZone: "33.8", keyPivotPrice: "34", mainSupports: ["31.5"], mainResistances: ["38", "42"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "downtrend_rebound", priceLocation: "near_resistance", nearSupport: false, nearResistance: true, chartRegimeConfidence: "medium" },
      scoreSummary: {
        totalScore: 58,
        buyScore: 63,
        riskScore: 55,
        entryScores: {
          currentEntry: { score: 48, label: "조건부", explanation: "confirmation needed near resistance" },
          pullbackEntry: { score: 52, label: "지지 확인", explanation: "support hold" },
          breakoutEntry: { score: 66, label: "돌파 확인", explanation: "34 reclaim and hold" },
        },
      },
      priceRoles: { current: { priceZone: "33.8" }, pivot: { priceZone: "34" }, pullbackEntry: { priceZone: "31.5" }, stopLoss: { shortTerm: "30.5", conservative: "29.5", invalidation: "29" }, targets: { breakoutTargets: ["38", "42"], pullbackTargets: ["38", "42"] } },
      tradePlan: {
        entry: {
          currentEntry: { priceZone: "33.8", condition: "34 안착 확인", action: "조건부 접근" },
          breakoutEntry: { priceZone: "34", condition: "34 돌파 후 재지지", action: "돌파 확인" },
        },
        stopLossByEntry: { currentEntry: { priceZone: "30.5", condition: "30.5 이탈" }, breakoutEntry: { priceZone: "31.5", condition: "31.5 재이탈" } },
        targets: { firstTarget: { priceZone: "38" }, secondTarget: { priceZone: "42" } },
        riskRewardByEntry: { current: riskReward(1.2), pullback: riskReward(1.5), breakout: riskReward(1.6) },
      },
      indicatorAnalysis: {
        confirmed: [
          { name: "RSI", value: "61", signal: "neutral", explanation: "RSI 회복" },
          { name: "MACD", signal: "bullish", explanation: "MACD 개선" },
          { name: "EMA", signal: "neutral", explanation: "20EMA 회복 시도" },
        ],
        unavailable: [],
      },
      evidence: {
        positive: ["지지 유지 support hold volume expansion MACD 개선 RSI 회복 20EMA 회복 상승 전환 시도"],
        negative: ["34 안착 전 확인 필요"],
        riskFactors: ["leveraged ETF risk"],
      },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect(!/trend_damage_warning|support_breakdown/.test(decision.refinedRegime ?? ""), "KORU confirmed support hold should not be treated as breakdown"),
        expect((decision.signalSummary.overallScore ?? 0) >= 45 && (decision.signalSummary.overallScore ?? 100) <= 65, "KORU support hold with confirmation can improve but remains capped"),
        expect((decision.entryStrategies.current.score ?? 100) <= 45, "KORU support hold current entry remains conditional"),
        expect((decision.entryStrategies.breakout.score ?? 0) >= (decision.entryStrategies.current.score ?? 0) + 8, "KORU support hold should prioritize breakout confirmation over current entry"),
        expect(decision.trendRegimeGate?.reversalBonusAllowed === true, "KORU support hold should allow reversal bonus only after confirmation evidence"),
      ];
    },
  },
  {
    name: "Phase7 bearish support proximity alone does not lift score",
    phase7: true,
    raw: baseReport({
      analysisMeta: { symbol: "TEST", currentPriceZone: "50", keyPivotPrice: "56", mainSupports: ["49"], mainResistances: ["56", "60"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "downtrend_rebound", priceLocation: "near_support", nearSupport: true, nearResistance: false, chartRegimeConfidence: "medium" },
      scoreSummary: {
        totalScore: 64,
        buyScore: 58,
        riskScore: 58,
        entryScores: {
          currentEntry: { score: 62, label: "현재가 후보", explanation: "raw support proximity" },
          pullbackEntry: { score: 55, label: "지지 확인", explanation: "support nearby" },
          breakoutEntry: { score: 50, label: "회복 확인", explanation: "pivot recovery" },
        },
      },
      priceRoles: { current: { priceZone: "50" }, pivot: { priceZone: "56" }, pullbackEntry: { priceZone: "49" }, stopLoss: { shortTerm: "47.5", conservative: "46", invalidation: "45" }, targets: { breakoutTargets: ["56", "60"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "47.5", condition: "47.5 이탈" } },
        targets: { firstTarget: { priceZone: "56" }, secondTarget: { priceZone: "60" } },
        riskRewardByEntry: { current: riskReward(1.1), pullback: riskReward(1.4), breakout: riskReward(1.2) },
      },
      evidence: { positive: ["near support only"], negative: ["lower highs support pressure failed bounce"], riskFactors: ["downtrend not reversed"] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect(!/bullish_reversal_attempt|gap_breakout_attempt/.test(decision.refinedRegime ?? ""), "support proximity alone must not become bullish reversal"),
        expect((decision.signalSummary.overallScore ?? 100) <= 52, "bearish support proximity should not lift overall score above the trend gate"),
        expect((decision.entryStrategies.current.score ?? 100) <= 35, "bearish support proximity should cap current entry"),
        expect((decision.consistencyWarnings ?? []).some((warning) => /SUPPORT_BONUS_BLOCKED_BY_TREND_GATE/.test(warning)), "support-only bearish setup should carry trend-gate warning"),
      ];
    },
  },
  {
    name: "Phase7 oversold large decline without confirmation is not reversal",
    phase7: true,
    raw: baseReport({
      analysisMeta: { symbol: "TEST", currentPriceZone: "72", keyPivotPrice: "82", mainSupports: ["70"], mainResistances: ["82", "90"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "downtrend_rebound", priceLocation: "near_support", nearSupport: true, nearResistance: false, chartRegimeConfidence: "medium" },
      scoreSummary: {
        totalScore: 60,
        buyScore: 60,
        riskScore: 64,
        entryScores: {
          currentEntry: { score: 58, label: "반등 후보", explanation: "oversold raw" },
          pullbackEntry: { score: 54, label: "지지 확인", explanation: "support nearby" },
          breakoutEntry: { score: 48, label: "회복 확인", explanation: "pivot recovery" },
        },
      },
      priceRoles: { current: { priceZone: "72" }, pivot: { priceZone: "82" }, pullbackEntry: { priceZone: "70" }, stopLoss: { shortTerm: "68", conservative: "65", invalidation: "64" }, targets: { breakoutTargets: ["82", "90"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "68", condition: "68 이탈" } },
        targets: { firstTarget: { priceZone: "82" }, secondTarget: { priceZone: "90" } },
        riskRewardByEntry: { current: riskReward(1.1), pullback: riskReward(1.4), breakout: riskReward(1.1) },
      },
      indicatorAnalysis: { confirmed: [{ name: "RSI", value: "31", signal: "neutral", explanation: "oversold observation only" }], unavailable: [] },
      evidence: { positive: ["oversold large decline near support"], negative: ["large bearish candle sharp drop MACD weak support pressure"], riskFactors: ["support pressure"] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect(!/bullish_reversal_attempt|gap_breakout_attempt/.test(decision.refinedRegime ?? ""), "oversold/large decline alone must not become reversal regime"),
        expect(decision.trendRegimeGate?.reversalBonusAllowed === false, "oversold fixture should not allow reversal bonus without confirmation"),
        expect((decision.entryStrategies.current.score ?? 100) <= 38, "oversold large decline without confirmation should cap current entry"),
        expect(!/상승 전환|매수 후보|상승 지속/.test(`${decision.primaryStrategy.title} ${decision.displayedEntrySignal.label}`), "oversold fixture must not show bullish label"),
      ];
    },
  },
  {
    name: "Phase7 SOXL deeper pullback is lower than healthy setup",
    phase7: true,
    raw: baseReport({
      analysisMeta: { symbol: "SOXL", currentPriceZone: "34", keyPivotPrice: "40", mainSupports: ["33"], mainResistances: ["40", "48"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_pullback", priceLocation: "near_support", nearSupport: true, nearResistance: false, chartRegimeConfidence: "medium" },
      scoreSummary: {
        totalScore: 60,
        buyScore: 55,
        riskScore: 58,
        entryScores: {
          currentEntry: { score: 50, label: "조건부", explanation: "deep pullback" },
          pullbackEntry: { score: 60, label: "지지 확인", explanation: "support needed" },
          breakoutEntry: { score: 48, label: "회복 확인", explanation: "reclaim needed" },
        },
      },
      priceRoles: { current: { priceZone: "34" }, pivot: { priceZone: "40" }, pullbackEntry: { priceZone: "33" }, stopLoss: { shortTerm: "31.5", conservative: "30", invalidation: "29" }, targets: { pullbackTargets: ["40", "48"], breakoutTargets: ["40", "48"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "31.5", condition: "31.5 이탈" }, pullbackEntry: { priceZone: "31.5", condition: "31.5 이탈" } },
        targets: { firstTarget: { priceZone: "40" }, secondTarget: { priceZone: "48" } },
        riskRewardByEntry: { current: riskReward(1.1), pullback: riskReward(1.5), breakout: riskReward(1.2) },
      },
      evidence: { positive: ["support attempt"], negative: ["sharp drop from recent high large bearish candle"], riskFactors: ["leveraged ETF volatility"] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect(/sharp_pullback|support_shock_test|trend_damage_warning/.test(decision.refinedRegime ?? ""), "SOXL deeper pullback should not be treated as clean healthy pullback"),
        expect((decision.signalSummary.overallScore ?? 100) <= 55, "SOXL deeper pullback should score below healthy pullback"),
        expect((decision.entryStrategies.current.score ?? 100) <= 42, "SOXL deeper pullback current score should be defensive"),
      ];
    },
  },
  {
    name: "Phase7 MRVL parabolic pullback target segmentation",
    phase7: true,
    raw: baseReport({
      analysisMeta: { symbol: "MRVL", currentPriceZone: "90", keyPivotPrice: "96", mainSupports: ["84"], mainResistances: ["96"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "uptrend_pullback", priceLocation: "upper_range", nearSupport: false, nearResistance: true, isExtendedMove: true, chartRegimeConfidence: "medium" },
      scoreSummary: {
        totalScore: 72,
        buyScore: 70,
        riskScore: 60,
        entryScores: {
          currentEntry: { score: 66, label: "현재가 후보", explanation: "raw momentum" },
          pullbackEntry: { score: 62, label: "눌림 확인", explanation: "support needed" },
          breakoutEntry: { score: 64, label: "돌파 확인", explanation: "96 breakout" },
        },
      },
      priceRoles: { current: { priceZone: "90" }, pivot: { priceZone: "96" }, pullbackEntry: { priceZone: "84" }, stopLoss: { shortTerm: "84", conservative: "80", invalidation: "78" }, targets: { breakoutTargets: ["125"], holderTargets: ["125"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "84", condition: "84 이탈" }, pullbackEntry: { priceZone: "84", condition: "84 이탈" } },
        targets: { firstTarget: { priceZone: "125" } },
        riskRewardByEntry: { current: riskReward(1.3), pullback: riskReward(1.6), breakout: riskReward(1.2) },
      },
      indicatorAnalysis: { confirmed: [{ name: "RSI", signal: "caution", explanation: "RSI 77 overextended" }], unavailable: [] },
      evidence: { positive: ["parabolic vertical surge momentum"], negative: ["first pullback after surge near resistance"], riskFactors: ["extended target uncertainty"] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect(/parabolic_risk|overheated_pullback/.test(decision.refinedRegime ?? ""), "MRVL parabolic pullback should segment as parabolic or overheated pullback"),
        expect((decision.signalSummary.overallScore ?? 0) >= 45 && (decision.signalSummary.overallScore ?? 100) <= 62, "MRVL parabolic pullback overall should stay controlled"),
        expect((decision.signalSummary.riskRewardScore ?? 0) <= 60, "MRVL far/extension target should not inflate RR score above 60"),
        expect(Boolean(decision.targetProfile && (decision.targetProfile.extensionTarget !== null || decision.targetProfile.targetQuality !== "clear")), "MRVL parabolic case should expose extension/uncertain target profile"),
      ];
    },
  },
  {
    name: "Phase7 confirmed breakout remains constructive",
    phase7: true,
    raw: baseReport({
      analysisMeta: { symbol: "TEST", currentPriceZone: "456", keyPivotPrice: "450", mainSupports: ["450"], mainResistances: ["468", "475"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "breakout_retest_confirmed", priceLocation: "above_resistance", nearSupport: true, nearResistance: false, breakoutRetestConfirmed: true, chartRegimeConfidence: "high" },
      scoreSummary: {
        totalScore: 70,
        buyScore: 68,
        riskScore: 38,
        entryScores: {
          currentEntry: { score: 62, label: "조건부", explanation: "above breakout" },
          pullbackEntry: { score: 68, label: "재지지", explanation: "retest support" },
          breakoutEntry: { score: 76, label: "돌파 재지지", explanation: "confirmed retest" },
        },
      },
      priceRoles: { current: { priceZone: "456" }, pivot: { priceZone: "450" }, pullbackEntry: { priceZone: "450" }, stopLoss: { shortTerm: "448", conservative: "442", invalidation: "440" }, targets: { breakoutTargets: ["475", "500"] } },
      tradePlan: {
        stopLossByEntry: { currentEntry: { priceZone: "448", condition: "448 이탈" }, breakoutEntry: { priceZone: "448", condition: "448 이탈" } },
        targets: { firstTarget: { priceZone: "475" }, secondTarget: { priceZone: "500" } },
        riskRewardByEntry: { current: riskReward(1.5), pullback: riskReward(1.8), breakout: riskReward(1.7) },
      },
      evidence: { positive: ["breakout retest confirmed hold above pivot volume confirmed"], negative: [], riskFactors: ["stop below retest"] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect(decision.refinedRegime === "confirmed_breakout", "confirmed breakout should refine to confirmed_breakout"),
        expect((decision.signalSummary.overallScore ?? 0) >= 65, "confirmed breakout should remain constructively scored"),
        expect((decision.entryStrategies.breakout.score ?? 0) >= 70, "confirmed breakout breakout score should stay constructive"),
      ];
    },
  },
  {
    name: "Phase7 support breakdown remains defensive",
    phase7: true,
    raw: baseReport({
      analysisMeta: { symbol: "TEST", currentPriceZone: "88", keyPivotPrice: "95", mainSupports: ["90"], mainResistances: ["100"], priceUnitConfidence: "medium" },
      marketContext: { chartRegime: "support_breakdown", priceLocation: "below_support", nearSupport: false, nearResistance: false, chartRegimeConfidence: "high" },
      scoreSummary: {
        totalScore: 80,
        buyScore: 75,
        riskScore: 84,
        entryScores: {
          currentEntry: { score: 70, label: "raw buy", explanation: "bad raw" },
          pullbackEntry: { score: 65, label: "raw pullback", explanation: "bad raw" },
          breakoutEntry: { score: 60, label: "raw breakout", explanation: "bad raw" },
        },
      },
      priceRoles: { current: { priceZone: "88" }, pivot: { priceZone: "95" }, pullbackEntry: { priceZone: "90" }, stopLoss: { shortTerm: "90", conservative: "86", invalidation: "84" }, targets: { breakoutTargets: ["100"] } },
      evidence: { negative: ["support breakdown trend damage"], riskFactors: ["high risk"] },
    }),
    check: (report, vm) => {
      const decision = vm.reportDecision;
      return [
        expect(decision.refinedRegime === "trend_damage_warning", "support breakdown should refine to trend damage warning"),
        expect((decision.signalSummary.overallScore ?? 100) < 40, "support breakdown overall should stay below 40"),
        expect((decision.entryStrategies.current.score ?? 100) <= 25, "support breakdown current score should stay at or below 25"),
      ];
    },
  },
];

function entries(report) {
  return {
    current: report.scoreSummary?.entryScores?.currentEntry?.score ?? 0,
    pullback: report.scoreSummary?.entryScores?.pullbackEntry?.score ?? 0,
    breakout: report.scoreSummary?.entryScores?.breakoutEntry?.score ?? 0,
  };
}

function actionText(report) {
  return [
    report.normalizedFinalAction?.title,
    report.normalizedFinalAction?.subtitle,
    report.normalizedFinalAction?.actionType,
    report.finalSummary?.title,
    report.finalSummary?.oneLineConclusion,
  ].filter(Boolean).join(" ");
}

function expect(condition, message) {
  return condition ? null : message;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function patchDecision(baseDecision, patch) {
  return mergeDeep(cloneJson(baseDecision), patch);
}

function runReportDecisionValidationCases(validateReportDecision, baseDecision) {
  const validationCases = [
    {
      name: "ReportDecision warning: caution final action with bullish entry label",
      decision: patchDecision(baseDecision, {
        finalActionTone: "caution",
        displayedEntrySignal: { mode: "current", label: "매수 우세", explanation: "현재가 진입 유리" },
      }),
      indicators: [],
      expectWarning: /매수 우세|주의\/위험|bullish/i,
    },
    {
      name: "ReportDecision warning: target equals current or resistance without targetStatus",
      decision: patchDecision(baseDecision, {
        consistencyWarnings: [],
        priceRoles: {
          currentPrice: { text: "100 부근", value: 100, status: "저항권 근처" },
          mainResistance: { text: "100 부근", value: 100 },
          target: { text: "100 부근", value: 100, status: "" },
          targetStatus: "",
        },
      }),
      indicators: [],
      expectWarning: /현재가와 목표가|저항선과 목표가|targetStatus/,
    },
    {
      name: "ReportDecision warning: support breakdown with aggressive strategy",
      decision: patchDecision(baseDecision, {
        chartRegime: "support_breakdown",
        finalActionTone: "risk",
        primaryStrategy: { title: "현재가 분할진입 가능" },
      }),
      indicators: [],
      expectWarning: /공격|지지선 이탈|고위험/,
    },
    {
      name: "ReportDecision warning: invalid display value",
      decision: patchDecision(baseDecision, {
        primaryStrategy: { summary: "[object Object]" },
      }),
      indicators: [],
      expectWarning: /유효하지 않은 표시 값|invalid display/i,
    },
    {
      name: "ReportDecision warning: RSI overbought mapped to buy",
      decision: baseDecision,
      indicators: [{ name: "RSI", value: "77.2", interpretation: "과매수 구간", signal: "매수", tone: "positive" }],
      expectWarning: /RSI|과매수|매수/,
    },
    {
      name: "ReportDecision warning: confirmed breakout still says wait",
      decision: patchDecision(baseDecision, {
        breakoutState: "breakout_confirmed",
        finalActionLabel: "신규 진입 보류 / 돌파 확인 대기",
        primaryStrategy: { title: "신규 진입 보류 / 돌파 확인 대기", summary: "돌파 확인 대기" },
        priceRoles: {
          currentPrice: { text: "456 부근", value: 456, status: "돌파 이후" },
          breakoutLevel: { text: "450 부근", value: 450 },
        },
      }),
      indicators: [],
      expectWarning: /돌파 기준 위|돌파 확인 대기/,
    },
    {
      name: "ReportDecision warning: breakout confirmed score too low",
      decision: patchDecision(baseDecision, {
        breakoutState: "breakout_confirmed",
        entryStrategies: { breakout: { score: 45 } },
      }),
      indicators: [],
      expectWarning: /돌파 성공|60 미만/,
    },
    {
      name: "ReportDecision warning: bullish trend opportunity but all entries low",
      decision: patchDecision(baseDecision, {
        trendOpportunity: "uptrend_continuation",
        entryStrategies: {
          current: { score: 30 },
          pullback: { score: 35 },
          breakout: { score: 40 },
        },
      }),
      indicators: [],
      expectWarning: /상승|모멘텀|45 미만/,
    },
    {
      name: "ReportDecision warning: aggressive strategy missing stop",
      decision: patchDecision(baseDecision, {
        primaryStrategy: { title: "현재가 분할진입 가능", stop: "손절 기준 확인 필요" },
        priceRoles: { stopLoss: { text: "손절 기준 확인 필요", value: null } },
      }),
      indicators: [],
      expectWarning: /손절 기준|공격적|분할/,
    },
    {
      name: "ReportDecision warning: target not above entry",
      decision: patchDecision(baseDecision, {
        consistencyWarnings: [],
        priceRoles: {
          currentPrice: { text: "100 부근", value: 100 },
          mainResistance: { text: "105 부근", value: 105 },
          breakoutLevel: { text: "105 부근", value: 105 },
          target: { text: "98 부근", value: 98 },
          targetStatus: "",
        },
      }),
      indicators: [],
      expectWarning: /TARGET_NOT_ABOVE_ENTRY|목표가가 현재가보다 높지/,
    },
    {
      name: "ReportDecision warning: breakout target overlap",
      decision: patchDecision(baseDecision, {
        consistencyWarnings: [],
        priceRoles: {
          breakoutLevel: { text: "110 부근", value: 110 },
          target: { text: "110 부근", value: 110 },
          targetStatus: "",
        },
      }),
      indicators: [],
      expectWarning: /BREAKOUT_TARGET_OVERLAP|돌파 확인 가격과 목표가/,
    },
    {
      name: "ReportDecision warning: support stop overlap",
      decision: patchDecision(baseDecision, {
        consistencyWarnings: [],
        priceRoles: {
          mainSupport: { text: "95 부근", value: 95 },
          stopLoss: { text: "95 부근", value: 95 },
          invalidation: { text: "95 부근", value: 95 },
        },
      }),
      indicators: [],
      expectWarning: /SUPPORT_STOP_OVERLAP|지지선과 손절/,
    },
    {
      name: "ReportDecision warning: deterministic wording",
      decision: patchDecision(baseDecision, {
        primaryStrategy: { title: "강력 매수 / 확정 매수", summary: "100% 수익 보장" },
      }),
      indicators: [],
      expectWarning: /확정적|보장성|deterministic/i,
    },
    {
      name: "ReportDecision warning: new-entry and holder guidance collapsed",
      decision: patchDecision(baseDecision, {
        newEntryDecision: "동일한 가이드",
        holderDecision: "동일한 가이드",
      }),
      indicators: [],
      expectWarning: /신규 진입 가이드와 보유자 가이드|separated/i,
    },
    {
      name: "ReportDecision warning: risk state score not capped",
      decision: patchDecision(baseDecision, {
        chartRegime: "support_breakdown",
        finalActionTone: "risk",
        signalSummary: { overallScore: 72, scoreWarnings: [] },
      }),
      indicators: [],
      expectWarning: /SCORE_CAPPED_BY_STATE|표시 종합 점수/,
    },
    {
      name: "ReportDecision warning: low confidence score not capped",
      decision: patchDecision(baseDecision, {
        signalSummary: { overallScore: 72, dataConfidenceScore: 35, scoreWarnings: [] },
      }),
      indicators: [],
      expectWarning: /SCORE_CAPPED_BY_CONFIDENCE|낮은 신뢰도/,
    },
    {
      name: "ReportDecision warning: target collapse risk reward score high",
      decision: patchDecision(baseDecision, {
        consistencyWarnings: ["PRICE_ROLE_COLLAPSE"],
        priceRoles: { target: { text: "100 부근", value: 100 }, targetStatus: "" },
        signalSummary: { riskRewardScore: 72, scoreWarnings: [] },
      }),
      indicators: [],
      expectWarning: /SCORE_CAPPED_BY_PRICE_COLLAPSE|손익비 점수/,
    },
    {
      name: "ReportDecision warning: breakout overlap reliability score high",
      decision: patchDecision(baseDecision, {
        consistencyWarnings: ["BREAKOUT_TARGET_OVERLAP"],
        signalSummary: { breakoutReliabilityScore: 78, scoreWarnings: [] },
      }),
      indicators: [],
      expectWarning: /BREAKOUT_SCORE_CAPPED|돌파 신뢰 점수/,
    },
    {
      name: "ReportDecision warning: incomplete scenarios high total score",
      decision: patchDecision(baseDecision, {
        signalSummary: { overallScore: 78, scoreWarnings: [] },
        entryStrategies: {
          current: { isComplete: false, completenessWarnings: ["MISSING_CONFIRMATION"], score: 45 },
          pullback: { isComplete: false, completenessWarnings: ["MISSING_TARGET"], score: 45 },
          breakout: { isComplete: true, completenessWarnings: [], score: 45 },
        },
      }),
      indicators: [],
      expectWarning: /SCORE_CAPPED_BY_INCOMPLETE_SCENARIO|미완성인데 종합 점수/,
    },
  ];

  let failed = 0;
  for (const validationCase of validationCases) {
    const warnings = validateReportDecision(validationCase.decision, validationCase.indicators);
    const passed = warnings.some((warning) => validationCase.expectWarning.test(warning));
    if (passed) {
      console.log(`PASS ${validationCase.name}`);
    } else {
      failed += 1;
      console.error(`FAIL ${validationCase.name}`);
      console.error(`  - expected warning matching ${validationCase.expectWarning}`);
      console.error(`  - warnings=${JSON.stringify(warnings)}`);
    }
  }
  return failed;
}

function runPatternRiskCases(buildInstitutionalReportViewModel) {
  const patternProfile = (overrides = {}) => ({
    primaryPattern: "head_and_shoulders",
    patternLabel: "헤드앤숄더 의심",
    directionBias: "bearish",
    confidence: 64,
    confidenceLabel: "보통",
    stage: "neckline_test",
    keyLevel: "199~202",
    necklineLevel: "199~202",
    invalidationLevel: "215 부근",
    confirmationCondition: "199~202 넥라인 지지 확인",
    invalidationCondition: "215 부근 회복 시 패턴 위험 약화",
    strategyImpact: "넥라인 확인 / 신규 진입 보류",
    riskImpact: "entry_cap",
    shouldAffectDecision: true,
    scoreCaps: {
      currentEntryMax: 35,
      pullbackEntryMax: 45,
      breakoutRetestMax: 55,
      totalSignalMax: 50,
      riskScoreMin: 55,
    },
    heroSummary: "헤드앤숄더 의심 · 넥라인 199~202",
    explanation: "넥라인 지지와 우측 저항 회복 여부를 함께 확인합니다.",
    source: "image",
    ...overrides,
  });

  const buildPatternRaw = (profile, reportOverrides = {}) => baseReport(mergeDeep({
    analysisMeta: {
      symbol: "NVDA",
      currentPriceZone: "202 부근",
      keyPivotPrice: "215 부근",
      mainSupports: ["199 부근", "190 부근"],
      mainResistances: ["215 부근", "236 부근"],
    },
    marketContext: {
      chartRegime: "resistance_test",
      priceLocation: "near_support",
      nearSupport: true,
      nearResistance: false,
    },
    scoreSummary: {
      totalScore: 78,
      buyScore: 76,
      holdScore: 65,
      riskScore: 25,
      entryScores: {
        currentEntry: { score: 80, label: "재지지 진입 후보", explanation: "기존 점수" },
        pullbackEntry: { score: 82, label: "눌림목 진입 우세", explanation: "기존 점수" },
        breakoutEntry: { score: 88, label: "돌파 후 재지지 확인 / 진입 후보", explanation: "기존 점수" },
      },
    },
    priceRoles: {
      current: { priceZone: "202 부근", meaning: "현재가" },
      pivot: { priceZone: "215 부근", meaning: "우측 어깨 저항" },
      pullbackEntry: { priceZone: "199 부근", condition: "넥라인 지지 확인" },
      stopLoss: { shortTerm: "199 부근", conservative: "190 부근", invalidation: "185 부근" },
    },
    patternRiskProfile: profile,
  }, reportOverrides));

  const structuredHsCandidate = (overrides = {}) => ({
    name: "head_and_shoulders",
    label: "헤드앤숄더 의심",
    category: "reversal",
    direction: "bearish",
    stage: "neckline_test",
    confidence: "medium",
    confidenceScore: 64,
    source: "image",
    priceLevels: {
      leftShoulder: 218,
      head: 236,
      rightShoulder: 221,
      neckline: 201,
      confirmationLevel: 201,
      invalidationLevel: 225,
    },
    evidence: ["세 고점과 공통 넥라인 후보가 관찰됩니다."],
    breakoutDirection: "downside_candidate",
    confirmationCondition: "넥라인 이탈 여부 확인",
    invalidationCondition: "우어깨 저항 회복",
    entryLogic: "넥라인 확인 전 신규 진입 보류",
    conflictsWithMomentum: false,
    conflictExplanation: null,
    riskLevel: "high",
    ...overrides,
  });

  const buildLegacyCandidateRaw = (candidate, reportOverrides = {}, aiOverrides = {}) => ({
    ...buildPatternRaw(undefined, mergeDeep({ patternRiskProfile: undefined }, reportOverrides)),
    aiAnalysis: mergeDeep({
      visualTrend: "상승추세 눌림",
      visualStructure: { swingHighs: [], swingLows: [] },
      lineAnalysis: [],
      patternCandidates: candidate ? [candidate] : [],
    }, aiOverrides),
  });

  const cases = [
    {
      name: "P0 suspected head-and-shoulders neckline test",
      raw: buildPatternRaw(patternProfile()),
      check(vm) {
        const decision = vm.reportDecision;
        return [
          decision.patternRiskProfile?.shouldAffectDecision === true || "pattern risk must affect decision",
          /헤드앤숄더|넥라인/.test(decision.primaryStrategy.title) || "primary strategy must name H&S/neckline",
          /넥라인|신규 진입 보류/.test(decision.finalActionLabel) || "final action must be confirmation-first",
          (decision.entryStrategies.current.score ?? 100) <= 35 || "current entry must be <= 35",
          (decision.entryStrategies.pullback.score ?? 100) <= 45 || "pullback entry must be <= 45",
          (decision.entryStrategies.breakout.score ?? 100) <= 55 || "breakout entry must be <= 55",
          (decision.signalSummary.overallScore ?? 100) <= 50 || "overall score must be <= 50",
          (decision.signalSummary.riskScore ?? 0) >= 55 || "risk score must be >= 55",
          Boolean(decision.patternRiskProfile?.heroSummary) || "Hero pattern summary must exist",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P1 structured H&S candidate survives legacy frontend normalization",
      raw: {
        ...buildPatternRaw(undefined, {
          patternRiskProfile: undefined,
          marketContext: { chartRegime: "uptrend_pullback", priceLocation: "near_support", nearSupport: true },
        }),
        aiAnalysis: {
          visualTrend: "상승추세 눌림",
          visualStructure: {
            swingHighs: [
              { order: 1, price: 218, role: "left_shoulder" },
              { order: 2, price: 236, role: "head" },
              { order: 3, price: 221, role: "right_shoulder" },
            ],
            swingLows: [{ order: 1, price: 201, role: "neckline_touch" }],
          },
          lineAnalysis: [{ type: "neckline", priceLow: 199, priceHigh: 202, priceZone: "199~202" }],
          interpretationLayers: {
            shortTermState: "상승추세 눌림",
            structuralPatternRisk: "헤드앤숄더 의심 / 넥라인 테스트",
          },
          patternMomentumConflict: {
            exists: true,
            momentumBias: "bullish",
            patternBias: "bearish",
            explanation: "단기 반등 신호와 구조적 하락 위험이 충돌합니다.",
          },
          patternCandidates: [{
            name: "head_and_shoulders",
            label: "헤드앤숄더 의심",
            category: "reversal",
            direction: "bearish",
            stage: "neckline_test",
            confidence: "medium",
            confidenceScore: 64,
            source: "image",
            priceLevels: {
              leftShoulder: 218,
              head: 236,
              rightShoulder: 221,
              neckline: 201,
              confirmationLevel: 199,
              invalidationLevel: 225,
            },
            evidence: ["세 고점과 넥라인 후보가 관찰됩니다."],
            breakoutDirection: "downside_candidate",
            confirmationCondition: "넥라인 이탈 여부 확인",
            invalidationCondition: "우어깨 저항 회복",
            entryLogic: "넥라인 확인 전 신규 진입 보류",
            conflictsWithMomentum: true,
            conflictExplanation: "단기 모멘텀 개선과 패턴 위험이 충돌합니다.",
            riskLevel: "high",
          }],
        },
      },
      check(vm) {
        const decision = vm.reportDecision;
        return [
          decision.patternRiskProfile?.primaryPattern === "head_and_shoulders" || "structured candidate must create H&S profile",
          decision.patternRiskProfile?.stage === "neckline_test" || "explicit neckline_test stage must survive",
          decision.patternRiskProfile?.conflictsWithMomentum === true || "momentum conflict must survive",
          (decision.entryStrategies.current.score ?? 100) <= 35 || "P1 current entry must retain P0 cap",
          /헤드앤숄더|넥라인/.test(decision.primaryStrategy.title) || "P1 Hero strategy must use pattern wording",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P0 confirmed head-and-shoulders breakdown",
      raw: buildPatternRaw(patternProfile({
        patternLabel: "헤드앤숄더 확인",
        confidence: 82,
        confidenceLabel: "높음",
        stage: "confirmed",
        strategyImpact: "하락 전환 위험 / 위험 관리",
        scoreCaps: {
          currentEntryMax: 25,
          pullbackEntryMax: 30,
          breakoutRetestMax: 40,
          totalSignalMax: 40,
          riskScoreMin: 70,
        },
      })),
      check(vm) {
        const decision = vm.reportDecision;
        return [
          decision.refinedRegime === "failed_breakout" || "confirmed bearish pattern must refine to failed_breakout",
          (decision.entryStrategies.current.score ?? 100) <= 25 || "confirmed current entry must be <= 25",
          (decision.entryStrategies.pullback.score ?? 100) <= 30 || "confirmed pullback entry must be <= 30",
          (decision.entryStrategies.breakout.score ?? 100) <= 40 || "confirmed breakout entry must be <= 40",
          (decision.signalSummary.overallScore ?? 100) <= 40 || "confirmed overall must be <= 40",
          (decision.signalSummary.riskScore ?? 0) >= 70 || "confirmed risk must be >= 70",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P0 suspected double top blocks aggressive entry",
      raw: buildPatternRaw(patternProfile({
        primaryPattern: "double_top",
        patternLabel: "이중천장 의심",
        strategyImpact: "저항 돌파 실패 / 지지 이탈 확인",
        heroSummary: "이중천장 의심 · 지지 199~202 확인",
      })),
      check(vm) {
        const text = `${vm.reportDecision.primaryStrategy.title} ${vm.reportDecision.displayedEntrySignal.label}`;
        return [
          !/재지지 진입 후보|눌림목 진입 우세|상승 지속 매수 후보/.test(text) || "double top must block aggressive labels",
          (vm.reportDecision.entryStrategies.current.score ?? 100) <= 35 || "double top current entry must be capped",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P0 legacy report without pattern profile remains safe",
      raw: baseReport(),
      check(vm) {
        return [
          vm.reportDecision.patternRiskProfile == null || "legacy report without pattern must stay neutral",
          !/undefined|null|NaN|\[object Object\]/.test(`${vm.reportDecision.primaryStrategy.title} ${vm.hero.signalLabel}`) || "legacy report must not expose invalid text",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P1 weak explicit H&S does not cap confirmed breakout",
      raw: buildLegacyCandidateRaw(
        structuredHsCandidate({ confidenceScore: 60 }),
        {
          analysisMeta: { currentPriceZone: "216 부근", keyPivotPrice: "215 부근" },
          marketContext: { chartRegime: "breakout_retest_confirmed", priceLocation: "above_resistance", breakoutRetestConfirmed: true, nearSupport: true, nearResistance: false },
          priceRoles: {
            current: { priceZone: "216 부근", meaning: "현재가" },
            pivot: { priceZone: "215 부근", meaning: "돌파 기준" },
          },
        },
      ),
      check(vm) {
        const decision = vm.reportDecision;
        return [
          decision.patternRiskProfile == null || "weak pattern must not become active ReportDecision risk",
          decision.refinedRegime === "confirmed_breakout" || "confirmed breakout must remain constructive",
          (decision.signalSummary.overallScore ?? 0) > 50 || "weak pattern must not apply P0 total cap",
          (decision.entryStrategies.breakout.score ?? 0) > 55 || "weak pattern must not apply P0 breakout cap",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P1 normal uptrend three highs without neckline remains healthy",
      raw: buildLegacyCandidateRaw(
        structuredHsCandidate({
          confidenceScore: 60,
          priceLevels: { leftShoulder: 218, head: 236, rightShoulder: 221, invalidationLevel: 225 },
        }),
        {
          marketContext: { chartRegime: "uptrend_pullback", priceLocation: "near_support", nearSupport: true, nearResistance: false, breakoutRetestConfirmed: false },
        },
        {
          visualStructure: {
            swingHighs: [
              { order: 1, price: 218, role: "resistance" },
              { order: 2, price: 236, role: "higher_high" },
              { order: 3, price: 221, role: "lower_high" },
            ],
            swingLows: [{ order: 1, price: 202, role: "higher_low" }],
          },
        },
      ),
      check(vm) {
        const text = `${vm.reportDecision.primaryStrategy.title} ${vm.hero.trendLabel}`;
        return [
          vm.reportDecision.patternRiskProfile == null || "three highs without neckline must stay watch-only",
          !/헤드앤숄더|넥라인 확인 \/ 신규 진입 보류/.test(text) || "false H&S must not dominate Hero",
          (vm.reportDecision.signalSummary.overallScore ?? 0) > 50 || "false H&S must not apply P0 total cap",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P1 no-clear pattern does not create Hero warning",
      raw: buildLegacyCandidateRaw({
        ...structuredHsCandidate(),
        name: "no_clear_pattern",
        label: "명확한 패턴 없음",
        direction: "neutral",
        breakoutDirection: "neutral",
      }),
      check(vm) {
        return [
          vm.reportDecision.patternRiskProfile == null || "no-clear pattern must not activate risk profile",
          !/AI 패턴 감지|헤드앤숄더/.test(`${vm.hero.patternRiskProfile?.heroSummary ?? ""}`) || "no-clear pattern must not create Hero pattern warning",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P1 strong pattern and bullish momentum conflict reaches ReportDecision",
      raw: buildLegacyCandidateRaw(
        structuredHsCandidate({
          confidence: "high",
          confidenceScore: 82,
          stage: "confirmed",
          conflictsWithMomentum: true,
          conflictExplanation: "단기 반등 신호와 구조적 하락 위험이 충돌합니다.",
        }),
        {},
        {
          patternMomentumConflict: {
            exists: true,
            momentumBias: "bullish",
            patternBias: "bearish",
            explanation: "단기 반등 신호와 구조적 하락 위험이 충돌합니다.",
          },
        },
      ),
      check(vm) {
        const profile = vm.reportDecision.patternRiskProfile;
        return [
          profile?.shouldAffectDecision === true || "strong validated pattern must affect decision",
          profile?.shouldAffectScore !== false || "strong validated pattern must affect score",
          profile?.conflictsWithMomentum === true || "momentum conflict must survive",
          (vm.reportDecision.signalSummary.overallScore ?? 100) <= 40 || "strong pattern must retain P0 cap",
          Boolean(profile?.heroSummary) || "strong pattern must reach Hero summary",
        ].filter((value) => value !== true);
      },
    },
  ];

  let failed = 0;
  for (const testCase of cases) {
    const vm = buildInstitutionalReportViewModel(testCase.raw);
    const failures = testCase.check(vm);
    if (failures.length) {
      failed += 1;
      console.error(`FAIL ${testCase.name}`);
      for (const failure of failures) console.error(`  - ${failure}`);
    } else {
      console.log(`PASS ${testCase.name}`);
    }
  }

  const dashboardSource = fs.readFileSync(path.join(frontendDir, "components", "AnalysisReportDashboard.tsx"), "utf8");
  if (/patternRiskProfile\?\.heroSummary/.test(dashboardSource)) {
    console.log("PASS P0 Hero renders compact pattern risk summary");
  } else {
    failed += 1;
    console.error("FAIL P0 Hero renders compact pattern risk summary");
  }
  return failed;
}

function runStructuredEvidenceCases(buildInstitutionalReportViewModel, collectStructuredDecisionEvidence) {
  const buildRaw = (aiAnalysis, reportOverrides = {}) => ({
    ...baseReport(mergeDeep({
      analysisMeta: {
        symbol: "EVID",
        currentPriceZone: "100 부근",
        keyPivotPrice: "103 부근",
        mainSupports: ["96 부근", "92 부근"],
        mainResistances: ["103 부근", "112 부근"],
      },
      marketContext: {
        chartRegime: "resistance_test",
        priceLocation: "near_resistance",
        nearSupport: false,
        nearResistance: true,
        chartRegimeReasons: ["가격 위치를 관찰합니다."],
      },
      finalSummary: {
        finalAction: "WAIT",
        title: "조건 확인",
        oneLineConclusion: "추가 확인이 필요합니다.",
        reason: "RSI 64 구간에서 구조 확인이 필요합니다.",
      },
      scoreSummary: {
        explanation: "지표와 가격 구조를 함께 확인합니다.",
        entryScores: {
          currentEntry: { score: 45, label: "조건 확인", explanation: "현재가 조건 확인" },
          pullbackEntry: { score: 50, label: "조건 확인", explanation: "눌림 조건 확인" },
          breakoutEntry: { score: 55, label: "조건 확인", explanation: "돌파 조건 확인" },
        },
      },
      evidence: { positive: [], negative: [], riskFactors: [] },
      indicatorAnalysis: { confirmed: [], unavailable: [] },
      priceRoles: {
        current: { priceZone: "100 부근", meaning: "현재가" },
        pivot: { priceZone: "103 부근", meaning: "돌파 기준" },
        pullbackEntry: { priceZone: "96 부근", condition: "지지 반응 확인" },
        stopLoss: { shortTerm: "92 이탈", conservative: "90 이탈", invalidation: "90 이탈" },
      },
      tradePlan: {
        stopLoss: { priceZone: "92 이탈", shortTerm: { priceZone: "92 이탈" } },
        targets: { firstTarget: { priceZone: "112 부근" }, secondTarget: { priceZone: "118 부근" } },
      },
    }, reportOverrides)),
    aiAnalysis,
  });

  const cases = [
    {
      name: "P1 structured confirmation signals enable reversal review",
      raw: buildRaw({
        visibleConfirmationSignals: [
          { type: "strong_green_candle", direction: "bullish", evidence: "강한 양봉과 아래꼬리 반등", confidence: "medium" },
          { type: "macd_improvement", direction: "bullish", evidence: "MACD momentum improvement", confidence: "high" },
        ],
        supportResistanceEvidence: {
          supportEvidence: ["96 support hold reaction"],
          resistanceEvidence: ["103 resistance test"],
          quality: "strong",
        },
        entryScenarioEvidence: {
          breakoutRetest: {
            observed: true,
            evidence: ["103 돌파 후 안착 확인 필요"],
            missingConfirmation: ["종가 안착"],
            riskNotes: [],
            confidence: "medium",
          },
        },
        lineAnalysis: [],
      }),
      check(decision) {
        return [
          decision.candleRiskProfile?.reversalConfirmation?.evidenceCodes?.includes("BULLISH_CANDLE") || "structured bullish candle must be counted",
          decision.candleRiskProfile?.reversalConfirmation?.evidenceCodes?.includes("MACD_IMPROVING") || "structured MACD improvement must be counted",
          ["bullish_reversal_attempt", "gap_breakout_attempt"].includes(decision.refinedRegime) || "structured reversal evidence must avoid generic fallback",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P1 generic rebound and weak signal stay observational",
      raw: buildRaw({
        visibleConfirmationSignals: [
          { type: "rebound", direction: "bullish", evidence: "단기 반등 관찰", confidence: "low" },
        ],
        lineAnalysis: [],
      }, { finalSummary: { reason: "RSI 64, 단기 반등 관찰" } }),
      check(decision, raw) {
        const structured = collectStructuredDecisionEvidence(raw);
        return [
          structured.confirmationCodes.length === 0 || "low-confidence rebound must not become structured confirmation",
          !["bullish_reversal_attempt", "gap_breakout_attempt"].includes(decision.refinedRegime) || "weak rebound must not create reversal regime",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P1 structured invalidation and support pressure remain defensive",
      raw: buildRaw({
        visibleInvalidationClues: [
          { type: "support_breakdown_risk", evidence: "support pressure and failed bounce", confidence: "high" },
        ],
        supportResistanceEvidence: {
          supportEvidence: ["지지 약화와 반복 테스트"],
          resistanceEvidence: [],
          quality: "weak",
        },
        lineAnalysis: [],
      }, {
        marketContext: { chartRegime: "downtrend_rebound", priceLocation: "near_support", nearSupport: true, nearResistance: false },
      }),
      check(decision, raw) {
        const structured = collectStructuredDecisionEvidence(raw);
        return [
          structured.supportPressure === true || "structured support pressure must be detected",
          decision.finalActionTone !== "buy" || "structured invalidation must not create bullish final tone",
        ].filter((value) => value !== true);
      },
    },
    {
      name: "P1 line analysis alone does not create price roles or reversal",
      raw: buildRaw({
        visibleConfirmationSignals: [],
        visibleInvalidationClues: [],
        lineAnalysis: [
          { type: "support", price: 130, confidence: "high", evidence: ["support hold observation"], roleInStrategy: "supporting evidence only" },
        ],
      }, { finalSummary: { reason: "RSI 50 중립" } }),
      check(decision, raw) {
        const structured = collectStructuredDecisionEvidence(raw);
        const priceText = Object.values(decision.priceRoles ?? {}).map((value) => String(value ?? "")).join(" ");
        return [
          !["bullish_reversal_attempt", "gap_breakout_attempt", "confirmed_breakout"].includes(decision.refinedRegime) || "line evidence alone must not create bullish regime",
          !/130/.test(priceText) || "lineAnalysis price must not become a canonical price role",
          structured.lineEvidencePresent === true || "line evidence must be retained as supporting context",
          structured.confirmationCodes.length === 0 || "line evidence alone must not create structured reversal confirmation",
          structured.supportHold === false || "line evidence alone must not create canonical support hold",
        ].filter((value) => value !== true);
      },
    },
  ];

  let failed = 0;
  for (const testCase of cases) {
    const decision = buildInstitutionalReportViewModel(testCase.raw).reportDecision;
    const failures = testCase.check(decision, testCase.raw);
    if (failures.length) {
      failed += 1;
      console.error(`FAIL ${testCase.name}`);
      for (const failure of failures) console.error(`  - ${failure}`);
      console.error(`  refined=${decision.refinedRegime} evidence=${JSON.stringify(decision.candleRiskProfile?.reversalConfirmation)} gate=${JSON.stringify(decision.trendRegimeGate)}`);
    } else {
      console.log(`PASS ${testCase.name}`);
    }
  }
  return failed;
}

function run() {
  const tradingReportModule = loadTradingReportModule();
  const { normalizeTradingReport, validateTradingReportConsistency } = tradingReportModule;
  const { buildInstitutionalReportViewModel, validateReportDecision, collectStructuredDecisionEvidence } = loadInstitutionalReportModule(tradingReportModule);
  if (typeof normalizeTradingReport !== "function" || typeof validateTradingReportConsistency !== "function") {
    throw new Error("normalizeTradingReport and validateTradingReportConsistency must be exported.");
  }
  if (typeof buildInstitutionalReportViewModel !== "function" || typeof validateReportDecision !== "function" || typeof collectStructuredDecisionEvidence !== "function") {
    throw new Error("institutional report decision helpers must be exported.");
  }

  let failed = 0;
  const phase7Scores = [];
  for (const scenario of scenarios) {
    const report = normalizeTradingReport(scenario.raw);
    const viewModel = buildInstitutionalReportViewModel(scenario.raw);
    if (scenario.phase7) {
      phase7Scores.push({
        name: scenario.name,
        refinedRegime: viewModel.reportDecision.refinedRegime,
        overallScore: viewModel.reportDecision.signalSummary.overallScore,
        currentScore: viewModel.reportDecision.entryStrategies.current.score,
        pullbackScore: viewModel.reportDecision.entryStrategies.pullback.score,
        breakoutScore: viewModel.reportDecision.entryStrategies.breakout.score,
      });
    }
    const scenarioFailures = [
      ...scenario.check(report, viewModel),
      ...(validateTradingReportConsistency(report) || []),
      ...(validateReportDecision(viewModel.reportDecision, viewModel.indicators) || []),
    ].filter(Boolean);

    if (scenarioFailures.length) {
      failed += 1;
      console.error(`FAIL ${scenario.name}`);
      for (const failure of scenarioFailures) console.error(`  - ${failure}`);
      console.error(`  regime=${report.chartRegime?.type}`);
      console.error(`  refined=${viewModel.reportDecision?.refinedRegime} overall=${viewModel.reportDecision?.signalSummary?.overallScore} current=${viewModel.reportDecision?.entryStrategies?.current?.score} pullback=${viewModel.reportDecision?.entryStrategies?.pullback?.score} breakout=${viewModel.reportDecision?.entryStrategies?.breakout?.score}`);
      console.error(`  warnings=${JSON.stringify(viewModel.reportDecision?.consistencyWarnings ?? [])}`);
      console.error(`  action=${actionText(report)}`);
      console.error(`  entries=${JSON.stringify(entries(report))}`);
    } else {
      console.log(`PASS ${scenario.name}`);
    }
  }

  if (phase7Scores.length >= 6) {
    const numericScores = phase7Scores
      .map((item) => item.overallScore)
      .filter((score) => typeof score === "number" && Number.isFinite(score));
    const scoreRange = numericScores.length ? Math.max(...numericScores) - Math.min(...numericScores) : 0;
    const clusteredInOldBand = numericScores.length >= 6 && numericScores.every((score) => score >= 58 && score <= 62);
    if (scoreRange <= 8 || clusteredInOldBand) {
      failed += 1;
      console.error("FAIL Phase7 cross-fixture score segmentation");
      console.error(`  - refined regimes should not all converge into a narrow score band. scores=${JSON.stringify(phase7Scores)}`);
    } else {
      console.log("PASS Phase7 cross-fixture score segmentation");
    }

    const findPhase7 = (pattern) => phase7Scores.find((item) => pattern.test(item.name));
    const crossChecks = [
      {
        name: "KORU overall stays below SOXL healthy pullback",
        pass: () => {
          const koru = findPhase7(/KORU leveraged support shock/);
          const soxlHealthy = findPhase7(/SOXL healthy leveraged pullback/);
          return Boolean(koru && soxlHealthy && (koru.overallScore ?? 100) < (soxlHealthy.overallScore ?? 0));
        },
      },
      {
        name: "KORU shock current stays below SOXL healthy current",
        pass: () => {
          const koru = findPhase7(/KORU leveraged support shock/);
          const soxlHealthy = findPhase7(/SOXL healthy leveraged pullback/);
          return Boolean(koru && soxlHealthy && (koru.currentScore ?? 100) < (soxlHealthy.currentScore ?? 0));
        },
      },
      {
        name: "KORU confirmed support hold improves over no-confirmation shock",
        pass: () => {
          const koruShock = findPhase7(/KORU leveraged support shock/);
          const koruHold = findPhase7(/KORU leveraged support hold with confirmation/);
          return Boolean(koruShock && koruHold && (koruHold.overallScore ?? 0) > (koruShock.overallScore ?? 100));
        },
      },
      {
        name: "SOXL deeper current stays below SOXL healthy current",
        pass: () => {
          const soxlDeep = findPhase7(/SOXL deeper pullback/);
          const soxlHealthy = findPhase7(/SOXL healthy leveraged pullback/);
          return Boolean(soxlDeep && soxlHealthy && (soxlDeep.currentScore ?? 100) < (soxlHealthy.currentScore ?? 0));
        },
      },
      {
        name: "MRVL parabolic does not outrank SOXL healthy overall",
        pass: () => {
          const mrvl = findPhase7(/MRVL parabolic/);
          const soxlHealthy = findPhase7(/SOXL healthy leveraged pullback/);
          return Boolean(mrvl && soxlHealthy && (mrvl.overallScore ?? 100) <= (soxlHealthy.overallScore ?? 0));
        },
      },
      {
        name: "PLTR-like attempt prioritizes breakout over current",
        pass: () => {
          const pltr = findPhase7(/PLTR-like bullish gap reversal/);
          return Boolean(pltr && (pltr.breakoutScore ?? 0) >= (pltr.currentScore ?? 0) + 8);
        },
      },
      {
        name: "support breakdown stays below pullback and reversal regimes",
        pass: () => {
          const breakdown = findPhase7(/support breakdown remains defensive/);
          const candidates = phase7Scores.filter((item) => /SOXL healthy|SOXL deeper|MRVL parabolic|PLTR-like/.test(item.name));
          return Boolean(breakdown && candidates.length && candidates.every((item) => (breakdown.overallScore ?? 100) < (item.overallScore ?? 0)));
        },
      },
      {
        name: "confirmed breakout outranks normal breakout attempt",
        pass: () => {
          const confirmed = findPhase7(/confirmed breakout remains constructive/);
          const normal = findPhase7(/normal breakout attempt baseline/);
          return Boolean(confirmed && normal && (confirmed.overallScore ?? 0) > (normal.overallScore ?? 100));
        },
      },
    ];

    for (const check of crossChecks) {
      if (check.pass()) {
        console.log(`PASS Phase7 cross-fixture ${check.name}`);
      } else {
        failed += 1;
        console.error(`FAIL Phase7 cross-fixture ${check.name}`);
        console.error(`  - scores=${JSON.stringify(phase7Scores)}`);
      }
    }
  }

  const baseDecision = buildInstitutionalReportViewModel(baseReport()).reportDecision;
  failed += runReportDecisionValidationCases(validateReportDecision, baseDecision);
  failed += runPatternRiskCases(buildInstitutionalReportViewModel);
  failed += runStructuredEvidenceCases(buildInstitutionalReportViewModel, collectStructuredDecisionEvidence);

  if (failed > 0) {
    console.error(`\n${failed} trading report decision scenario(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll trading report decision scenarios passed.");
}

run();
