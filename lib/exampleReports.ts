export type ExampleImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
};

export type ExampleScenario = {
  title: string;
  condition: string;
  interpretation: string;
  tone: "bullish" | "neutral" | "bearish";
};

export type ExampleReport = {
  slug: "spy" | "qqq" | "nvda" | "tsla";
  symbol: string;
  companyName: string;
  market: string;
  uploadedAt: string;
  uploadedAtLabel: string;
  indexTitle: string;
  indexDescription: string;
  metadataTitle: string;
  metadataDescription: string;
  heading: string;
  intro: string;
  summary: string[];
  priceLevels: Array<{ label: string; value: string }>;
  technicalInterpretation: string[];
  scenarios: ExampleScenario[];
  chartImage: ExampleImage;
  reportImages: ExampleImage[];
};

export const exampleReports: ExampleReport[] = [
  {
    slug: "spy",
    symbol: "SPY",
    companyName: "SPDR S&P 500 ETF Trust",
    market: "US",
    uploadedAt: "2026-06-22",
    uploadedAtLabel: "2026년 6월 22일",
    indexTitle: "SPY 차트 분석 예시",
    indexDescription:
      "S&P 500 ETF의 저항권 리테스트와 돌파 확인 대기 구간을 지지선, 모멘텀, 거래량 관점에서 정리한 예시입니다.",
    metadataTitle: "SPY 차트 분석 예시 | CHART VISION AI",
    metadataDescription:
      "SPY 일봉 차트를 기준으로 지지선, 저항선, RSI, MACD, 거래량과 주요 가격대를 정리한 투자 참고용 AI 차트 분석 예시입니다.",
    heading: "SPY 차트 분석 예시 - 돌파 확인 대기 구간",
    intro:
      "SPY는 S&P 500 지수를 추종하는 대표 ETF입니다. 이 페이지는 업로드된 SPY 일봉 차트에서 확인되는 가격 위치, 지지선과 저항선, RSI, MACD, 거래량을 바탕으로 생성한 CHART VISION AI의 투자 참고용 리포트 예시입니다.",
    summary: [
      "예시 리포트는 SPY의 이미지 기준 현재가를 746 부근으로 추정하고, 주요 저항선과 돌파 기준을 759 부근으로 정리했습니다. 현재 가격이 저항선 아래에서 머무르는 구간이므로 즉시 추격하기보다 759 돌파 후 안착 여부 또는 736 지지 반응을 확인하는 접근을 우선합니다.",
      "표시된 신호 점수는 55/100이며 리포트 신뢰도는 40/100입니다. 이는 방향성이 확정되었다는 뜻이 아니라, 저항권 접근과 이미지 기반 가격 추정의 불확실성을 함께 반영한 값입니다. 실제 판단 전에는 최신 시세와 시장 상황을 별도로 확인해야 합니다.",
    ],
    priceLevels: [
      { label: "이미지 기준 현재가", value: "746 부근 추정" },
      { label: "주요 지지", value: "736 부근" },
      { label: "주요 저항", value: "759 부근" },
      { label: "돌파 기준", value: "759 부근" },
      { label: "손절 참고 기준", value: "736 이탈" },
      { label: "1차 목표 후보", value: "770 부근" },
      { label: "확장 목표 후보", value: "780 부근" },
      { label: "중기 무효화", value: "722 이탈" },
    ],
    technicalInterpretation: [
      "RSI는 55.86으로 중립권에 가깝습니다. 과열 신호는 강하지 않지만 RSI 하나만으로 진입을 판단하기보다 가격이 759 저항을 넘어 유지되는지 함께 확인할 필요가 있습니다. MACD는 신호선을 밑도는 흐름으로 단기 모멘텀 둔화 가능성을 보여줍니다.",
      "거래량은 최근 반등 구간에서 평균 대비 약 1.20배로 증가했지만 추세 확정 신호로 단정하기에는 제한적입니다. 현재는 736 지지와 759 저항 사이에서 방향을 탐색하는 구간이므로 돌파·안착 또는 지지 반응이 핵심 확인 항목입니다.",
    ],
    scenarios: [
      {
        title: "상승 시나리오",
        condition: "759 돌파 후 재지지",
        interpretation: "돌파 가격대 위에서 안착하면 770 부근을 다음 확인 구간으로 참고할 수 있습니다.",
        tone: "bullish",
      },
      {
        title: "중립 시나리오",
        condition: "736~759 사이 등락",
        interpretation: "지지와 저항 사이에서 박스권 또는 방향 탐색 구간이 이어질 수 있습니다.",
        tone: "neutral",
      },
      {
        title: "하락 시나리오",
        condition: "722 이탈",
        interpretation: "중기 상승 관점이 약해질 수 있어 신규 진입보다 위험 관리 기준을 재확인해야 합니다.",
        tone: "bearish",
      },
    ],
    chartImage: {
      src: "/examples/spy-chart.png",
      width: 2038,
      height: 1152,
      alt: "SPY 일봉 차트와 거래량, 스토캐스틱, MACD, RSI 지표 화면",
      caption: "분석에 사용한 SPY 일봉 차트 예시",
    },
    reportImages: [
      {
        src: "/examples/spy-report-top.png",
        width: 1119,
        height: 958,
        alt: "SPY AI 차트 분석 리포트 상단 요약 화면",
        caption: "SPY 리포트 상단: 종목 요약, 매매 전략, 진입 시나리오와 핵심 가격대",
      },
      {
        src: "/examples/spy-report-middle.png",
        width: 1003,
        height: 1216,
        alt: "SPY AI 차트 분석 리포트 신호 점수와 진입 방식별 판단 화면",
        caption: "SPY 리포트 중단: 시장 요약, 신호 점수와 진입 방식별 조건",
      },
      {
        src: "/examples/spy-report-bottom.png",
        width: 1008,
        height: 1128,
        alt: "SPY AI 차트 분석 리포트 가격 레벨과 기술적 지표 화면",
        caption: "SPY 리포트 하단: 핵심 가격 레벨, 기술적 지표와 시나리오 분석",
      },
    ],
  },
  {
    slug: "qqq",
    symbol: "QQQ",
    companyName: "Invesco QQQ Trust",
    market: "US",
    uploadedAt: "2026-06-22",
    uploadedAtLabel: "2026년 6월 22일",
    indexTitle: "QQQ 차트 분석 예시",
    indexDescription:
      "나스닥 100 ETF의 저항선, 미래 눌림목 관심 구간과 돌파 기준을 정리한 투자 참고용 리포트 예시입니다.",
    metadataTitle: "QQQ 차트 분석 예시 | CHART VISION AI",
    metadataDescription:
      "QQQ 일봉 차트에서 확인되는 지지선, 저항선, 돌파 기준, RSI, MACD, 이동평균선과 거래량을 정리한 AI 차트 분석 예시입니다.",
    heading: "QQQ 차트 분석 예시 - 미래 눌림목 관심 구간",
    intro:
      "QQQ는 나스닥 100 지수를 추종하는 대표 ETF입니다. 이 예시는 업로드된 QQQ 일봉 차트를 바탕으로 주요 지지·저항 구간, 이동평균선, RSI, MACD와 거래량을 종합해 생성한 투자 참고용 분석 리포트입니다.",
    summary: [
      "예시 리포트는 QQQ의 이미지 기준 현재가를 739 부근으로 추정하고, 주요 저항선과 돌파 기준을 748 부근으로 제시합니다. 현재가가 저항 아래에 있으므로 즉시 추격하기보다 748 돌파 후 안착 여부 또는 720 지지선에서의 반응을 확인하는 조건부 접근을 우선합니다.",
      "표시된 신호 점수는 60/100이며 리포트 신뢰도는 62/100입니다. 다른 예시보다 데이터 신뢰도는 높지만 저항권 리테스트 구간이라는 점을 고려해 현재가 진입보다 미래 눌림목이나 돌파 확인 조건을 더 중요하게 해석합니다.",
    ],
    priceLevels: [
      { label: "이미지 기준 현재가", value: "739 부근 추정" },
      { label: "주요 지지", value: "720 부근" },
      { label: "주요 저항", value: "748 부근" },
      { label: "돌파 기준", value: "748 부근" },
      { label: "손절 참고 기준", value: "720 이탈" },
      { label: "1차 목표 후보", value: "760 부근" },
      { label: "확장 목표 후보", value: "780 부근" },
      { label: "중기 무효화", value: "705 이탈" },
    ],
    technicalInterpretation: [
      "RSI는 58.57로 중립권에 있으며 단독 진입 신호보다 가격 위치 확인이 우선입니다. MACD는 신호선을 하회해 모멘텀 둔화 가능성을 보여주므로 748 저항 돌파가 실제로 유지되는지 확인해야 합니다.",
      "가격은 주요 중기 이동평균선 위에 있어 큰 흐름은 비교적 우호적이지만 거래량은 평균 수준에 가깝습니다. 볼린저 밴드 위치도 명확한 추세 확장으로 보기 어려워, 720 지지 유지와 748 돌파 여부를 함께 살피는 것이 중요합니다.",
    ],
    scenarios: [
      {
        title: "상승 시나리오",
        condition: "748 돌파 후 재지지",
        interpretation: "돌파가 유지되면 760 부근을 1차 확인 구간으로 참고할 수 있습니다.",
        tone: "bullish",
      },
      {
        title: "중립 시나리오",
        condition: "720~748 사이 등락",
        interpretation: "상단 추격보다 하단 지지 반응과 거래량 변화를 우선 확인하는 구간입니다.",
        tone: "neutral",
      },
      {
        title: "하락 시나리오",
        condition: "705 이탈",
        interpretation: "중기 상승 관점이 약해질 수 있어 비중과 손절 기준을 다시 점검해야 합니다.",
        tone: "bearish",
      },
    ],
    chartImage: {
      src: "/examples/qqq-chart.png",
      width: 2041,
      height: 1150,
      alt: "QQQ 일봉 차트와 거래량, 스토캐스틱, MACD, RSI 지표 화면",
      caption: "분석에 사용한 QQQ 일봉 차트 예시",
    },
    reportImages: [
      {
        src: "/examples/qqq-report-top.png",
        width: 1007,
        height: 900,
        alt: "QQQ AI 차트 분석 리포트 상단 요약 화면",
        caption: "QQQ 리포트 상단: 대표 전략, 진입 시나리오와 주요 가격대",
      },
      {
        src: "/examples/qqq-report-middle.png",
        width: 1008,
        height: 1215,
        alt: "QQQ AI 차트 분석 리포트 신호 점수와 진입 방식별 판단 화면",
        caption: "QQQ 리포트 중단: AI 시장 요약, 신호 점수와 조건별 진입 판단",
      },
      {
        src: "/examples/qqq-report-bottom.png",
        width: 1006,
        height: 1127,
        alt: "QQQ AI 차트 분석 리포트 가격 레벨과 기술적 지표 화면",
        caption: "QQQ 리포트 하단: 가격 레벨, 기술적 지표와 상승·중립·하락 시나리오",
      },
    ],
  },
  {
    slug: "nvda",
    symbol: "NVDA",
    companyName: "NVIDIA",
    market: "US",
    uploadedAt: "2026-06-22",
    uploadedAtLabel: "2026년 6월 22일",
    indexTitle: "NVDA 차트 분석 예시",
    indexDescription:
      "NVIDIA 차트에서 위험 관리와 신규 진입 보류 관점을 지지·저항 및 모멘텀과 함께 정리한 예시입니다.",
    metadataTitle: "NVDA 차트 분석 예시 | CHART VISION AI",
    metadataDescription:
      "NVDA 일봉 차트의 현재 위치, 지지선, 저항선, 위험 수준, RSI, MACD와 거래량을 바탕으로 위험 관리 관점을 정리한 AI 분석 예시입니다.",
    heading: "NVDA 차트 분석 예시 - 위험 관리 우선 구간",
    intro:
      "NVDA는 AI 반도체와 GPU 시장에서 높은 관심을 받는 대형 성장주입니다. 이 예시는 업로드된 NVDA 일봉 차트에서 확인되는 지지선, 저항선, 모멘텀과 거래량을 바탕으로 위험 관리 관점을 정리한 투자 참고용 리포트입니다.",
    summary: [
      "예시 리포트는 NVDA의 이미지 기준 현재가를 209 부근으로 추정하고, 주요 지지를 204 부근, 주요 저항과 돌파 기준을 212 부근으로 표시합니다. 가격이 저항권을 테스트하는 가운데 위험 신호가 높아 신규 진입보다 지지 유지와 위험 완화 확인을 우선합니다.",
      "표시된 신호 점수는 20/100, 위험 수준은 80/100이며 리포트 신뢰도는 40/100입니다. 이 점수는 종목의 장기 전망을 단정하는 값이 아니라 해당 이미지에서 확인되는 진입 조건의 불완전성과 단기 위험을 보수적으로 반영한 예시입니다.",
    ],
    priceLevels: [
      { label: "이미지 기준 현재가", value: "209 부근 추정" },
      { label: "주요 지지", value: "204 부근" },
      { label: "주요 저항", value: "212 부근" },
      { label: "돌파 기준", value: "212 부근" },
      { label: "손절 참고 기준", value: "204 이탈" },
      { label: "1차 목표 후보", value: "215 부근" },
      { label: "확장 목표 후보", value: "217 부근" },
      { label: "중기 무효화", value: "200 이탈" },
    ],
    technicalInterpretation: [
      "RSI는 49.24로 중립권에 가까워 강한 상승 압력을 뜻하지 않습니다. MACD는 신호선을 하회해 모멘텀 둔화 또는 약세 흐름을 경계해야 하며, 212 회복만으로 추세 전환을 단정하기보다 안착 여부를 추가로 확인해야 합니다.",
      "거래량은 평균 대비 약 0.86배로 제한적이며 뚜렷한 추세 확장 신호도 약합니다. 현재 가격이 지지와 저항 사이에 있지만 리스크 점수가 높으므로 공격적인 진입보다 204 지지 유지와 212 회복 후 재지지를 우선 확인합니다.",
    ],
    scenarios: [
      {
        title: "상승 시나리오",
        condition: "212 회복 후 재지지",
        interpretation: "저항 회복이 유지될 때만 215 부근을 다음 확인 가격대로 참고합니다.",
        tone: "bullish",
      },
      {
        title: "중립 시나리오",
        condition: "204~212 사이 등락",
        interpretation: "방향성이 뚜렷하지 않아 관찰과 위험 완화 확인이 우선인 구간입니다.",
        tone: "neutral",
      },
      {
        title: "하락 시나리오",
        condition: "204 이탈",
        interpretation: "단기 상승 관점이 약해질 수 있으며 200 이탈 여부까지 별도로 점검해야 합니다.",
        tone: "bearish",
      },
    ],
    chartImage: {
      src: "/examples/nvda-chart.png",
      width: 2044,
      height: 1156,
      alt: "NVDA 일봉 차트와 거래량, 스토캐스틱, MACD, RSI 지표 화면",
      caption: "분석에 사용한 NVDA 일봉 차트 예시",
    },
    reportImages: [
      {
        src: "/examples/nvda-report-top.png",
        width: 1119,
        height: 957,
        alt: "NVDA AI 차트 분석 리포트 상단 위험 관리 요약 화면",
        caption: "NVDA 리포트 상단: 위험 관리 우선 판단과 핵심 가격대",
      },
      {
        src: "/examples/nvda-report-middle.png",
        width: 1008,
        height: 1261,
        alt: "NVDA AI 차트 분석 리포트 신호 점수와 조건별 진입 판단 화면",
        caption: "NVDA 리포트 중단: 낮은 신호 점수와 진입 방식별 위험 조건",
      },
      {
        src: "/examples/nvda-report-bottom.png",
        width: 1010,
        height: 1128,
        alt: "NVDA AI 차트 분석 리포트 가격 레벨과 기술적 지표 화면",
        caption: "NVDA 리포트 하단: 주요 가격 레벨, 약세 지표와 시나리오 분석",
      },
    ],
  },
  {
    slug: "tsla",
    symbol: "TSLA",
    companyName: "Tesla",
    market: "US",
    uploadedAt: "2026-06-22",
    uploadedAtLabel: "2026년 6월 22일",
    indexTitle: "TSLA 차트 분석 예시",
    indexDescription:
      "Tesla 차트의 저항권 테스트와 돌파 확인 조건을 RSI, MACD, 이동평균선 및 거래량과 함께 정리한 예시입니다.",
    metadataTitle: "TSLA 차트 분석 예시 | CHART VISION AI",
    metadataDescription:
      "TSLA 일봉 차트에서 확인되는 지지선, 저항선, 돌파 기준, RSI, MACD와 거래량을 참고해 현재 차트 위치를 정리한 AI 분석 예시입니다.",
    heading: "TSLA 차트 분석 예시 - 저항권 테스트 구간",
    intro:
      "TSLA는 변동성이 큰 대표 성장주 중 하나입니다. 이 예시는 업로드된 TSLA 일봉 차트를 바탕으로 저항권 테스트, 지지선과 돌파 기준, RSI, MACD와 거래량을 해석한 투자 참고용 리포트입니다.",
    summary: [
      "예시 리포트는 TSLA의 이미지 기준 현재가를 394 부근으로 추정하고, 주요 지지를 392 부근, 주요 저항과 돌파 기준을 400 부근으로 정리합니다. 현재 가격이 저항선에 가까워 즉시 추격하기보다 400 돌파 후 안착 또는 392 지지 반응을 확인하는 조건부 접근을 제시합니다.",
      "표시된 신호 점수와 리포트 신뢰도는 각각 40/100입니다. 이는 저항권 접근과 제한적인 모멘텀, 이미지 기반 추정의 불확실성을 반영한 값이며 현재 시세나 향후 가격을 예측하는 수치가 아닙니다.",
    ],
    priceLevels: [
      { label: "이미지 기준 현재가", value: "394 부근 추정" },
      { label: "주요 지지", value: "392 부근" },
      { label: "주요 저항", value: "400 부근" },
      { label: "돌파 기준", value: "400 부근" },
      { label: "손절 참고 기준", value: "392 이탈" },
      { label: "1차 목표 후보", value: "409 부근" },
      { label: "확장 목표 후보", value: "416 부근" },
      { label: "중기 무효화", value: "386 이탈" },
    ],
    technicalInterpretation: [
      "RSI는 44.66으로 중립권 아래에 가까워 강한 상승 압력은 제한적입니다. MACD도 신호선을 밑도는 흐름이어서 단기 모멘텀의 추가 회복을 확인할 필요가 있습니다.",
      "가격은 단기 이동평균선 아래에서 움직이고 거래량은 평균 대비 약 1.07배로 뚜렷한 추세 확장 신호라고 보기 어렵습니다. 따라서 392 지지 유지와 400 저항 돌파 여부를 함께 확인하는 보수적인 해석이 적절합니다.",
    ],
    scenarios: [
      {
        title: "상승 시나리오",
        condition: "400 돌파 후 재지지",
        interpretation: "돌파가 유지되면 409 부근을 다음 확인 가격대로 참고할 수 있습니다.",
        tone: "bullish",
      },
      {
        title: "중립 시나리오",
        condition: "392~400 사이 등락",
        interpretation: "단기적으로 지지와 저항 사이에서 방향을 탐색하는 흐름이 이어질 수 있습니다.",
        tone: "neutral",
      },
      {
        title: "하락 시나리오",
        condition: "386 이탈",
        interpretation: "단기 상승 관점이 약해질 수 있어 비중과 위험 관리 기준을 재점검해야 합니다.",
        tone: "bearish",
      },
    ],
    chartImage: {
      src: "/examples/tsla-chart.png",
      width: 2044,
      height: 1155,
      alt: "TSLA 일봉 차트와 거래량, 스토캐스틱, MACD, RSI 지표 화면",
      caption: "분석에 사용한 TSLA 일봉 차트 예시",
    },
    reportImages: [
      {
        src: "/examples/tsla-report-top.png",
        width: 1008,
        height: 867,
        alt: "TSLA AI 차트 분석 리포트 상단 돌파 확인 요약 화면",
        caption: "TSLA 리포트 상단: 저항권 테스트와 돌파 확인 조건",
      },
      {
        src: "/examples/tsla-report-middle.png",
        width: 1011,
        height: 1195,
        alt: "TSLA AI 차트 분석 리포트 신호 점수와 진입 방식별 판단 화면",
        caption: "TSLA 리포트 중단: AI 시장 요약, 신호 점수와 진입 방식별 조건",
      },
      {
        src: "/examples/tsla-report-bottom.png",
        width: 1006,
        height: 1121,
        alt: "TSLA AI 차트 분석 리포트 가격 레벨과 기술적 지표 화면",
        caption: "TSLA 리포트 하단: 핵심 가격 레벨, 기술적 지표와 시나리오 분석",
      },
    ],
  },
];

export const exampleReportSlugs = exampleReports.map((report) => report.slug);

export function getExampleReport(slug: string) {
  return exampleReports.find((report) => report.slug === slug);
}
