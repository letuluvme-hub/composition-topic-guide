// 分批导出素材，供人工/LLM 标注。格式：序号\t素材\t出处题名
// 用法：node tools/dump-mats.mjs <起始序号> <数量>
import { sandbox as win } from './harness.mjs';
const T = win.__T;
const MATS = T.matIndex();
const from = Number(process.argv[2] || 0);
const count = Number(process.argv[3] || 200);

console.log(`# 共 ${MATS.length} 条，本次 ${from}–${Math.min(from + count, MATS.length) - 1}`);
for (let i = from; i < Math.min(from + count, MATS.length); i++) {
  const x = MATS[i];
  // 题名压到 10 字：它只是标注时的上下文提示，不是主要信息
  const t = x.t.replace(/[《》{}]/g, '').slice(0, 10);
  console.log(`${i}\t${x.m}\t${t}`);
}
