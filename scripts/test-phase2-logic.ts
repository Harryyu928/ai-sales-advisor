// 第二阶段核心逻辑自动化测试（tsx scripts/test-phase2-logic.ts）
// 覆盖：JSON 容错解析、Schema 校验、相邻重复合并、顺序重排、时间解析
import assert from "node:assert/strict";
import { extractJson, recognitionResultSchema, type RecognizedMessage } from "@/lib/schemas";
import { mergeNearDuplicates, parseTimestamp, toDbSenderRole } from "@/services/conversation-service";

let passed = 0;
function ok(name: string) {
  passed++;
  console.log(`  ✓ ${name}`);
}

// ---- 1. JSON 容错解析 ----
// 1a. 裸 JSON
assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
ok("裸 JSON 直接解析");

// 1b. Markdown 围栏
const fenced = extractJson('```json\n{"messages":[]}\n```');
assert.deepEqual(fenced, { messages: [] });
ok("```json 围栏解析");

// 1c. 前后混入解释文字
const noisy = extractJson('好的，识别结果如下：\n{"conversation_title":"雅思咨询","messages":[],"uncertainties":[]}\n希望有帮助！');
assert.equal((noisy as { conversation_title: string }).conversation_title, "雅思咨询");
ok("带前后说明文字的 JSON 提取");

// 1d. 完全非法输出抛错
assert.throws(() => extractJson("模型胡言乱语没有 JSON"));
ok("非法输出正确抛错");

// ---- 2. Schema 校验 ----
const valid = {
  conversation_title: "雅思课程咨询",
  messages: [
    { order: 1, sender_role: "customer", content: "你好，我想了解雅思课程", timestamp: "2026-11-03 14:20", source_image_index: 1 },
    { order: 2, sender_role: "advisor", content: "您好！方便说下目前基础吗？", timestamp: null, source_image_index: 1 },
    { order: 3, sender_role: "unknown", content: "[语音消息]", note: "发言方无法确定", source_image_index: 2 },
  ],
  uncertainties: ["第3条发言方无法确定"],
  duplicates_removed: 1,
};
const parsed = recognitionResultSchema.parse(valid);
assert.equal(parsed.messages.length, 3);
assert.equal(parsed.messages[2].sender_role, "unknown");
ok("合法识别结果通过 Schema 校验");

// 非法角色应拒绝
assert.throws(() => recognitionResultSchema.parse({ messages: [{ order: 1, sender_role: "老板", content: "x" }] }));
ok("非法发言方角色被 Schema 拒绝");

// ---- 3. 相邻重复合并 + 顺序重排 ----
// 真实重叠场景：截图1 以 A、B 结尾，截图2 重复了 B 再继续 C，截图3 重复了 C 再继续 D
const overlapping: RecognizedMessage[] = [
  { order: 1, sender_role: "customer", content: "A" },
  { order: 2, sender_role: "advisor", content: "B" },
  { order: 3, sender_role: "advisor", content: "B" }, // 相邻重复（截图2 开头）
  { order: 4, sender_role: "customer", content: "C" },
  { order: 5, sender_role: "customer", content: "C" }, // 相邻重复（截图3 开头）
  { order: 6, sender_role: "advisor", content: "D" },
];
const merged = mergeNearDuplicates(overlapping);
assert.equal(merged.length, 4);
assert.equal(merged[0].content, "A");
assert.equal(merged[1].content, "B");
assert.equal(merged[2].content, "C");
assert.equal(merged[3].content, "D");
assert.equal(merged[0].order, 1);
assert.equal(merged[3].order, 4); // 顺序重新编号
ok("相邻重复消息合并（重叠截图场景）");

// 不相邻的重复不应合并
const nonAdjacent: RecognizedMessage[] = [
  { order: 1, sender_role: "customer", content: "X" },
  { order: 2, sender_role: "advisor", content: "Y" },
  { order: 3, sender_role: "customer", content: "X" },
];
assert.equal(mergeNearDuplicates(nonAdjacent).length, 3);
ok("不相邻重复消息保持独立");

// 乱序输入仍能按 order 重建
const shuffled: RecognizedMessage[] = [
  { order: 3, sender_role: "customer", content: "C" },
  { order: 1, sender_role: "customer", content: "A" },
  { order: 2, sender_role: "advisor", content: "B" },
];
assert.deepEqual(mergeNearDuplicates(shuffled).map((m) => m.content), ["A", "B", "C"]);
ok("乱序输入按 order 重建对话");

// ---- 4. 时间解析 ----
assert.equal(parseTimestamp("2026-11-03 14:20")?.getHours(), 14);
assert.equal(parseTimestamp("2026-11-03 14:20")?.getMonth(), 10); // 0 起
assert.equal(parseTimestamp("不是时间"), null);
assert.equal(parseTimestamp(null), null);
ok("时间解析与非法输入兜底");

// ---- 5. 角色映射 ----
assert.equal(toDbSenderRole("advisor"), "ADVISOR");
assert.equal(toDbSenderRole("customer"), "CUSTOMER");
assert.equal(toDbSenderRole("unknown"), "UNKNOWN");
ok("发言方角色映射到数据库枚举");

console.log(`\n全部通过：${passed} 项断言`);
