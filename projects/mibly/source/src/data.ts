// Real venue identities and user-supplied meal photos; fictional people and histories.
export type Lang = "en" | "zh";
export const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const DEMO_TODAY = localDay(new Date());
export type Verdict = "love" | "return" | "okay" | "no";
export type MealType = "restaurant" | "homemade" | "delivery" | "other";
export type Meal = {
  id: string;
  userId: string;
  food: string;
  foodZh?: string;
  verdict: Verdict;
  type: MealType;
  venueId?: string;
  place?: string;
  placeZh?: string;
  photo?: string;
  note?: string;
  noteZh?: string;
  date: string;
  time: string;
  audience: "friends" | "private";
  discoverable?: boolean;
  recommendedTo?: string[];
};
export type User = { id: string; name: string; avatar: string };
export type Venue = {
  id: string;
  name: string;
  area: string;
  address: string;
  url: string;
  cuisine: string;
  price: number | null;
  photo: string;
};
export const tr = (lang: Lang, en: string, zh: string) =>
  lang === "zh" ? zh : en;
const img = (name: string) => `/assets/food/${name}.jpg`;
export const users: User[] = [
  { id: "maya", name: "Maya Chen", avatar: img("maya") },
  { id: "daniel", name: "Daniel Park", avatar: img("daniel") },
  { id: "eric", name: "Eric Wu", avatar: img("eric") },
  { id: "anika", name: "Anika Shah", avatar: img("anika") },
  { id: "jordan", name: "Jordan Ellis", avatar: img("jordan") },
  { id: "chloe", name: "Chloe Lin", avatar: "" },
  { id: "noah", name: "Noah Kim", avatar: "" },
  { id: "priya", name: "Priya Rao", avatar: "" },
];
const venue = (
  id: string,
  name: string,
  area: string,
  address: string,
  cuisine: string,
  price: number | null,
  photo: string,
): Venue => ({
  id,
  name,
  area,
  address,
  cuisine,
  price,
  photo: img(photo),
  url:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(name + " " + address),
});
export const venues: Venue[] = [
  { ...venue("kura_sushi", "Kura Revolving Sushi Bar", "South Side", "415 Cinema Dr, Pittsburgh, PA 15203", "Japanese · Sushi", null, "dumplings"), photo: "/assets/meals/kura-sushi.jpg" },
  { ...venue("speckled_egg", "The Speckled Egg", "Downtown", "501 Grant Street, Pittsburgh, PA 15219", "Breakfast & brunch", null, "eggs"), photo: "/assets/meals/speckled-egg.jpg" },
  { ...venue("meat_potatoes", "Meat & Potatoes", "Downtown", "649 Penn Avenue, Pittsburgh, PA 15222", "American · Gastropub", null, "grilled"), photo: "/assets/meals/wellington.jpg" },
  venue(
    "everyday_noodles",
    "Everyday Noodles",
    "Squirrel Hill",
    "5875 Forbes Avenue, Pittsburgh, PA 15217",
    "Chinese · Noodles & dumplings",
    16,
    "dumplings",
  ),
  venue(
    "noodlehead",
    "Noodlehead",
    "Shadyside",
    "242 South Highland Ave., Pittsburgh, PA 15206",
    "Thai-inspired noodles",
    15.75,
    "noodles",
  ),
  venue(
    "apteka",
    "APTEKA",
    "Bloomfield",
    "4606 Penn Ave, Pittsburgh, PA 15224",
    "Vegan · Central & Eastern European",
    null,
    "salad",
  ),
  venue(
    "pamelas_strip",
    "Pamela’s Diner",
    "Strip District",
    "60 21st St, Pittsburgh, PA 15222",
    "American diner · Breakfast",
    12.99,
    "breakfast",
  ),
  venue(
    "pusadees_garden",
    "Pusadee’s Garden",
    "Lawrenceville",
    "5319 Butler Street, Pittsburgh, PA 15201",
    "Thai",
    29,
    "curry",
  ),
  venue(
    "gaucho",
    "Gaucho Parrilla Argentina",
    "Downtown",
    "146 Sixth Street, Pittsburgh, PA 15222",
    "Argentine-inspired wood-fired grill",
    19,
    "grilled",
  ),
];
export function verdictLabel(v: Verdict, type: MealType, lang: Lang) {
  if (v === "love") return tr(lang, "Highly recommend", "强烈推荐");
  if (v === "okay") return tr(lang, "Just okay", "还可以");
  if (v === "no")
    return tr(
      lang,
      type === "homemade"
        ? "Wouldn’t make again"
        : type === "delivery"
          ? "Wouldn’t order again"
          : type === "restaurant"
            ? "Wouldn’t return"
            : "Not again",
      type === "homemade"
        ? "不会再做"
        : type === "delivery"
          ? "不会再点"
          : type === "restaurant"
            ? "不会再来"
            : "不想再吃",
    );
  return tr(
    lang,
    type === "homemade"
      ? "Would make again"
      : type === "delivery"
        ? "Would order again"
        : type === "restaurant"
          ? "Would return"
          : "Would have again",
    type === "homemade"
      ? "还会再做"
      : type === "delivery"
        ? "还会再点"
        : type === "restaurant"
          ? "还会再来"
          : "想再吃",
  );
}
export function typeLabel(type: MealType, lang: Lang) {
  return tr(
    lang,
    {
      restaurant: "Restaurant",
      homemade: "Homemade",
      delivery: "Delivery",
      other: "Elsewhere",
    }[type],
    {
      restaurant: "餐厅",
      homemade: "自己做的",
      delivery: "外卖",
      other: "其他地点",
    }[type],
  );
}
export const seedCollections = [
  { id: "weeknight", name: "Weeknight favorites", venueIds: ["noodlehead"] },
  {
    id: "friends-coming",
    name: "When friends visit",
    venueIds: ["apteka", "pusadees_garden"],
  },
];
const baseMeals: Meal[] = [
  {
    id: "maya-dumplings",
    userId: "maya",
    food: "Soup dumplings, finally.",
    foodZh: "终于吃到心心念念的小笼包。",
    verdict: "love",
    type: "restaurant",
    venueId: "everyday_noodles",
    photo: img("dumplings"),
    note: "Daniel, this is the spot I told you about.",
    noteZh: "Daniel，这就是我跟你提过的那家店。",
    date: "2026-10-03",
    time: "12:24",
    audience: "friends",
    recommendedTo: ["daniel"],
  },
  {
    id: "daniel-pasta",
    userId: "daniel",
    food: "Homemade tomato pasta",
    foodZh: "自己做的番茄意面",
    verdict: "return",
    type: "homemade",
    photo: img("pasta"),
    note: "Simple, but so good.",
    noteZh: "简单，但真的很好吃。",
    date: "2026-10-03",
    time: "09:08",
    audience: "friends",
  },
  {
    id: "eric-breakfast",
    userId: "eric",
    food: "Eggs on toast before studio",
    foodZh: "去工作室前吃了吐司煎蛋",
    verdict: "okay",
    type: "homemade",
    photo: img("eggs"),
    note: "A quiet breakfast at home.",
    noteZh: "在家安静吃了顿早餐。",
    date: "2026-10-03",
    time: "10:18",
    audience: "friends",
  },
  {
    id: "anika-salad",
    userId: "anika",
    food: "Lunch with all the greens",
    foodZh: "满满绿色的一顿午餐",
    verdict: "love",
    type: "restaurant",
    venueId: "apteka",
    photo: img("salad"),
    note: "A place to bring someone who thinks plants are boring.",
    noteZh: "想带觉得蔬菜无聊的朋友来试试。",
    date: "2026-10-03",
    time: "13:05",
    audience: "friends",
  },
  {
    id: "jordan-noodles",
    userId: "jordan",
    food: "Noodles after class",
    foodZh: "下课后的炒面",
    verdict: "return",
    type: "other",
    place: "Schenley Plaza",
    placeZh: "申利广场",
    photo: img("noodles"),
    note: "A quick bowl outside after class.",
    noteZh: "下课后在外面快速吃了碗面。",
    date: "2026-10-03",
    time: "16:20",
    audience: "friends",
  },
  {
    id: "maya-curry",
    userId: "maya",
    food: "A little dinner worth planning",
    foodZh: "值得安排一下的晚餐",
    verdict: "love",
    type: "restaurant",
    venueId: "pusadees_garden",
    photo: img("curry"),
    note: "Saving this one for another dinner together.",
    noteZh: "想留着下次和朋友一起来。",
    date: "2026-09-30",
    time: "19:30",
    audience: "friends",
  },
  {
    id: "daniel-oct2",
    userId: "daniel",
    food: "Leftovers, upgraded",
    foodZh: "升级版剩饭",
    verdict: "return",
    type: "homemade",
    photo: img("salad"),
    date: "2026-10-02",
    time: "18:15",
    audience: "private",
  },
  {
    id: "daniel-oct1",
    userId: "daniel",
    food: "A familiar bowl",
    foodZh: "熟悉的那碗面",
    verdict: "return",
    type: "delivery",
    venueId: "noodlehead",
    photo: img("noodles"),
    date: "2026-10-01",
    time: "12:35",
    audience: "private",
  },
];
const archiveDays = [1, 3, 5, 7, 9, 12, 14, 16, 18, 20, 22, 25, 27, 29, 30];
const archive = archiveDays.map((day, i): Meal => ({
  id: `memory-sep-${day}`,
  userId: "daniel",
  food: [
    "Eggs on toast",
    "Noodles for lunch",
    "A good breakfast",
    "A little green bowl",
    "Tomato pasta",
  ][i % 5],
  foodZh: ["吐司与鸡蛋", "午餐吃面", "好好吃顿早饭", "一碗绿色", "番茄意面"][
    i % 5
  ],
  verdict: i % 4 === 0 ? "love" : "return",
  type: day === 25 ? "homemade" : i % 3 === 0 ? "restaurant" : "homemade",
  ...(i % 3 === 0 && day !== 25
    ? { venueId: i % 2 ? "noodlehead" : "pamelas_strip" }
    : {}),
  ...(day === 9
    ? {}
    : {
        photo: img(["eggs", "noodles", "breakfast", "salad", "pasta"][i % 5]),
      }),
  date: `2026-09-${String(day).padStart(2, "0")}`,
  time: day === 25 ? "08:42" : "12:30",
  audience: "private",
}));
const sep25 = archive.find((m) => m.date === "2026-09-25")!;
sep25.food = "Eggs on toast";
sep25.foodZh = "吐司与鸡蛋";
sep25.photo = img("eggs");
sep25.verdict = "return";
archive.push(
  {
    id: "memory-sep25-lunch",
    userId: "daniel",
    food: "Soup dumplings",
    foodZh: "小笼包",
    verdict: "love",
    type: "restaurant",
    venueId: "everyday_noodles",
    photo: img("dumplings"),
    date: "2026-09-25",
    time: "12:24",
    audience: "private",
  },
  {
    id: "memory-sep25-dinner",
    userId: "daniel",
    food: "The five-ingredient pasta",
    foodZh: "五种食材的意面",
    verdict: "return",
    type: "homemade",
    photo: img("pasta"),
    date: "2026-09-25",
    time: "19:05",
    audience: "private",
  },
);
export const seedMeals: Meal[] = [
  ...baseMeals.map((meal) => {
    const day = new Date();
    const age = Math.round((new Date("2026-10-03T12:00:00").getTime() - new Date(`${meal.date}T12:00:00`).getTime()) / 86400000);
    day.setDate(day.getDate() - age);
    return { ...meal, date: localDay(day) };
  }),
  { id: "maya-yesterday", userId: "maya", food: "A dinner worth slowing down for", foodZh: "值得慢慢享用的晚餐", verdict: "love", type: "restaurant", venueId: "pusadees_garden", photo: img("curry"), date: localDay(new Date(new Date().setDate(new Date().getDate() - 1))), time: "19:30", audience: "friends" },
  { id: "eric-yesterday", userId: "eric", food: "Breakfast for a slow morning", foodZh: "慢悠悠的早餐", verdict: "return", type: "restaurant", venueId: "pamelas_strip", photo: img("breakfast"), date: localDay(new Date(new Date().setDate(new Date().getDate() - 1))), time: "10:10", audience: "friends" },
  ...archive,
];
const daysAgo = (age: number) => {
  const date = new Date(); date.setDate(date.getDate() - age); return localDay(date);
};
seedMeals.push(
  {id:"chloe-noodles",userId:"chloe",food:"A spicy little lunch",foodZh:"有点辣的午餐",verdict:"love",type:"restaurant",venueId:"noodlehead",photo:img("noodles"),date:daysAgo(0),time:"12:40",audience:"friends",discoverable:true},
  {id:"noah-grill",userId:"noah",food:"A lunch worth crossing town for",foodZh:"值得穿过半座城的午餐",verdict:"return",type:"restaurant",venueId:"gaucho",photo:img("grilled"),date:daysAgo(0),time:"13:20",audience:"friends",discoverable:true},
  {id:"priya-breakfast",userId:"priya",food:"Slow breakfast at Pamela’s",foodZh:"在Pamela’s慢慢吃早餐",verdict:"love",type:"restaurant",venueId:"pamelas_strip",photo:img("breakfast"),date:daysAgo(0),time:"09:45",audience:"friends",discoverable:true},
  {id:"chloe-home",userId:"chloe",food:"Pasta at home with my roommate",foodZh:"在家和室友吃意面",verdict:"return",type:"homemade",photo:img("pasta"),date:daysAgo(0),time:"18:20",audience:"friends"},
  {id:"chloe-private",userId:"chloe",food:"A private food memory",foodZh:"一条私密美食回忆",verdict:"return",type:"restaurant",venueId:"apteka",date:daysAgo(0),time:"19:00",audience:"private",discoverable:true},
  ...Array.from({length:8},(_,index):Meal=>({id:`friend-history-${index}`,userId:["maya","eric","anika","jordan"][index%4],food:["Dumplings after class","A good breakfast","Greens with friends","Noodles on a rainy day"][index%4],foodZh:["下课后的小笼包","好好吃顿早饭","和朋友吃蔬菜","雨天来碗面"][index%4],verdict:"return",type:"restaurant",venueId:["everyday_noodles","pamelas_strip","apteka","noodlehead"][index%4],photo:img(["dumplings","breakfast","salad","noodles"][index%4]),date:daysAgo(index+2),time:"12:10",audience:"friends"})),
);

