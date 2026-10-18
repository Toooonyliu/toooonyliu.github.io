// Server side of 找那一餐 with scripted stand-in models (no network). The real
// platform model must still be verified in the REDcowork preview.
import test from "node:test";
import assert from "node:assert/strict";
import { authorize, runRecall, sanitize, standInAnswer, ME } from "../server/recall-service.ts";
import { seedMeals, users, venues } from "../src/data.ts";

const friends = ["maya", "eric", "anika", "jordan"];
const clientRecords = seedMeals
  .filter(m => m.userId === ME || (friends.includes(m.userId) && m.audience !== "private"))
  .map(m => {
    const venue = venues.find(v => v.id === m.venueId);
    return { id: m.id, authorId: m.userId, author: users.find(u => u.id === m.userId)?.name, food: m.food, foodZh: m.foodZh, note: m.note, noteZh: m.noteZh,
      date: m.date, time: m.time, type: m.type, audience: m.audience, ...(venue ? { venue: { id: venue.id, name: venue.name, area: venue.area, cuisine: venue.cuisine } } : {}) };
  });
const body = (query, extra = {}) => ({ query, scope: "friends", lang: "zh", today: "2026-10-18", records: clientRecords, network: { friends, hidden: [] }, ...extra });
const scripted = (...replies) => {
  const calls = [];
  return { calls, engine: { kind: "platform", chat: async messages => { calls.push(messages); const next = replies.shift(); return { text: typeof next === "function" ? next(messages) : next, model: "test-model" }; } } };
};
const ok = (matches, extra = {}) => JSON.stringify({ status: matches.length ? "matches" : "empty", matches, unresolved: [], clarification: null, ...extra });

test("authorization comes from the server copy, not the browser", () => {
  const tampered = clientRecords.map(r => r.id === "maya-yesterday" ? { ...r, noteZh: "伪造的留言" } : r);
  const extra = [
    { id: "chloe-private", authorId: "chloe", food: "x", date: "2026-10-18", time: "19:00", type: "restaurant" },
    { id: "fake-friend-post", authorId: "maya", food: "Invented", date: "2026-10-18", time: "12:00", type: "other" },
    { id: "my-new-post", authorId: ME, food: "Late-night noodles", foodZh: "深夜泡面", date: "2026-10-18", time: "23:00", type: "homemade", audience: "friends" },
  ];
  const req = authorize(body("测试", { records: [...tampered, ...extra] }));
  const ids = req.records.map(r => r.id);
  assert.ok(!ids.includes("chloe-private") && !ids.includes("fake-friend-post"));
  assert.ok(ids.includes("my-new-post"), "own new posts from this browser are accepted");
  assert.equal(req.records.find(r => r.id === "maya-yesterday").noteZh, "爸妈来看我，带他们吃了这家，他们很喜欢。");
  const hidden = authorize(body("测试", { network: { friends, hidden: ["maya"] } }));
  assert.ok(hidden.records.every(r => r.authorId !== "maya"));
  const noPriya = authorize(body("测试", { records: [{ id: "priya-breakfast", authorId: "priya" }] }));
  assert.equal(noPriya.records.length, 0, "a pending request grants nothing until accepted");
});

test("a grounded model answer comes back with reason and verbatim evidence; the prompt is minimized", async () => {
  const s = scripted(ok([{ mealId: "maya-yesterday", reason: "Maya 带爸妈来过这家", evidence: [{ field: "noteZh", quote: "爸妈来看我，带他们吃了这家" }] }]));
  const { result, meta } = await runRecall(body("Maya 带爸妈去的那家"), s.engine);
  assert.equal(result.mode, "model");
  assert.deepEqual(result.matches.map(m => m.mealId), ["maya-yesterday"]);
  assert.equal(result.matches[0].reason, "Maya 带爸妈来过这家");
  assert.equal(meta.model, "test-model");
  const prompt = JSON.parse(s.calls[0][1].content);
  assert.ok(prompt.candidates.every(c => c.id && !("photo" in c) && !("audience" in c) && !("authorId" in c)));
  assert.ok(prompt.candidates.every(c => c.author === "Maya Chen"), "named friend is a hard filter before the model");
  assert.equal(prompt.today, "2026-10-18");
});

test("fabricated quotes, unknown IDs and out-of-filter records are dropped, never repaired", async () => {
  const s = scripted(ok([
    { mealId: "maya-yesterday", reason: "r", evidence: [{ field: "noteZh", quote: "Maya 说适合约会" }] },
    { mealId: "made-up-id", reason: "r", evidence: [{ field: "food", quote: "Sushi" }] },
    { mealId: "jordan-noodles", reason: "r", evidence: [{ field: "noteZh", quote: "庆祝拿到实习 offer" }] },
  ]));
  const { result, meta } = await runRecall(body("Maya 带爸妈去的那家"), s.engine);
  assert.equal(result.status, "empty");
  assert.equal(meta.dropped, 3);
});

test("unsupported conditions stay unresolved; model unresolved must be the user's own words", async () => {
  const s = scripted(ok([{ mealId: "maya-dumplings", reason: "Maya 吃的寿司", evidence: [{ field: "venue.cuisine", quote: "Japanese · Sushi" }] }], { unresolved: ["适合两个人", "便宜一点"] }));
  const { result } = await runRecall(body("Maya 吃过的日料，适合两个人吗"), s.engine);
  assert.deepEqual(result.unresolved, ["适合两个人"]);
  assert.ok(result.matches.length === 1);
});

test("clarify keeps a model question only if it is a short question", async () => {
  const s = scripted(JSON.stringify({ status: "clarify", matches: [], unresolved: [], clarification: "你记得是哪位朋友发的吗？" }));
  assert.equal((await runRecall(body("那个"), s.engine)).result.clarification, "你记得是哪位朋友发的吗？");
  const bad = scripted(JSON.stringify({ status: "clarify", matches: [], unresolved: [], clarification: "这家店很便宜。" }));
  assert.match((await runRecall(body("那个"), bad.engine)).result.clarification, /[?？]$/);
});

test("one retry on broken JSON, then a clear failure", async () => {
  const s = scripted("好的，我来找一下", ok([{ mealId: "eric-breakfast", reason: "Eric 感冒时喝的蛋汤", evidence: [{ field: "noteZh", quote: "感冒刚好" }] }]));
  assert.equal((await runRecall(body("感冒的时候喝的汤"), s.engine)).result.matches[0].mealId, "eric-breakfast");
  const broken = scripted("not json", "still not json");
  await assert.rejects(runRecall(body("感冒的时候喝的汤"), broken.engine), /JSON/);
});

test("no candidates means no model call", async () => {
  const s = scripted();
  const { result } = await runRecall(body("Alex 的寿司", { scope: "mine", records: [] }), s.engine);
  assert.equal(result.status, "empty");
  assert.equal(s.calls.length, 0);
});

test("dev stand-in is labeled local end to end", async () => {
  const { result, meta } = await runRecall(body("Maya 之前吃的寿司"), { kind: "stand-in", chat: async m => ({ text: standInAnswer(m.at(-1).content) }) });
  assert.equal(result.mode, "local");
  assert.equal(meta.engine, "stand-in");
  assert.ok(result.matches.some(m => m.mealId === "maya-dumplings"));
});
