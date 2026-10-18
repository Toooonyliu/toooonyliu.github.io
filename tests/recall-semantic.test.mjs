// Runs the REAL on-device model (bge-small-zh-v1.5 int8, onnxruntime-web wasm) in Node.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as ort from "onnxruntime-web";
import { createOrtEmbedder } from "../src/recall/embedder.ts";
import { semanticRecall } from "../src/recall/semantic.ts";
import { recallPlan, validateModelResponse } from "../src/recall/engine.ts";
import { WordPieceTokenizer } from "../src/recall/tokenizer.ts";
import { seedMeals, users, venues } from "../src/data.ts";

ort.env.wasm.numThreads = 1;
const dir = "public/models/bge-small-zh-v1.5/";
const vocab = await readFile(dir + "vocab.txt", "utf8");
const embed = await createOrtEmbedder(ort, new Uint8Array(await readFile(dir + "model_int8.onnx")), vocab);

const friends = new Set(["maya", "eric", "anika", "jordan"]);
const records = seedMeals
  .filter(meal => meal.userId === "daniel" || (friends.has(meal.userId) && meal.audience !== "private"))
  .map(meal => {
    const venue = venues.find(item => item.id === meal.venueId);
    return { id: meal.id, authorId: meal.userId, author: users.find(user => user.id === meal.userId)?.name ?? meal.userId,
      food: meal.food, foodZh: meal.foodZh, note: meal.note, noteZh: meal.noteZh, date: meal.date, time: meal.time,
      type: meal.type, audience: meal.audience, ...(venue ? { venue: { id: venue.id, name: venue.name, area: venue.area, cuisine: venue.cuisine } } : {}) };
  });
const request = (query, scope = "friends") => ({ query, records, lang: "zh", scope, currentUserId: "daniel" });
async function run(query, scope) {
  const req = request(query, scope);
  const response = await semanticRecall(req, embed);
  assert.ok(validateModelResponse(response, req), `response must pass the provenance validator: ${query}`);
  return response;
}
const ids = response => response.matches.map(match => match.mealId);

test("tokenizer matches bert-base-chinese conventions", () => {
  const tokenizer = new WordPieceTokenizer(vocab);
  const { ids: encoded } = tokenizer.encode("Maya吃的寿司!");
  assert.equal(encoded[0], 101); assert.equal(encoded.at(-1), 102);
  assert.ok(encoded.includes(2195) && encoded.includes(1385), "寿/司 are single CJK tokens");
  assert.ok(!encoded.includes(100), "no [UNK] for ordinary text");
});

test("paraphrased memories find the right friend's post (not keyword matches)", async () => {
  const cases = {
    "Maya 带爸妈去的那家": "maya-yesterday",
    "有人庆祝拿到 offer 去吃的": "jordan-noodles",
    "感冒的时候喝的汤": "eric-breakfast",
    "看球的时候吃的": "friend-history-3",
    "Anika 第一次约会去的地方": "friend-history-6",
    "椰子味的饭": "friend-history-2",
    "考完试吃的": "friend-history-4",
  };
  for (const [query, expected] of Object.entries(cases)) {
    const response = await run(query);
    assert.equal(response.mode, "model");
    assert.equal(ids(response)[0], expected, query);
  }
});

test("unrelated questions return empty instead of a padded answer", async () => {
  for (const query of ["量子力学", "汽车保养", "下雨天吃的那碗面"]) assert.equal((await run(query)).status, "empty", query);
});

test("hard rules stay in code: author, negation and unsupported conditions", async () => {
  const response = await run("Maya 吃过的日料，适合两个人吗");
  assert.ok(response.matches.length > 0);
  for (const id of ids(response)) assert.equal(records.find(record => record.id === id).authorId, "maya");
  assert.deepEqual(response.unresolved, ["适合两个人"]);
  assert.equal((await run("不要寿司的日料")).status, "empty");
  const plan = recallPlan(request("除了 Maya 的早午餐"));
  assert.ok(plan.candidates.every(record => record.authorId !== "maya"));
});

test("friends scope never returns my records; mine scope keeps my private memories mine", async () => {
  const friendsOnly = await run("自己做的红烧肉");
  for (const id of ids(friendsOnly)) assert.notEqual(records.find(record => record.id === id).authorId, "daniel");
  const mine = await run("自己做的红烧肉", "mine");
  assert.ok(mine.matches.length > 0);
  for (const id of ids(mine)) assert.equal(records.find(record => record.id === id).authorId, "daniel");
});

test("a bare friend name lists that friend's latest posts; empty input asks for a clue", async () => {
  const response = await run("Jordan 吃过的");
  assert.ok(response.matches.length > 0);
  assert.ok(response.matches.every(match => match.evidence[0].field === "author"));
  assert.equal((await run("帮我找找")).status, "clarify");
});
