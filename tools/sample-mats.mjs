// 为设计概念体系抽样素材：跨体裁、随机但可复现。
import { sandbox as win } from './harness.mjs';
const T = win.__T;
const MATS = T.matIndex();
// 固定步长抽样，保证每次看到的是同一批
const stride = 29;
const picked = [];
for (let i = 0; i < MATS.length; i += stride) picked.push(MATS[i]);

const byGenre = {};
for (const x of picked) (byGenre[x.g] ||= []).push(x);

for (const [g, arr] of Object.entries(byGenre)) {
  console.log('\n' + '█'.repeat(72));
  console.log(`  ${T.G[g].nm}（抽样 ${arr.length} 条）`);
  console.log('█'.repeat(72));
  for (const x of arr) console.log(`  · ${x.m}\n      ← ${x.t}`);
}
console.log(`\n共抽样 ${picked.length} / ${MATS.length} 条`);
