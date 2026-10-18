// Runs the real on-device model in Node (onnxruntime-web wasm) against the demo records.
import { readFile } from "node:fs/promises";
import * as ort from "onnxruntime-web";
import { createOrtEmbedder } from "../src/recall/embedder.ts";
import { scoreCandidates, semanticRecall } from "../src/recall/semantic.ts";
import { validateModelResponse } from "../src/recall/engine.ts";
import { seedMeals, users, venues } from "../src/data.ts";

ort.env.wasm.numThreads = 1;
const model = new Uint8Array(await readFile("public/models/bge-small-zh-v1.5/model_int8.onnx"));
const vocab = await readFile("public/models/bge-small-zh-v1.5/vocab.txt", "utf8");
const embed = await createOrtEmbedder(ort, model, vocab);
const network = { friends: ["maya", "eric", "anika", "jordan"] }; // = socialGraph.initialNetwork()
const canReadMeal = m => m.userId === "daniel" || m.audience !== "private";
export const records = seedMeals.filter(m => (m.userId === "daniel" || network.friends.includes(m.userId)) && canReadMeal(m)).map(meal => {
  const venue = venues.find(v => v.id === meal.venueId);
  return { id: meal.id, authorId: meal.userId, author: users.find(u => u.id === meal.userId)?.name || meal.userId,
    food: meal.food, foodZh: meal.foodZh, note: meal.note, noteZh: meal.noteZh, date: meal.date, time: meal.time, type: meal.type, audience: meal.audience,
    ...(venue ? { venue: { id: venue.id, name: venue.name, area: venue.area, cuisine: venue.cuisine } } : {}) };
});
const queries = process.argv.slice(2).length ? process.argv.slice(2) : [
  "Maya 之前吃的寿司", "有人发过热乎乎的汤", "朋友在家做的肉菜", "下雨天适合吃的东西", "吃辣的那家", "Eric 的早饭", "不要寿司的日料", "我想吃烤肉",
  "朋友吃过的早午餐", "生鱼片", "椰子味的饭", "适合两个人的牛排", "量子力学", "汽车保养", "Anika 推荐的健康餐", "深夜在家喝啤酒",
];
const show = r => `${r.id}[${r.foodZh || r.food}|${r.venue?.cuisine || r.type}]`;
for (const scope of [process.env.SCOPE || "all"]) for (const q of queries) {
  const request = { query: q, records, lang: "zh", scope, currentUserId: "daniel" };
  const { plan, scored } = await scoreCandidates(request, embed);
  const res = await semanticRecall(request, embed);
  const ok = validateModelResponse(res, request) ? "valid" : "INVALID";
  console.log(`\n## ${q}  → text="${plan.semanticText}" ${res.status} ${ok} unresolved=${JSON.stringify(res.unresolved)}`);
  console.log("  top:", scored.slice(0, 6).map(s => `${s.score.toFixed(3)} ${show(s.record)}`).join("\n       "));
  console.log("  kept:", res.matches.map(m => m.mealId + " " + m.evidence.map(e => e.field + "=" + e.quote).join(" / ")).join("\n        "));
}
