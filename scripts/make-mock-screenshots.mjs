// 生成合成微信聊天截图（用于未配置 API Key 时验证识别全流程）
// 三张连续截图，相邻截图存在重叠消息（测试去重合并）；使用 Chrome headless 渲染
// 用法：node scripts/make-mock-screenshots.mjs <输出目录>（默认 /tmp/wechat-mock）
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const outDir = process.argv[2] || "/tmp/wechat-mock";
mkdirSync(outDir, { recursive: true });

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function bubble(msg, role, time, isFirst) {
  const left = role === "customer";
  const align = left ? "flex-start" : "flex-end";
  const avatar = left
    ? '<div class="avatar avatar-c">客</div>'
    : '<div class="avatar avatar-a">顾</div>';
  const bubbleClass = left ? "bubble-left" : "bubble-right";
  const avatarOrder = left ? "0" : "1";
  return `
  <div class="msg-row" style="justify-content:${align}">
    ${avatar}
    <div class="msg-body" style="order:${avatarOrder}">
      ${isFirst ? `<div class="time">${time}</div>` : ""}
      <div class="bubble ${bubbleClass}">${msg.replace(/\n/g, "<br/>")}</div>
    </div>
  </div>`;
}

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:420px; }
  body { font-family:-apple-system,"PingFang SC","Helvetica Neue",sans-serif; background:#EDEDED; }
  .statusbar { height:24px; background:#EDEDED; display:flex; align-items:center; justify-content:space-between; padding:0 14px; font-size:12px; color:#000; font-weight:600; }
  .nav { height:44px; background:#EDEDED; display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:600; color:#111; border-bottom:0.5px solid #d6d6d6; }
  .chat { padding:16px 12px 24px; display:flex; flex-direction:column; gap:18px; }
  .msg-row { display:flex; gap:8px; align-items:flex-start; }
  .avatar { width:38px; height:38px; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px; font-weight:600; flex-shrink:0; }
  .avatar-c { background:#FFB300; }
  .avatar-a { background:#07C160; }
  .msg-body { max-width:280px; display:flex; flex-direction:column; gap:4px; }
  .time { font-size:11px; color:#999; text-align:center; align-self:center; padding:2px 0; }
  .bubble { padding:9px 12px; font-size:16px; line-height:1.5; color:#111; word-break:break-word; }
  .bubble-left { background:#fff; border-top-left-radius:3px; border-top-right-radius:8px; border-bottom-right-radius:8px; border-bottom-left-radius:8px; }
  .bubble-right { background:#95EC69; border-top-left-radius:8px; border-top-right-radius:3px; border-bottom-right-radius:8px; border-bottom-left-radius:8px; }
</style>
</head>
<body>
  <div class="statusbar"><span>09:30</span><span>● 5G 100%</span></div>
  <div class="nav">${title}</div>
  <div class="chat">${body}</div>
</body>
</html>`;
}

// 三张连续截图：相邻截图尾部消息重叠
const shots = [
  {
    title: "雅思咨询 - 顾问小王",
    rows: [
      ["customer", "老师您好，我想咨询雅思课程", "09:30", true],
      ["advisor", "您好！请问您目前的基础和目标分数是？", "09:31", false],
      ["customer", "基础一般，目标是6.5", "09:32", false],
    ],
  },
  {
    title: "雅思咨询 - 顾问小王",
    rows: [
      ["advisor", "您好！请问您目前的基础和目标分数是？", "09:31", true],
      ["customer", "基础一般，目标是6.5", "09:32", false],
      ["advisor", "明白，6.5 是很多院校硕士申请的基础线。方便说下您大概什么时候考试吗？", "09:33", false],
    ],
  },
  {
    title: "雅思咨询 - 顾问小王",
    rows: [
      ["advisor", "明白，6.5 是很多院校硕士申请的基础线。方便说下您大概什么时候考试吗？", "09:33", true],
      ["customer", "打算明年3月考，来得及吗？", "09:35", false],
      ["advisor", "来得及，一般建议预留 3-6 个月备考。我整理一份规划发给您参考。", "09:36", false],
    ],
  },
];

shots.forEach((shot, i) => {
  const body = shot.rows
    .map(([role, msg, time, first]) => bubble(msg, role, time, first))
    .join("");
  const html = page(shot.title, body);
  const htmlPath = path.join(outDir, `shot${i + 1}.html`);
  const pngPath = path.join(outDir, `shot${i + 1}.png`);
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    "--headless=new",
    "--hide-scrollbars",
    `--window-size=420,880`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  console.log(`生成截图 ${i + 1}: ${pngPath}`);
});
