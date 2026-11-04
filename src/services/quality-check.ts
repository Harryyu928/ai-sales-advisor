// 回复智能质检（功能2）—— 分层策略中的规则层
// 用确定性代码检查表达类问题，不调用模型；专业事实核查由知识检索环节负责
// 输出：issues（严重，需提醒顾问）/ warnings（普通，可自动优化）/ autoFixedText

export type QualitySeverity = "HIGH" | "MEDIUM" | "LOW";

export interface QualityIssue {
  code: string;
  message: string;
  severity: QualitySeverity;
  matched?: string;
}

export interface QualityCheckResult {
  passed: boolean;
  issues: QualityIssue[];
  warnings: QualityIssue[];
  autoFixed: boolean;
  finalText: string;
}

// 严重：绝对化 / 保过 / 保证类承诺
const FORBIDDEN_ABSOLUTE = [
  "保过", "包过", "保证通过", "一定通过", "百分百通过", "100%通过", "百分之百通过",
  "保证提分", "保分", "包你过", "不过退款保过", "绝对可以", "肯定能过", "必然通过",
  "稳过", "一定能过", "保证拿到", "无条件通过",
];

// 普通：机械 AI 腔 / 过度营销套话（可自动清理）
const AI_CLICHE = [
  "首先，", "其次，", "再次，", "综上所述", "总而言之", "与此同时",
  "赋能", "一站式", "全方位", "打造", "闭环", "抓手", "助力", "护航",
  "众所周知", "毋庸置疑", "值得一提的是", "作为一个", "我将", "竭诚为您服务",
];

// 触发价格/优惠核查的信号（出现具体金额或优惠字眼时，提示以已审核资料为准）
const PRICE_SIGNALS = [
  "优惠", "折扣", "打折", "减", "原价", "现价", "促销", "限时", "赠送", "免费",
];

const CURRENCY_PATTERN = /\d[\d,，.]*(元|块|万|千|百|￥|¥)/g;

/** 统计回复中的问号数量（中英文） */
export function countQuestions(text: string): number {
  return (text.match(/[?？]/g) || []).length;
}

function hasAny(text: string, words: string[]): string[] {
  return words.filter((w) => text.includes(w));
}

/**
 * 对生成的回复执行规则质检。
 * @param text 待检查的回复
 * @param knowledgeGrounded 本次生成是否基于已审核知识（影响专业事实可信度）
 */
export function qualityCheck(text: string, knowledgeGrounded: boolean = true): QualityCheckResult {
  const issues: QualityIssue[] = [];
  const warnings: QualityIssue[] = [];
  let working = text;
  let autoFixed = false;

  // 1. 严重：绝对化 / 保过承诺
  const absoluteHits = hasAny(text, FORBIDDEN_ABSOLUTE);
  for (const hit of absoluteHits) {
    issues.push({
      code: "ABSOLUTE_PROMISE",
      message: `回复包含"${hit}"等绝对化/保过承诺，存在合规风险，建议修改`,
      severity: "HIGH",
      matched: hit,
    });
  }

  // 2. 价格/优惠信号 + 具体金额：提示以已审核资料为准
  const priceHits = hasAny(text, PRICE_SIGNALS);
  const currencyHits = text.match(CURRENCY_PATTERN) || [];
  if (priceHits.length > 0 || currencyHits.length > 0) {
    warnings.push({
      code: "PRICE_CHECK",
      message: "回复涉及价格或优惠，请确认与已审核的价格资料一致，避免口头承诺",
      severity: "MEDIUM",
      matched: [...priceHits, ...currencyHits].slice(0, 4).join("、"),
    });
  }

  // 3. 普通：AI 腔 / 营销套话，自动清理
  const clicheHits = hasAny(text, AI_CLICHE);
  if (clicheHits.length > 0) {
    for (const c of clicheHits) {
      // 去掉套话词及紧随的逗号，避免留下残缺标点
      working = working.split(c).join("");
    }
    working = working.replace(/[，,]\s*[，,]+/g, "，").replace(/\s{2,}/g, " ").trim();
    autoFixed = true;
    warnings.push({
      code: "AI_CLICHE",
      message: `已自动去除机械化表达：${clicheHits.join("、")}`,
      severity: "MEDIUM",
      matched: clicheHits.join("、"),
    });
  }

  // 4. 连续提问过多
  const qCount = countQuestions(text);
  if (qCount > 1) {
    warnings.push({
      code: "TOO_MANY_QUESTIONS",
      message: `回复连续提出了 ${qCount} 个问题，建议一次只问一个，降低客户压力`,
      severity: "MEDIUM",
    });
  }

  // 5. 长度提示
  if (text.length > 220) {
    warnings.push({
      code: "TOO_LONG",
      message: "回复偏长，手机端阅读可能有压力，建议精简到 3-5 句",
      severity: "LOW",
    });
  }

  // 6. 未基于已审核知识时的专业可信度提示（由生成侧保证不编造，这里仅记录）
  if (!knowledgeGrounded) {
    warnings.push({
      code: "NO_KNOWLEDGE_GROUND",
      message: "本次未检索到匹配的已审核知识，专业内容请人工核对后再发送",
      severity: "MEDIUM",
    });
  }

  const hasHigh = issues.some((i) => i.severity === "HIGH");
  return {
    passed: !hasHigh,
    issues,
    warnings,
    autoFixed,
    finalText: working,
  };
}