// Keep stable IDs for saved replies and reactions. Meal dates, authors and branches
// are demonstration scenarios, not claims about the people in the source photos.
const realStories: Partial<Meal>[] = [
  { food: "One more plate at Kura", foodZh: "在Kura再吃一盘", type: "restaurant", venueId: "kura_sushi", photo: "/assets/meals/kura-sushi.jpg" },
  { food: "A slow brunch at The Speckled Egg", foodZh: "在The Speckled Egg慢慢吃早午餐", type: "restaurant", venueId: "speckled_egg", photo: "/assets/meals/speckled-egg.jpg" },
  { food: "Wellington with friends", foodZh: "和朋友一起吃惠灵顿牛排", type: "restaurant", venueId: "meat_potatoes", photo: "/assets/meals/wellington.jpg" },
  { food: "Braised pork, made at home", foodZh: "自己做的红烧肉", type: "homemade", photo: "/assets/meals/braised-pork.jpg" },
  { food: "A little bowl of egg soup", foodZh: "一小碗蛋汤", type: "homemade", photo: "/assets/meals/egg-soup.jpg" },
  { food: "Dinner around our little table", foodZh: "围着小餐桌吃晚饭", type: "homemade", photo: "/assets/meals/home-table.jpg" },
  { food: "Wings and a night in", foodZh: "鸡翅与宅家夜晚", type: "homemade", photo: "/assets/meals/home-wings.jpg" },
  { food: "Home cooking after a long day", foodZh: "忙碌一天后在家做饭", type: "homemade", photo: "/assets/meals/home-dinner.jpg" },
  { food: "Lotus-leaf rice and soup", foodZh: "荷叶饭配热汤", type: "homemade", photo: "/assets/meals/lotus-rice.jpg" },
  { food: "Korean BBQ with friends", foodZh: "和朋友吃韩式烤肉", type: "other", photo: "/assets/meals/korean-bbq.jpg" },
  { food: "Nasi lemak for lunch", foodZh: "午餐吃椰浆饭", type: "other", photo: "/assets/meals/nasi-lemak.jpg" },
];
const featuredStories: Record<string, number> = {
  "maya-dumplings": 0, "anika-salad": 1, "jordan-noodles": 2,
  "daniel-pasta": 3, "eric-breakfast": 4,
  "chloe-noodles": 0, "noah-grill": 2, "priya-breakfast": 1,
  "maya-yesterday": 2, "eric-yesterday": 1,
};
seedMeals.forEach((meal, index) => {
  if (meal.id === "chloe-private") return;
  const story = realStories[featuredStories[meal.id] ?? (meal.userId === "daniel" ? index % realStories.length : meal.type === "homemade" ? 5 : index % 3)];
  Object.assign(meal, { venueId: undefined, place: undefined, placeZh: undefined, note: undefined, noteZh: undefined }, story);
});
