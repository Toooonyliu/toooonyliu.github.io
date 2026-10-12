import { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  CalendarBlank,
  User,
  Plus,
  MapPin,
  ForkKnife,
  House,
  Bag,
  BookmarkSimple,
  ChatCircle,
  CaretRight,
  CaretLeft,
  Smiley,
  SmileyWink,
  SmileyMeh,
  SmileySad,
  X,
  GearSix,
  LockSimple,
  ShareNetwork,
  ArrowUpRight,
  Check,
  Camera,
  Trash,
  ArrowClockwise,
  DownloadSimple,
  PaperPlaneTilt,
  Heart,
  Sparkle,
  UserPlus,
  CaretDown,
  EyeSlash,
} from "@phosphor-icons/react";
import {
  BottomSheet,
  KeyboardInput,
  KeyboardTextarea,
  MobileScroll,
  useKeyboard,
  useKeyboardInsets,
} from "./mobile";
import {
  users,
  venues,
  seedMeals,
  seedCollections,
  type Meal,
  type Lang,
  type Verdict,
  type MealType,
  verdictLabel,
  typeLabel,
  tr,
  DEMO_TODAY,
} from "./data";
import FriendsMap from "./FriendsMap";
import { ChatView, MemoriesView, ProfileView } from "./SocialViews";
import { PersonAvatar, PeopleCenter, ConnectionButton, MutualLabel } from "./People";
import { initialNetwork, readNetwork, canReadMeal, circleMeals, type Circle, type Network, updateConnection } from "./socialGraph";
import { VenueActions } from "./VenueActions";
import { isPresentationScene, presentationLocation } from "./presentationBridge";
import "./social.css";
import "./community.css";

type Collection = { id: string; name: string; venueIds: string[] };
type Reply = { id: string; text: string; time: string };
type State = {
  meals: Meal[];
  saved: string[];
  collections: Collection[];
  replies: Record<string, Reply[]>;
  sent: { mealId: string; to: string[]; from: string }[];
  lang: Lang;
  reactions: Record<string, string>;
  network: Network;
};
type ShareData = {
  version: 1;
  title: string;
  ids: string[];
  note: string;
  author: string;
};
type Sheet = {
  kind:
    | "compose"
    | "meal"
    | "venue"
    | "share"
    | "organize"
    | "settings"
    | "people"
    | "person"
    | "audience"
    | "recommend";
  id?: string;
} | null;
const PRESENTATION = new URLSearchParams(location.search).get("presentation") === "1";
const legacySeedFoods = new Set(["Homemade tomato pasta", "Leftovers, upgraded", "A familiar bowl", "Eggs on toast", "Noodles for lunch", "A good breakfast", "A little green bowl", "Tomato pasta", "Soup dumplings", "The five-ingredient pasta"]);
const TODAY = DEMO_TODAY,
  ME = "daniel",
  STORAGE = "food-reals-v3";
const face = {
  love: SmileyWink,
  return: Smiley,
  okay: SmileyMeh,
  no: SmileySad,
};
const typeIcon = {
  restaurant: ForkKnife,
  homemade: House,
  delivery: Bag,
  other: MapPin,
};
const allVerdicts: Verdict[] = ["love", "return", "okay", "no"];
const initial = (): State => ({
  meals: seedMeals,
  saved: ["apteka", "noodlehead", "pusadees_garden"],
  collections: seedCollections,
  replies: {},
  sent: [],
  lang: "en",
  reactions: {},
  network: initialNetwork(),
});
function readState(): State {
  // Presentation rehearsals never read or overwrite the main demo's local data.
  if (PRESENTATION) return initial();
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (
      p &&
      Array.isArray(p.meals) &&
      Array.isArray(p.saved) &&
      Array.isArray(p.collections) &&
      p.replies &&
      ["en", "zh"].includes(p.lang)
    )
      {
        const currentFriendSeeds = seedMeals.filter(
          (meal) => meal.audience === "friends" && meal.userId !== ME,
        );
        const currentFriendIds = new Set(
          currentFriendSeeds.map((meal) => meal.id),
        );
        return {
          ...p,
          meals: [
            ...currentFriendSeeds,
            ...p.meals.filter((meal: Meal) => !currentFriendIds.has(meal.id)).map((meal: Meal) => {
              // Upgrade untouched built-in media, never replace a user upload.
              const replacement = seedMeals.find(seed => seed.id === meal.id);
              return replacement && legacySeedFoods.has(meal.food) && meal.photo?.startsWith("/assets/food/")
                ? { ...meal, food: replacement.food, foodZh: replacement.foodZh, photo: replacement.photo,
                    type: replacement.type, venueId: replacement.venueId, place: replacement.place,
                    placeZh: replacement.placeZh } : meal;
            }),
          ],
          sent: Array.isArray(p.sent) ? p.sent : [],
          reactions: p.reactions || {},
          network: readNetwork(p.network),
        };
      }
  } catch {}
  return initial();
}
function readGuest(): ShareData | null {
  try {
    const raw = location.hash.slice(6);
    if (!location.hash.startsWith("#list=") || raw.length > 20000) return null;
    const p = JSON.parse(decodeURIComponent(raw));
    if (
      p.version !== 1 ||
      typeof p.title !== "string" ||
      typeof p.note !== "string" ||
      !Array.isArray(p.ids)
    )
      return null;
    return {
      ...p,
      title: p.title.slice(0, 80),
      note: p.note.slice(0, 500),
      author: typeof p.author === "string" ? p.author.slice(0, 60) : "A friend",
      ids: p.ids
        .filter(
          (id: unknown) =>
            typeof id === "string" && venues.some((v) => v.id === id),
        )
        .slice(0, 20),
    };
  } catch {
    return null;
  }
}
function dayText(day: string, lang: Lang) {
  return new Date(day + "T12:00:00").toLocaleDateString(
    lang === "zh" ? "zh-CN" : "en-US",
    { month: "short", day: "numeric" },
  );
}
function timeText(time: string, lang: Lang) {
  return lang === "zh"
    ? time
    : new Date("2026-10-03T" + time + ":00").toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function VerdictBadge({
  meal,
  lang,
}: {
  meal: Pick<Meal, "verdict" | "type">;
  lang: Lang;
}) {
  const Icon = face[meal.verdict];
  return (
    <span className={"verdict " + meal.verdict}>
      <Icon size={19} weight="fill" />
      <span>{verdictLabel(meal.verdict, meal.type, lang)}</span>
    </span>
  );
}
function Avatar({ id }: { id: string }) {
  return <PersonAvatar id={id}/>;
}

export default function Prototype() {
  const [state, setState] = useState<State>(readState);
  const [tab, setTab] = useState<"friends" | "today" | "me" | "chat" | "memories" | "profile">("friends");
  const [mode, setMode] = useState<"feed" | "map">("map");
  const [presentationRevision, setPresentationRevision] = useState(0);
  const [circle,setCircle]=useState<Circle>("friends");
  const [feedRange,setFeedRange]=useState<"today"|"week"|"all">("all");
  const [friendFilter,setFriendFilter]=useState("");
  const [feedLimit,setFeedLimit]=useState(6);
  const [mapFocusMealId, setMapFocusMealId] = useState<string|null>(null);
  const [memoryView, setMemoryView] = useState<"moments"|"calendar"|"recaps">("moments");
  const [meMode, setMeMode] = useState<"memories" | "places">("memories");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [guest, setGuest] = useState<ShareData | null>(readGuest);
  const [reply, setReply] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [food, setFood] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [mealType, setMealType] = useState<MealType>("other");
  const [venueId, setVenueId] = useState("");
  const [place, setPlace] = useState("");
  const [photo, setPhoto] = useState("");
  const [note, setNote] = useState("");
  const [audience, setAudience] = useState<"friends" | "private">("friends");
  const [discoverable,setDiscoverable]=useState(false);
  const [composeError, setComposeError] = useState("");
  const [month, setMonth] = useState(TODAY.slice(0,7));
  const [selectedDay, setSelectedDay] = useState(TODAY);
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [source, setSource] = useState<"friends" | "own">("friends");
  const [budget, setBudget] = useState("all");
  const [area, setArea] = useState("all");
  const [pick, setPick] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [placesFilter, setPlacesFilter] = useState("all");
  const [newList, setNewList] = useState("");
  const [shareTitle, setShareTitle] = useState("A few places you’ll love");
  const [shareNote, setShareNote] = useState("");
  const [shareIds, setShareIds] = useState<string[]>([]);
  const [shareLink, setShareLink] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [resetConfirm, setResetConfirm] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboard = useKeyboard();
  const insets = useKeyboardInsets();
  const lang = state.lang;
  const t = (en: string, zh: string) => tr(lang, en, zh);
  const nonVenueLocation = (meal: Meal) => {
    if (meal.type === "homemade") return t("At home", "在家");
    if (meal.place) return lang === "zh" && meal.placeZh ? meal.placeZh : meal.place;
    if (meal.type === "delivery")
      return t("Delivery · place not shared", "外卖 · 地点未分享");
    return "";
  };
  useEffect(() => {
    if (PRESENTATION) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    if (!PRESENTATION) return;
    const showScene = (scene: string) => {
      if (!isPresentationScene(scene)) return;
      setPresentationRevision(value => value + 1);
      keyboard.hide();
      setTab(scene === "memories" || scene === "chat" || scene === "profile" ? scene : "friends");
      setMode(scene === "feed" ? "feed" : "map");
      setCircle(scene === "extended" ? "extended" : "friends");
      setMemoryView("moments");
      setFeedRange("all");
      setFriendFilter("");
      setReply("");
      setConfirmDelete(false);
      setMapFocusMealId(null);
      setSheet(scene === "people" ? { kind: "people" }
        : scene === "restaurant" ? { kind: "venue", id: "kura_sushi" }
        : scene === "post" ? { kind: "meal", id: "maya-dumplings" }
        : scene === "home-meal" ? { kind: "meal", id: "eric-breakfast" }
        : scene === "capture" ? { kind: "compose" } : null);
    };
    const receive = (event: MessageEvent) => {
      if (event.origin === location.origin && event.source === window.parent && event.data?.type === "mibly-demo") {
        showScene(event.data.scene);
      }
    };
    showScene(new URLSearchParams(location.search).get("scene") || "map");
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  const presentationScreen = presentationLocation({ tab, mode, circle, sheet, memoryView, meMode });
  useEffect(() => {
    if (!PRESENTATION || window.parent === window) return;
    const report = () => window.parent.postMessage({ type: "mibly-demo-state", version: 1, session: new URLSearchParams(location.search).get("presentationSession"), ...presentationScreen }, location.origin);
    const receive = (event: MessageEvent) => {
      if (event.origin === location.origin && event.source === window.parent && event.data?.type === "mibly-demo-state-request") report();
    };
    window.addEventListener("message", receive);
    report();
    return () => window.removeEventListener("message", receive);
  }, [presentationScreen.feature, presentationScreen.screen, presentationRevision]);
  useEffect(() => {
    const fn = () => setGuest(readGuest());
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);
  const tell = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3400);
  };
  const open = (next: Sheet) => {
    keyboard.hide();
    setReply("");
    setConfirmDelete(false);
    setSheet(next);
  };
  const close = () => {
    keyboard.hide();
    setSheet(null);
  };
  const navigate = (next: typeof tab) => {
    keyboard.hide();
    setTab(next);
    setSheet(null);
  };
  const name = (m: Meal) => (lang === "zh" && m.foodZh ? m.foodZh : m.food);
  const myMeals = state.meals.filter((m) => m.userId === ME);
  const publicMeals = circleMeals(state.meals,state.network,"friends");
  const homeMeals = circleMeals(state.meals,state.network,circle);
  const readableMeals = state.meals.filter(m=>canReadMeal(m,state.network)&&!state.network.hidden.includes(m.userId));
  const rangeStart = new Date(`${TODAY}T12:00:00`);rangeStart.setDate(rangeStart.getDate()-6);
  const filteredFeed=homeMeals.filter(m=>(!friendFilter||m.userId===friendFilter)&&(feedRange==="all"||(feedRange==="today"?m.date===TODAY:m.date>=dayKey(rangeStart))));
  useEffect(()=>setFeedLimit(6),[circle,feedRange,friendFilter]);
  const selectedMeal = readableMeals.find((m) => m.id === sheet?.id);
  const selectedVenue = venues.find((v) => v.id === sheet?.id);
  const selectedPerson = users.find(user=>user.id===sheet?.id);
  const updateNetwork = (network:Network)=>setState(s=>({...s,network}));
  const showPersonPosts = (id:string)=>{
    setCircle(id===ME||state.network.friends.includes(id)?"friends":"extended");
    setFriendFilter(id);setFeedRange("all");setMode("feed");navigate("friends");
  };
  const save = (id: string) => {
    const has = state.saved.includes(id);
    setState((s) => ({
      ...s,
      saved: has ? s.saved.filter((x) => x !== id) : [...s.saved, id],
      collections: has
        ? s.collections.map((c) => ({
            ...c,
            venueIds: c.venueIds.filter((x) => x !== id),
          }))
        : s.collections,
    }));
    tell(
      has
        ? t("Removed from saved places", "已移出收藏")
        : t("Saved to your places", "已加入收藏地点"),
    );
  };
  const startCompose = () => {
    setFood("");
    setVerdict(null);
    setMealType("other");
    setVenueId("");
    setPlace("");
    setPhoto("");
    setNote("");
    setAudience("friends");
    setDiscoverable(false);
    setComposeError("");
    open({ kind: "compose" });
  };
  const publish = () => {
    if (!food.trim() || !verdict) {
      setComposeError(
        t(
          "Add a food name and choose how it felt.",
          "填写吃了什么，再选择这一餐的感受。",
        ),
      );
      return;
    }
    const d = new Date();
    const m: Meal = {
      id: crypto.randomUUID(),
      userId: ME,
      food: food.trim().slice(0, 100),
      ...(place.trim() && (mealType === "other" || mealType === "delivery") ? { place: place.trim().slice(0,80) } : {}),
      verdict,
      type: mealType,
      date: TODAY,
      time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      audience,
      discoverable: audience==="friends"&&mealType==="restaurant"&&!!venueId&&discoverable,
      ...(photo ? { photo } : {}),
      ...(note.trim() ? { note: note.trim().slice(0, 500) } : {}),
      ...(venueId &&
      (mealType === "restaurant" || mealType === "delivery") &&
      !(mealType === "delivery" && venueId === "pusadees_garden")
        ? { venueId }
        : {}),
    };
    setState((s) => ({ ...s, meals: [m, ...s.meals] }));
    close();
    if (audience === "private") {
      setTab("memories");
      setMemoryView("moments");
      setMeMode("memories");
      setMonth(TODAY.slice(0,7));
      setSelectedDay(TODAY);
    } else {
      setTab("friends");
      setCircle("friends");
      setFriendFilter("");
      setMapFocusMealId(m.id);
      setMode("map");
    }
    tell(
      audience === "private" ? t("Saved privately to your memories.", "已私密保存到你的回忆。") : t(
        "Your meal is shared. A little memory, saved.",
        "已发布，也已保存到你的回忆。",
      ),
    );
  };
  const readPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      tell(t("Please choose an image.", "请选择图片。"));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      tell(t("Choose a photo under 20 MB.", "请选择小于20MB的图片。"));
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL("image/jpeg", 0.72));
      bitmap.close();
    } catch {
      tell(
        t(
          "This image could not be opened. Try JPG or PNG.",
          "无法读取这张图片，请尝试JPG或PNG。",
        ),
      );
    }
  };
  const startShare = (ids: string[], title?: string) => {
    setShareIds(ids);
    setShareTitle(title || t("A few places you’ll love", "想推荐给你的几家店"));
    setShareNote("");
    setShareLink("");
    open({ kind: "share" });
  };
  const buildShare = () => {
    const payload: ShareData = {
      version: 1,
      title: shareTitle.trim() || t("My food list", "我的餐厅名单"),
      ids: shareIds,
      note: shareNote.trim(),
      author: "Daniel",
    };
    const url = new URL(location.href);
    url.hash = "list=" + encodeURIComponent(JSON.stringify(payload));
    setShareLink(url.href);
    return url.href;
  };
  const copyLink = async () => {
    const url = buildShare();
    try {
      await navigator.clipboard.writeText(url);
      tell(
        t(
          "Link copied. Anyone with it can view this list.",
          "链接已复制，打开即可查看名单。",
        ),
      );
    } catch {
      tell(
        t(
          "Your link is ready below. Select it to copy.",
          "链接已生成，可选中下方文字复制。",
        ),
      );
    }
  };
  const exportList = () => {
    const list = venues.filter((v) => shareIds.includes(v.id));
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 240 + list.length * 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#101114";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#c2d7b5";
    ctx.font = "bold 36px Arial";
    ctx.fillText("Mibly · Pittsburgh", 55, 65);
    ctx.fillStyle = "#f5f6f8";
    ctx.font = "bold 38px Arial";
    ctx.fillText(shareTitle.slice(0, 36), 55, 132);
    ctx.font = "24px Arial";
    ctx.fillStyle = "#adb4c0";
    ctx.fillText(t("A few favorites from Daniel", "Daniel的餐厅收藏"), 55, 180);
    list.forEach((v, i) => {
      const y = 265 + i * 160;
      ctx.fillStyle = "#f5f6f8";
      ctx.font = "bold 30px Arial";
      ctx.fillText(v.name, 55, y);
      ctx.fillStyle = "#adb4c0";
      ctx.font = "23px Arial";
      ctx.fillText(v.address, 55, y + 45);
      ctx.strokeStyle = "#33363a";
      ctx.beginPath();
      ctx.moveTo(55, y + 90);
      ctx.lineTo(945, y + 90);
      ctx.stroke();
    });
    const a = document.createElement("a");
    a.download = "mibly-pittsburgh.png";
    a.href = canvas.toDataURL();
    a.click();
    tell(t("List image exported", "名单图片已导出"));
  };
  const candidateList = useMemo(() => {
    const positive = state.meals.filter(
      (m) =>
        m.venueId &&
        m.verdict !== "no" &&
        m.verdict !== "okay" &&
        (source === "friends"
          ? state.network.friends.includes(m.userId) && m.audience === "friends"
          : m.userId === ME),
    );
    const latestOwn = new Map<string, Meal>();
    state.meals
      .filter((m) => m.userId === ME && m.venueId)
      .forEach((m) => {
        const prev = latestOwn.get(m.venueId!);
        const fresh = !seedMeals.some((x) => x.id === m.id),
          oldFresh = prev && !seedMeals.some((x) => x.id === prev.id);
        if (
          !prev ||
          (fresh && !oldFresh) ||
          (fresh === !!oldFresh && m.date + m.time > prev.date + prev.time)
        )
          latestOwn.set(m.venueId!, m);
      });
    return venues
      .filter(
        (v) =>
          latestOwn.get(v.id)?.verdict !== "no" &&
          (source === "own"
            ? state.saved.includes(v.id) ||
              positive.some((m) => m.venueId === v.id)
            : positive.some((m) => m.venueId === v.id)) &&
          (budget === "all" ||
            (v.price !== null && v.price <= Number(budget))) &&
          (area === "all" || v.area === area),
      )
      .map((v) => {
        const history = positive.filter((m) => m.venueId === v.id);
        const direct = history.some((m) => m.recommendedTo?.includes(ME));
        const score =
          history.reduce((n, m) => n + (m.verdict === "love" ? 2 : 1), 0) +
          (direct ? 3 : 0);
        return { ...v, history, direct, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [state.meals, state.saved, state.network, source, budget, area]);
  useEffect(() => {
    setPick(0);
    setShowMore(false);
  }, [source, budget, area]);
  const currentPick = candidateList[pick % Math.max(candidateList.length, 1)];
  const visiblePlaces = venues.filter((v) => {
    if (placesFilter === "visited")
      return myMeals.some((m) => m.venueId === v.id && m.type === "restaurant");
    if (placesFilter === "all") return state.saved.includes(v.id);
    if (placesFilter === "want")
      return (
        state.saved.includes(v.id) &&
        !myMeals.some((m) => m.venueId === v.id && m.type === "restaurant")
      );
    return state.collections
      .find((c) => c.id === placesFilter)
      ?.venueIds.includes(v.id);
  });
  const calendarDates = useMemo(() => {
    const start = new Date(month + "-01T12:00:00");
    if (calendarMode === "week") {
      const d = new Date(selectedDay + "T12:00:00");
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => {
        const x = new Date(d);
        x.setDate(x.getDate() + i);
        return dayKey(x);
      });
    }
    const pad = (start.getDay() + 6) % 7;
    const days = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0,
    ).getDate();
    return [
      ...Array(pad).fill(null),
      ...Array.from(
        { length: days },
        (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
      ),
    ];
  }, [month, calendarMode, selectedDay]);
  const shiftCalendar = (n: number) => {
    if (calendarMode === "week") {
      const d = new Date(selectedDay + "T12:00:00");
      d.setDate(d.getDate() + n * 7);
      setSelectedDay(dayKey(d));
      setMonth(dayKey(d).slice(0, 7));
    } else {
      const d = new Date(month + "-01T12:00:00");
      d.setMonth(d.getMonth() + n);
      setMonth(dayKey(d).slice(0, 7));
      setSelectedDay(dayKey(d));
    }
  };
  const mealCard = (m: Meal, compact = false) => {
    const u = users.find((u) => u.id === m.userId) || users[0];
    const v = venues.find((v) => v.id === m.venueId);
    const Icon = typeIcon[m.type];
    return (
      <article className={"meal-card " + (compact ? "compact" : "")} key={m.id}>
        <div className="author-row">
          <button className="author-profile-button" aria-label={t("View profile: ","查看主页：")+u.name} onClick={()=>open({kind:"person",id:u.id})}><Avatar id={u.id} /></button>
          <div className="author-copy">
            <strong>{u.name}</strong>
            <span>
              {m.date === TODAY ? t("Today", "今天") : dayText(m.date, lang)} ·{" "}
              {timeText(m.time, lang)}
            </span>
          </div>
          <span className="meal-type">
            <Icon size={18} />
            {typeLabel(m.type, lang)}
          </span>
        </div>
        {m.userId!==ME&&!state.network.friends.includes(m.userId)&&<div className="post-network-context"><MutualLabel id={m.userId} network={state.network} lang={lang}/><button onClick={()=>open({kind:"person",id:m.userId})}>{t("Meet ","认识 ")+u.name.split(" ")[0]}<UserPlus size={14}/></button></div>}
        {m.photo ? (
          <button
            className="photo-button"
            onClick={() => open({ kind: "meal", id: m.id })}
            aria-label={t("View meal: ", "查看餐食：") + name(m)}
          >
            <img
              className="meal-photo"
              src={m.photo}
              alt={name(m)}
              draggable={false}
            />
            <span className="photo-person"><Avatar id={m.userId}/></span>
          </button>
        ) : null}
        <button
          className="food-title"
          onClick={() => open({ kind: "meal", id: m.id })}
        >
          {name(m)}
        </button>
        <VerdictBadge meal={m} lang={lang} />
        {v ? (
          <button
            className="venue-line"
            onClick={() => open({ kind: "venue", id: v.id })}
          >
            <MapPin size={18} />
            <span>
              {v.name} · {v.area}
            </span>
          </button>
        ) : nonVenueLocation(m) ? (
          <p className="venue-line">
            {m.type === "homemade" ? (
              <House size={18} />
            ) : m.type === "delivery" ? (
              <Bag size={18} />
            ) : (
              <MapPin size={18} />
            )}
            <span>{nonVenueLocation(m)}</span>
          </p>
        ) : null}
        {m.note ? (
          <p className="meal-note">
            {lang === "zh" && m.noteZh ? m.noteZh : m.note}
          </p>
        ) : null}
        {m.recommendedTo?.includes(ME) && m.userId !== ME ? (
          <button
            className="direct-recommend"
            onClick={() => open({ kind: "meal", id: m.id })}
          >
            <Users size={18} weight="fill" />
            {t("Recommended to you", "专门推荐给你")}
            <CaretRight size={16} />
          </button>
        ) : null}
        <div className="post-actions">
          <button onClick={() => open({ kind: "meal", id: m.id })}>
            <ChatCircle size={22} />
            {m.userId === ME
              ? t("View meal", "查看记录")
              : t("Ask " + u.name.split(" ")[0], "问问" + u.name.split(" ")[0])}
            {(state.replies[m.id]?.length || 0) > 0 ? (
              <span className="reply-count">{state.replies[m.id].length}</span>
            ) : null}
          </button>
          {v ? (
            <button
              aria-label={t("Save ", "收藏 ") + v.name}
              aria-pressed={state.saved.includes(v.id)}
              onClick={() => save(v.id)}
            >
              <BookmarkSimple
                size={22}
                weight={state.saved.includes(v.id) ? "fill" : "regular"}
              />
              {state.saved.includes(v.id)
                ? t("Saved", "已收藏")
                : t("Save", "收藏")}
            </button>
          ) : (
            <button
              onClick={() => {
                navigate("memories");
                setMeMode("memories");
                setSelectedDay(m.date);
                setMonth(m.date.slice(0, 7));
              }}
            >
              <CalendarBlank size={22} />
              {t("Memories", "回忆")}
            </button>
          )}
        </div>
      </article>
    );
  };
  const venueRow = (v: (typeof venues)[number], extra?: string) => (
    <div className="place-row" key={v.id}>
      <button
        className="place-main"
        onClick={() => open({ kind: "venue", id: v.id })}
      >
        <img src={v.photo} alt="" />
        <span>
          <strong>{v.name}</strong>
          <small>{v.area}</small>
          {extra ? <small>{extra}</small> : null}
        </span>
      </button>
      <button
        className="icon-button"
        aria-label={t("Organize ", "整理 ") + v.name}
        onClick={() => open({ kind: "organize", id: v.id })}
      >
        <BookmarkSimple
          size={21}
          weight={state.saved.includes(v.id) ? "fill" : "regular"}
        />
      </button>
    </div>
  );
  const sheetTitle =
    sheet?.kind === "people" ? t("Your people","认识朋友")
    : sheet?.kind === "person" ? selectedPerson?.name||t("Profile","主页")
    : sheet?.kind === "audience" ? t("Who’s at your table?","想看谁的日常？")
    : sheet?.kind === "compose"
      ? t("Share a meal", "分享这一餐")
      : sheet?.kind === "meal"
        ? t("A little food story", "这一餐的故事")
        : sheet?.kind === "venue"
          ? selectedVenue?.name || ""
          : sheet?.kind === "share"
            ? t("A list worth sharing", "把好店分享出去")
            : sheet?.kind === "organize"
              ? t("Make it your own", "加入你的收藏")
              : sheet?.kind === "recommend"
                ? t("Who would love this?", "谁会喜欢这一餐？")
                : t("Your space", "你的空间");
  return (
    <div className={`food-app social-app ${!guest && tab === "friends" && mode === "map" ? "is-map" : ""}`} data-language={lang} data-iteration="5" data-tab={tab} data-mode={mode}>
      {!guest && tab === "friends" && mode === "map" ? <FriendsMap key={circle} lang={lang} meals={homeMeals} today={TODAY} currentUserId={ME} scope={circle} focusMealId={circle==="friends"?mapFocusMealId:null} onMeal={m => open({kind:"meal", id:m.id})} onPerson={id=>showPersonPosts(id)} onFeed={()=>{setMode("feed");setFeedRange("all");setFriendFilter("");}}/> : null}
      <header className="app-header">
        <div className="brand-row">
          <button
            className="brand"
            onClick={() => { navigate("friends"); setMode("map"); }}
            aria-label="Mibly home"
          >
            Mibly<span>.</span>
            <small>{t("Your people. Their plates.","朋友的日常，都在每一餐。")}</small>
          </button>
          {guest ? (
            <button
              className="small-pill"
              onClick={() => {
                location.hash = "";
                setGuest(null);
              }}
            >
              {t("Explore demo", "体验Demo")}
              <ArrowUpRight size={16} />
            </button>
          ) : tab === "me" || tab === "profile" ? (
            <button
              aria-label={t("Settings", "设置")}
              className="profile-trigger"
              onClick={() => open({ kind: "settings" })}
            >
              <Avatar id={ME} />
              <GearSix size={14} />
            </button>
          ) : (
            <button className="circle-header-action" aria-label={t("Add friends","添加朋友")} onClick={()=>open({kind:"people"})}>
              <UserPlus size={22} />{state.network.incoming.length>0&&<span className="request-dot">{state.network.incoming.length}</span>}
            </button>
          )}
        </div>
        {!guest ? (
          <div className="page-title-row">
            {tab==="friends"?<button className="circle-picker" aria-label={t("Choose people to see","选择动态范围")} onClick={()=>open({kind:"audience"})}><span>{circle==="friends"?t("My friends","我的朋友"):t("Friends of friends","朋友的朋友")}</span><CaretDown size={16}/></button>:<h1>
              {tab === "chat"
                  ? t("Chat", "聊天")
                  : tab === "memories"
                    ? t("Memories", "回忆")
                    : tab === "profile"
                      ? t("Your profile", "你的主页")
                : tab === "today"
                  ? t("Today’s pick", "今天吃什么")
                  : meMode === "memories"
                    ? t("Your food memories", "你的美食回忆")
                    : t("Your saved places", "你的餐厅收藏")}
            </h1>}
            {tab === "friends" ? (
              <div
                className="segmented"
                aria-label={t("Friends view", "朋友视图")}
              >
                <button
                  aria-pressed={mode === "map"}
                  className={mode === "map" ? "active" : ""}
                  onClick={() => setMode("map")}
                >
                  {t("Map", "地图")}
                </button>
                <button aria-pressed={mode === "feed"} className={mode === "feed" ? "active" : ""} onClick={() => setMode("feed")}>
                  {t("Feed", "动态")}
                </button>
              </div>
            ) : tab === "me" || tab === "memories" ? (
              <span className="private-note">
                <LockSimple size={13} />
                {t("Only you", "仅自己")}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>
      {!guest&&tab==="friends"&&mode==="feed"&&<div className="feed-filter-bar"><div className="feed-time-tabs">{(["today","week","all"] as const).map(value=><button key={value} className={feedRange===value?"active":""} aria-pressed={feedRange===value} onClick={()=>setFeedRange(value)}>{value==="today"?t("Today","今天"):value==="week"?t("This week","近7天"):t("All posts","全部动态")}</button>)}</div>{friendFilter&&<button className="friend-filter-chip" onClick={()=>setFriendFilter("")}>{users.find(u=>u.id===friendFilter)?.name.split(" ")[0]}<X size={13}/></button>}</div>}
      {!guest && tab === "memories" && <div className="memory-tabs-fixed"><div className="segmented full memory-view-picker">{(["moments","calendar","recaps"] as const).map(value=><button key={value} className={memoryView===value?"active":""} aria-pressed={memoryView===value} onClick={()=>{keyboard.hide();setMemoryView(value);}}>{value==="moments"?t("Moments","回忆"):value==="calendar"?t("Calendar","日历"):t("Recaps","回顾")}</button>)}</div></div>}
      {!(!guest && tab === "friends" && mode === "map") && <MobileScroll
        key={guest ? "guest" : tab + "-" + mode}
        className="app-screen"
      >
        <main className="screen-content">
          {storageError ? (
            <div className="notice" role="alert">
              {t(
                "Storage is full. Export your list or remove a photo; changes may not survive refresh.",
                "存储空间已满，建议导出名单或删除照片；改动可能无法在刷新后保留。",
              )}
            </div>
          ) : null}
          {guest ? (
            <section className="guest-list">
              <span className="eyebrow">
                {t("A list from ", "来自 ")}
                {guest.author}
              </span>
              <h1>{guest.title}</h1>
              <p>
                {guest.note ||
                  t(
                    "Good food is better when it’s shared.",
                    "把喜欢的餐厅分享给你。",
                  )}
              </p>
              <span className="public-hint">
                <LockSimple size={14} />
                {t("Open list · No account needed", "公开名单 · 无需注册")}
              </span>
              {guest.ids.map((id) => {
                const v = venues.find((v) => v.id === id)!;
                return (
                  <div className="guest-place" key={id}>
                    <img src={v.photo} alt={v.name} />
                    <h2>{v.name}</h2>
                    <VenueActions venue={v} lang={lang}/>
                  </div>
                );
              })}
              <p className="fine-print">
                {t(
                  "A snapshot of this list when it was shared.",
                  "此名单为分享时的快照。",
                )}
              </p>
            </section>
          ) : tab === "friends" ? (
            mode === "map" ? (
              null
            ) : (
              <div className="feed">
                {circle==="extended"&&<p className="discovery-note"><LockSimple size={14}/>{t("Opt-in restaurant stories through mutual friends. Home and private posts stay hidden.","通过共同好友发现餐厅分享；仅限主动授权，住家和私密动态不展示。")}</p>}
                {filteredFeed.slice(0,feedLimit).map((m) => mealCard(m))}
                {!filteredFeed.length&&<div className="feed-empty"><Users size={34}/><h2>{t("A quiet table for now","这里暂时还很安静")}</h2><p>{friendFilter?t("No posts visible in this range. Pending requests do not unlock friends-only posts.","这个范围内没有可见动态，待接受的申请不会解锁好友专属内容。"):t("Try all posts, meet a friend, or explore another circle.","可以查看全部动态、认识新朋友，或切换动态范围。")}</p><button onClick={()=>{setFeedRange("all");setFriendFilter("");}}>{t("Show all posts","查看全部动态")}</button><button onClick={()=>open({kind:"people"})}>{t("Find friends","寻找朋友")}</button></div>}
                {filteredFeed.length>feedLimit?<button className="secondary wide load-more" onClick={()=>setFeedLimit(count=>count+6)}>{t("Load more posts","加载更多动态")} · {filteredFeed.length-feedLimit}</button>:
                <p className="end-note">
                  {t(
                    "You’ve seen every visible post in this view.",
                    "当前范围内的可见动态已全部加载。",
                  )}
                </p>}
                <button className="primary wide" onClick={startCompose}>
                  <Plus />
                  {t("Share your meal", "分享这一餐")}
                </button>
              </div>
            )
          ) : tab === "chat" ? (
            <ChatView meals={publicMeals} lang={lang} onMeal={m=>open({kind:"meal",id:m.id})} replies={state.replies} currentUserId={ME}/>
          ) : tab === "memories" ? (
            <MemoriesView meals={myMeals} lang={lang} today={TODAY} view={memoryView} onMeal={m=>open({kind:"meal",id:m.id})}/>
          ) : tab === "profile" ? (
            <ProfileView meals={myMeals} lang={lang} today={TODAY} onMeal={m=>open({kind:"meal",id:m.id})} currentUserId={ME} savedCount={state.saved.length} friendCount={state.network.friends.length} onFriends={()=>open({kind:"people"})} onCompose={startCompose} onSaved={()=>{setMeMode("places");navigate("me");}} onPicks={()=>navigate("today")}/>
          ) : tab === "today" ? (
            <section className="today-screen">
              <p className="intro">
                {t(
                  "Something good, from people you trust.",
                  "从信任的人那里，找到今天想吃的。",
                )}
              </p>
              <div className="segmented full">
                <button
                  className={source === "friends" ? "active" : ""}
                  onClick={() => setSource("friends")}
                >
                  {t("From friends", "朋友推荐")}
                </button>
                <button
                  className={source === "own" ? "active" : ""}
                  onClick={() => setSource("own")}
                >
                  {t("My places", "我的餐厅")}
                </button>
              </div>
              <div className="filter-row">
                <label>
                  {t("Menu budget", "菜品预算")}
                  <select
                    aria-label={t("Menu budget", "菜品预算")}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  >
                    <option value="all">{t("Any budget", "不限预算")}</option>
                    <option value="15">$15 {t("or less", "以内")}</option>
                    <option value="20">$20 {t("or less", "以内")}</option>
                    <option value="35">$35 {t("or less", "以内")}</option>
                  </select>
                </label>
                <label>
                  {t("Area", "区域")}
                  <select
                    aria-label={t("Area", "区域")}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    <option value="all">
                      {t("All Pittsburgh", "匹兹堡全部")}
                    </option>
                    {[...new Set(venues.map((v) => v.area))].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
              </div>
              {currentPick ? (
                <>
                  <div className="pick-photo">
                    <img src={currentPick.photo} alt={currentPick.name} />
                    <span>{t("A good idea for today", "今天值得一试")}</span>
                  </div>
                  <h2 className="pick-name">{currentPick.name}</h2>
                  <p className="muted">
                    <MapPin size={16} />
                    {currentPick.area}
                  </p>
                  <div className="why-pick">
                    <span className="eyebrow">
                      {t("Why this one", "为什么选这家")}
                    </span>
                    <p>
                      {currentPick.direct
                        ? t(
                            "A friend recommended it specifically to you.",
                            "朋友专门把这家店推荐给了你。",
                          )
                        : source === "own"
                          ? t(
                              "It’s in your own food history or saved places.",
                              "它来自你的用餐记录或餐厅收藏。",
                            )
                          : t(
                              "Your friends had an experience they would repeat.",
                              "朋友在这里有过愿意再体验的经历。",
                            )}
                    </p>
                    <div className="friend-proof">
                      {currentPick.history.slice(0, 3).map((m) => (
                        <Avatar key={m.id} id={m.userId} />
                      ))}
                      <span>
                        {currentPick.price
                          ? t(
                              `Menu example from $${currentPick.price}`,
                              `菜单示例 $${currentPick.price} 起`,
                            )
                          : t("Menu price not recorded", "暂未记录菜单价格")}
                      </span>
                    </div>
                  </div>
                  <div className="two-actions">
                    <button
                      className="primary"
                      onClick={() =>
                        open({ kind: "venue", id: currentPick.id })
                      }
                    >
                      {t("Take a look", "看看这家")}
                      <CaretRight />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setPick((p) => p + 1);
                        tell(
                          candidateList.length === 1
                            ? t(
                                "This is the only match. Try a wider budget or area.",
                                "当前只有一家符合条件，可放宽预算或区域。",
                              )
                            : t("Here’s another idea", "换一家试试"),
                        );
                      }}
                    >
                      <ArrowClockwise size={18} />
                      {t("Another idea", "换一家")}
                    </button>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setShowMore((v) => !v)}
                  >
                    {showMore
                      ? t("Hide alternatives", "收起备选")
                      : t(
                          `See ${Math.min(candidateList.length, 5)} ideas`,
                          `查看${Math.min(candidateList.length, 5)}个选项`,
                        )}
                    <CaretRight size={16} />
                  </button>
                  {showMore
                    ? candidateList.slice(0, 5).map((v) => venueRow(v))
                    : null}
                </>
              ) : (
                <div className="empty">
                  <ForkKnife size={38} />
                  <h2>{t("A little too specific?", "条件有点严格？")}</h2>
                  <p>
                    {t(
                      "No places match these choices. Try another area or a wider budget.",
                      "暂时没有符合条件的餐厅，试试其他区域或预算。",
                    )}
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setArea("all");
                      setBudget("all");
                    }}
                  >
                    {t("Clear filters", "清除筛选")}
                  </button>
                </div>
              )}
              <p className="fine-print">
                {t(
                  "Menu examples, not total meal costs. Picks use your demo history and explicit recommendations; no live availability.",
                  "价格为菜单示例，非整餐费用。推荐依据演示用餐记录与主动推荐，不含实时营业情况。",
                )}
              </p>
            </section>
          ) : (
            <section className="me-screen">
              <div className="segmented full">
                <button
                  className={meMode === "memories" ? "active" : ""}
                  onClick={() => setMeMode("memories")}
                >
                  {t("Memories", "回忆")}
                </button>
                <button
                  className={meMode === "places" ? "active" : ""}
                  onClick={() => setMeMode("places")}
                >
                  {t("Saved places", "收藏地点")}
                </button>
              </div>
              {meMode === "memories" ? (
                <>
                  <div className="calendar-tools">
                    <button
                      aria-label={t("Previous period", "上一期")}
                      className="round-control"
                      onClick={() => shiftCalendar(-1)}
                    >
                      <CaretLeft />
                    </button>
                    <strong>
                      {new Date(month + "-01T12:00:00").toLocaleDateString(
                        lang === "zh" ? "zh-CN" : "en-US",
                        { month: "long", year: "numeric" },
                      )}
                    </strong>
                    <button
                      aria-label={t("Next period", "下一期")}
                      className="round-control"
                      onClick={() => shiftCalendar(1)}
                    >
                      <CaretRight />
                    </button>
                    <div className="segmented mini">
                      <button
                        className={calendarMode === "week" ? "active" : ""}
                        onClick={() => setCalendarMode("week")}
                      >
                        {t("Week", "周")}
                      </button>
                      <button
                        className={calendarMode === "month" ? "active" : ""}
                        onClick={() => setCalendarMode("month")}
                      >
                        {t("Month", "月")}
                      </button>
                    </div>
                  </div>
                  <div className="calendar-weekdays">
                    {(lang === "zh"
                      ? ["一", "二", "三", "四", "五", "六", "日"]
                      : ["M", "T", "W", "T", "F", "S", "S"]
                    ).map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>
                  <div className={"calendar " + calendarMode}>
                    {calendarDates.map((day, i) => {
                      if (!day) return <span key={"blank" + i} />;
                      const records = myMeals.filter((m) => m.date === day);
                      const first = records[0];
                      return (
                        <button
                          key={day}
                          className={
                            "day " +
                            (selectedDay === day ? "selected " : "") +
                            (records.length ? "has-meal" : "")
                          }
                          onClick={() => {
                            setSelectedDay(day);
                            setMonth(day.slice(0, 7));
                          }}
                          aria-label={`${day} · ${records.length} ${t("meals", "餐食")}`}
                          aria-pressed={selectedDay === day}
                        >
                          {first?.photo ? (
                            <img src={first.photo} alt="" />
                          ) : null}
                          <span className="day-number">
                            {Number(day.slice(-2))}
                          </span>
                          {first && !first.photo ? (
                            <span className="day-food">
                              {name(first).slice(0, 8)}
                              <Smiley size={14} />
                            </span>
                          ) : null}
                          {records.length > 1 ? (
                            <span className="day-count">
                              +{records.length - 1}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="day-heading">
                    <h2>
                      {new Date(selectedDay + "T12:00:00").toLocaleDateString(
                        lang === "zh" ? "zh-CN" : "en-US",
                        { weekday: "long", month: "short", day: "numeric" },
                      )}
                    </h2>
                    <span>
                      {myMeals.filter((m) => m.date === selectedDay).length}{" "}
                      {t("meals", "餐食")}
                    </span>
                  </div>
                  {myMeals
                    .filter((m) => m.date === selectedDay)
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((m) => (
                      <button
                        className="memory-row"
                        key={m.id}
                        onClick={() => open({ kind: "meal", id: m.id })}
                      >
                        {m.photo ? (
                          <img src={m.photo} alt="" />
                        ) : (
                          <span className="memory-no-photo">
                            <ForkKnife size={25} />
                          </span>
                        )}
                        <span className="memory-copy">
                          <strong>{name(m)}</strong>
                          <small>
                            {venues.find((v) => v.id === m.venueId)?.name ||
                              typeLabel(m.type, lang)}{" "}
                            · {timeText(m.time, lang)}
                          </small>
                        </span>
                        <VerdictBadge meal={m} lang={lang} />
                      </button>
                    ))}
                  {!myMeals.some((m) => m.date === selectedDay) ? (
                    <div className="empty quiet">
                      <p>
                        {t(
                          "A quiet day in your food diary.",
                          "这一天的餐桌，暂时留白。",
                        )}
                      </p>
                      {selectedDay === TODAY ? (
                        <button className="text-button" onClick={startCompose}>
                          <Plus size={18} />
                          {t("Add a meal", "记录一餐")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    className="text-button"
                    onClick={() => {
                      setMonth("2026-10");
                      setSelectedDay(TODAY);
                    }}
                  >
                    {t("Back to today", "回到今天")}
                  </button>
                </>
              ) : (
                <>
                  <div className="places-toolbar">
                    <label className="sr-only" htmlFor="place-filter">
                      {t("Collection", "收藏夹")}
                    </label>
                    <select
                      id="place-filter"
                      value={placesFilter}
                      onChange={(e) => setPlacesFilter(e.target.value)}
                    >
                      <option value="all">{t("All saved", "全部收藏")}</option>
                      <option value="want">{t("Want to go", "想去")}</option>
                      <option value="visited">{t("Been here", "去过")}</option>
                      {state.collections.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="icon-button"
                      aria-label={t("Share this list", "分享名单")}
                      onClick={() =>
                        startShare(
                          visiblePlaces.map((v) => v.id),
                          state.collections.find((c) => c.id === placesFilter)
                            ?.name,
                        )
                      }
                    >
                      <ShareNetwork size={23} />
                    </button>
                  </div>
                  {visiblePlaces.map((v) => venueRow(v))}
                  {!visiblePlaces.length ? (
                    <div className="empty">
                      <BookmarkSimple size={32} />
                      <p>
                        {t(
                          "Your next favorite belongs here. Save a place from a friend’s meal.",
                          "下一个喜欢的地方在等你，从朋友的分享里收藏一家吧。",
                        )}
                      </p>
                    </div>
                  ) : null}
                  <div className="new-list">
                    <KeyboardInput
                      aria-label={t("New list name", "新名单名称")}
                      placeholder={t(
                        "A list of your own…",
                        "给新名单起个名字…",
                      )}
                      value={newList}
                      onChange={(e) => setNewList(e.target.value)}
                    />
                    <button
                      className="icon-button"
                      aria-label={t("Create list", "创建名单")}
                      disabled={!newList.trim()}
                      onClick={() => {
                        const c = {
                          id: crypto.randomUUID(),
                          name: newList.trim().slice(0, 50),
                          venueIds: [],
                        };
                        setState((s) => ({
                          ...s,
                          collections: [...s.collections, c],
                        }));
                        setPlacesFilter(c.id);
                        setNewList("");
                        keyboard.hide();
                        tell(
                          t(
                            "Your list is ready. Save a place to add it.",
                            "名单已创建，可从餐厅详情加入地点。",
                          ),
                        );
                      }}
                    >
                      <Plus />
                    </button>
                  </div>
                </>
              )}
              <button
                className="settings-link"
                onClick={() => open({ kind: "settings" })}
              >
                <GearSix size={17} />
                {t("Settings · Language · Demo info", "设置 · 语言 · 演示说明")}
              </button>
            </section>
          )}
        </main>
      </MobileScroll>}
      {!guest ? (
        <nav
          className="bottom-nav"
          aria-label={t("Main navigation", "主导航")}
          style={{ bottom: insets.bottomInset }}
        >
          {(["friends", "chat", "capture", "memories", "profile"] as const).map((x, i) => {
            if (x === "capture") return <button key={x} className="capture-nav" aria-label={t("Capture a meal","记录这一餐")} onClick={startCompose}><Camera size={27} weight="fill"/></button>;
            const Icon = [House, ChatCircle, Camera, CalendarBlank, User][i];
            const active = tab === x || (x === "profile" && (tab === "me" || tab === "today"));
            return (
              <button
                key={x}
                aria-label={[t("Home", "首页"), t("Chat", "聊天"), "", t("Memories", "回忆"), t("Profile", "我的")][i]}
                aria-current={active ? "page" : undefined}
                className={active ? "active" : ""}
                onClick={() => {navigate(x); if(x === "friends")setMode("map");}}
              >
                {x === "profile" ? <Avatar id={ME}/> : <Icon size={23} weight={active ? "fill" : "regular"} />}
                <span>
                  {
                    [t("Home", "首页"), t("Chat", "聊天"), "", t("Memories", "回忆"), t("Profile", "我的")][
                      i
                    ]
                  }
                </span>
              </button>
            );
          })}
        </nav>
      ) : null}
      {toast ? (
        <div
          className="toast"
          role="status"
          style={{ bottom: insets.bottomInset + 85 }}
        >
          <Check size={16} />
          {toast}
        </div>
      ) : null}
      <BottomSheet
        open={!!sheet}
        onOpenChange={(v) => {
          if (!v) close();
        }}
        title={sheetTitle}
        description={
          sheet?.kind === "compose"
            ? t(
                "Just the food and how it felt. Everything else is up to you.",
                "写下吃了什么，选一个感受。其他都随你。",
              )
            : undefined
        }
        snap={insets.keyboardHeight > 0 ? 0.68 : 0.92}
      >
        <button
          className="sheet-close"
          aria-label={t("Close", "关闭")}
          onClick={close}
        >
          <X size={21} />
        </button>
        {sheet?.kind==="people"&&<PeopleCenter network={state.network} onChange={updateNetwork} lang={lang} onPosts={showPersonPosts}/>}
        {sheet?.kind==="audience"&&<div className="audience-sheet"><p>{t("Choose whose food stories appear on Home.","选择首页地图和动态中显示谁的餐食。")}</p>{(["friends","extended"] as const).map(value=><button key={value} className={`audience-option ${circle===value?"selected":""}`} aria-pressed={circle===value} onClick={()=>{setCircle(value);setFriendFilter("");setMapFocusMealId(null);close();}}><Users size={26}/><span><strong>{value==="friends"?t("My friends","我的朋友"):t("Friends of friends","朋友的朋友")}</strong><small>{value==="friends"?t("People you’ve connected with, and your own posts.","已建立好友关系的人，以及你自己的分享。"):t("Opt-in restaurant stories through mutual friends. No home locations.","经共同好友发现主动开放的餐厅分享，不包含住家位置。")}</small></span>{circle===value&&<Check size={19}/>}</button>)}<button className="secondary wide" onClick={()=>open({kind:"people"})}><UserPlus size={18}/>{t("Find more friends","认识更多朋友")}</button></div>}
        {sheet?.kind==="person"&&selectedPerson&&<div className="person-profile"><div className="person-profile-heading"><PersonAvatar id={selectedPerson.id}/><div><h2>{selectedPerson.name}</h2><MutualLabel id={selectedPerson.id} network={state.network} lang={lang}/></div></div><ConnectionButton id={selectedPerson.id} network={state.network} onChange={updateNetwork} lang={lang}/><p className="muted">{state.network.friends.includes(selectedPerson.id)||selectedPerson.id===ME?t("Browse their shared food stories across all dates.","查看不同日期的餐食分享。"):t("Until you’re friends, only restaurant stories they opted to share with friends of friends are visible.","成为好友前，只能看TA主动向朋友的朋友开放的餐厅动态。")}</p><button className="primary wide" onClick={()=>showPersonPosts(selectedPerson.id)}>{t("View all visible posts","查看全部可见动态")}<CaretRight size={18}/></button>{selectedPerson.id!==ME&&<button className="text-button person-hide" onClick={()=>{updateNetwork(updateConnection(state.network,selectedPerson.id,state.network.hidden.includes(selectedPerson.id)?"unhide":"hide"));close();tell(state.network.hidden.includes(selectedPerson.id)?t("Posts restored","已恢复显示动态"):t("Posts hidden. You can restore them in Your people.","已隐藏动态，可在好友中心恢复显示。"));}}><EyeSlash size={16}/>{state.network.hidden.includes(selectedPerson.id)?t("Show posts again","恢复显示动态"):t("Hide this person’s posts","隐藏TA的动态")}</button>}</div>}
        {sheet?.kind === "compose" ? (
          <div className="composer">
            <label className="field-label" htmlFor="meal-food">
              {t("What did you eat?", "吃了什么？")}
            </label>
            <KeyboardInput
              id="meal-food"
              maxLength={100}
              placeholder={t("Soup dumplings, finally.", "终于吃到的小笼包")}
              value={food}
              onChange={(e) => setFood(e.target.value)}
            />
            <p className="field-label">
              {t("How was the experience?", "这一餐感觉如何？")}
            </p>
            <div className="rating-choices">
              {allVerdicts.map((v) => {
                const Icon = face[v];
                return (
                  <button
                    key={v}
                    className={verdict === v ? "selected" : ""}
                    aria-pressed={verdict === v}
                    onClick={() => setVerdict(v)}
                  >
                    <Icon size={28} weight="fill" />
                    <span>{verdictLabel(v, mealType, lang)}</span>
                  </button>
                );
              })}
            </div>
            <p className="field-label optional">
              {t("A little more, if you like", "还可以补充一点")}
              <span>{t("Optional", "选填")}</span>
            </p>
            <div className="type-choices">
              {(["homemade", "restaurant", "delivery", "other"] as const).map((x) => {
                const Icon = typeIcon[x];
                return (
                  <button
                    key={x}
                    className={mealType === x ? "selected" : ""}
                    aria-pressed={mealType === x}
                    onClick={() => {
                      const next = mealType === x ? "other" : x;
                      setMealType(next);
                      if (
                        next === "other" ||
                        next === "homemade" ||
                        (next === "delivery" && venueId === "pusadees_garden")
                      )
                        setVenueId("");
                    }}
                  >
                    <Icon size={18} />
                    {typeLabel(x, lang)}
                  </button>
                );
              })}
            </div>
            {mealType === "restaurant" || mealType === "delivery" ? (
              <label className="select-label">
                {t("Add a place", "添加地点")}
                <select
                  aria-label={t("Restaurant place", "餐厅地点")}
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                >
                  <option value="">{t("No place selected", "暂不选择")}</option>
                  {venues
                    .filter(
                      (v) =>
                        mealType !== "delivery" || v.id !== "pusadees_garden",
                    )
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
            {mealType === "other" || mealType === "delivery" ? <label className="field-label">{t("Where did you eat?", "在哪里吃的？")}<KeyboardInput aria-label={t("Meal location", "用餐地点")} placeholder={t("Optional · home, campus, a park…", "选填 · 家、学校、公园…")} value={place} maxLength={80} onChange={e=>setPlace(e.target.value)}/></label> : null}
            <input
              className="sr-only"
              ref={upload}
              type="file"
              accept="image/*"
              onChange={(e) => void readPhoto(e.target.files?.[0])}
            />
            {photo ? (
              <div className="upload-preview">
                <img src={photo} alt={t("Your meal photo", "餐食照片")} />
                <button
                  aria-label={t("Remove photo", "移除照片")}
                  className="round-control"
                  onClick={() => setPhoto("")}
                >
                  <X />
                </button>
              </div>
            ) : (
              <div className="photo-options">
                <button
                  className="secondary"
                  onClick={() => upload.current?.click()}
                >
                  <Camera size={20} />
                  {t("Add a photo", "添加照片")}
                </button>
                <button
                  className="text-button"
                  onClick={() => setPhoto("/assets/meals/braised-pork.jpg")}
                >
                  {t("Try a sample photo", "试用示例照片")}
                </button>
              </div>
            )}
            <KeyboardTextarea
              aria-label={t("Optional note", "选填短评")}
              placeholder={t(
                "Anything you’d tell a friend?",
                "有什么想告诉朋友的？",
              )}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <label className="select-label">
              {t("Share with", "分享范围")}
              <select
                aria-label={t("Share with", "分享范围")}
                value={audience}
                onChange={(e) => setAudience(e.target.value as typeof audience)}
              >
                <option value="friends">{t("Friends", "朋友")}</option>
                <option value="private">{t("Only me", "仅自己")}</option>
              </select>
            </label>
            {audience==="friends"&&mealType==="restaurant"&&venueId&&<button className={`discovery-consent ${discoverable?"selected":""}`} aria-pressed={discoverable} onClick={()=>setDiscoverable(value=>!value)}><span><strong>{t("Let friends of friends discover this meal","允许朋友的朋友发现这一餐")}</strong><small>{t("Off by default. Applies only to this restaurant post.","默认关闭，仅对这条餐厅动态生效。")}</small></span><span>{discoverable?<Check size={19}/>:<Plus size={19}/>}</span></button>}
            {composeError ? (
              <p className="form-error" role="alert">
                {composeError}
              </p>
            ) : null}
            <button className="primary wide" onClick={publish}>
              <Plus size={19} />
              {t("Share this meal", "发布这一餐")}
            </button>
          </div>
        ) : null}
        {sheet?.kind === "meal" && selectedMeal ? (
          <div className="meal-detail">
            <button className="detail-author author-profile-button" onClick={()=>open({kind:"person",id:selectedMeal.userId})}><Avatar id={selectedMeal.userId}/><span>{users.find(u=>u.id===selectedMeal.userId)?.name}<small>{selectedMeal.date===TODAY?t("Today","今天"):dayText(selectedMeal.date,lang)} · {timeText(selectedMeal.time,lang)}</small></span><CaretRight size={17}/></button>
            {selectedMeal.userId!==ME&&!state.network.friends.includes(selectedMeal.userId)&&<div className="detail-network"><MutualLabel id={selectedMeal.userId} network={state.network} lang={lang}/><ConnectionButton id={selectedMeal.userId} network={state.network} onChange={updateNetwork} lang={lang}/></div>}
            {selectedMeal.photo ? (
              <img
                className="detail-photo"
                src={selectedMeal.photo}
                alt={name(selectedMeal)}
              />
            ) : null}
            <h2>{name(selectedMeal)}</h2>
            <VerdictBadge meal={selectedMeal} lang={lang} />
            {selectedMeal.venueId ? (
              <button
                className="venue-line"
                onClick={() =>
                  open({ kind: "venue", id: selectedMeal.venueId })
                }
              >
                <MapPin size={18} />
                {venues.find((v) => v.id === selectedMeal.venueId)?.name}
                <CaretRight size={16} />
              </button>
            ) : nonVenueLocation(selectedMeal) ? (
              <p className="venue-line">
                {selectedMeal.type === "homemade" ? (
                  <House size={18} />
                ) : selectedMeal.type === "delivery" ? (
                  <Bag size={18} />
                ) : (
                  <MapPin size={18} />
                )}
                <span>{nonVenueLocation(selectedMeal)}</span>
              </p>
            ) : null}
            <p>
              {lang === "zh" && selectedMeal.noteZh
                ? selectedMeal.noteZh
                : selectedMeal.note}
            </p>
            {selectedMeal.venueId&&venues.find(v=>v.id===selectedMeal.venueId)&&<VenueActions key={selectedMeal.venueId} venue={venues.find(v=>v.id===selectedMeal.venueId)!} lang={lang} compact/>}
            {selectedMeal.venueId ? (
              <button
                className="secondary wide"
                onClick={() => {
                  setRecipients([]);
                  open({ kind: "recommend", id: selectedMeal.id });
                }}
              >
                <PaperPlaneTilt size={19} />
                {t("Recommend to…", "推荐给…")}
              </button>
            ) : null}
            <div className="detail-reactions">{[{id:"love",Icon:Heart,en:"Looks good",zh:"看着好吃"},{id:"want",Icon:ForkKnife,en:"Want a bite",zh:"想尝一口"},{id:"wow",Icon:Sparkle,en:"Love this",zh:"喜欢这餐"}].map(({id,Icon,en,zh})=><button key={id} aria-pressed={state.reactions[selectedMeal.id]===id} className={state.reactions[selectedMeal.id]===id?"selected":""} onClick={()=>setState(s=>({...s,reactions:{...s.reactions,[selectedMeal.id]:s.reactions[selectedMeal.id]===id?"":id}}))}><Icon size={18} weight={state.reactions[selectedMeal.id]===id?"fill":"regular"}/>{t(en,zh)}</button>)}</div>
            {selectedMeal.userId===ME||state.network.friends.includes(selectedMeal.userId)?<><h3>{t("Conversation", "聊聊这一餐")}</h3>
            {(state.replies[selectedMeal.id] || []).map((r) => (
              <div className="reply" key={r.id}>
                <Avatar id={ME} />
                <div>
                  <strong>Daniel</strong>
                  <p>{r.text}</p>
                </div>
              </div>
            ))}
            {!state.replies[selectedMeal.id]?.length ? (
              <p className="muted">
                {t(
                  "Was it spicy? What should I order? Start with something specific.",
                  "辣不辣？应该点什么？从一个具体的问题开始。",
                )}
              </p>
            ) : null}
            <div className="reply-compose">
              <KeyboardInput
                aria-label={t("Your reply", "你的回复")}
                placeholder={t("Ask about this meal…", "聊聊这一餐…")}
                maxLength={500}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <button
                className="icon-button"
                aria-label={t("Send reply", "发送回复")}
                disabled={!reply.trim()}
                onClick={() => {
                  const r = {
                    id: crypto.randomUUID(),
                    text: reply.trim(),
                    time: new Date().toISOString(),
                  };
                  setState((s) => ({
                    ...s,
                    replies: {
                      ...s.replies,
                      [selectedMeal.id]: [
                        ...(s.replies[selectedMeal.id] || []),
                        r,
                      ],
                    },
                  }));
                  setReply("");
                  keyboard.hide();
                  tell(t("Reply added in this demo", "回复已保存到本地演示"));
                }}
              >
                <PaperPlaneTilt size={21} />
              </button>
            </div>
            </>:<p className="conversation-lock"><LockSimple size={16}/>{t("Connect as friends to start a conversation. Reactions and restaurant sharing are still available.","成为好友后再开始聊天；现在仍可回应或分享餐厅。")}</p>}
            {selectedMeal.userId === ME ? (
              <button
                className="text-button danger"
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  setState((s) => ({
                    ...s,
                    meals: s.meals.filter((m) => m.id !== selectedMeal.id),
                  }));
                  close();
                  tell(
                    t(
                      "Meal removed from your feed and memories",
                      "已从动态和回忆中删除",
                    ),
                  );
                }}
              >
                <Trash size={16} />
                {confirmDelete
                  ? t("Confirm delete this meal", "确认删除这一餐")
                  : t("Delete this meal", "删除这一餐")}
              </button>
            ) : null}
          </div>
        ) : null}
        {sheet?.kind === "venue" && selectedVenue ? (
          <div className="venue-detail">
            <img
              className="detail-photo"
              src={selectedVenue.photo}
              alt={selectedVenue.name}
            />
            <VenueActions key={selectedVenue.id} venue={selectedVenue} lang={lang}/>
            <p>{selectedVenue.cuisine}</p>
            <div className="two-actions">
              <button
                className="primary"
                onClick={() => save(selectedVenue.id)}
              >
                <BookmarkSimple
                  size={19}
                  weight={
                    state.saved.includes(selectedVenue.id) ? "fill" : "regular"
                  }
                />
                {state.saved.includes(selectedVenue.id)
                  ? t("Saved", "已收藏")
                  : t("Save place", "收藏地点")}
              </button>
            </div>
            <div className="two-actions">
              <button
                className="text-button"
                onClick={() => open({ kind: "organize", id: selectedVenue.id })}
              >
                {t("Add to a list", "加入名单")}
              </button>
              <button
                className="text-button"
                onClick={() =>
                  startShare([selectedVenue.id], selectedVenue.name)
                }
              >
                <ShareNetwork size={17} />
                {t("Share as a list…", "以名单形式分享…")}
              </button>
            </div>
            <h3>{t("Experiences from your circle", "你和朋友的体验")}</h3>
            {readableMeals
              .filter(
                (m) =>
                  m.venueId === selectedVenue.id &&
                  (m.audience === "friends" || m.userId === ME),
              )
              .map((m) => (
                <button
                  className="experience-row"
                  key={m.id}
                  onClick={() => open({ kind: "meal", id: m.id })}
                >
                  <Avatar id={m.userId} />
                  <span>
                    <strong>
                      {users.find((u) => u.id === m.userId)?.name}
                    </strong>
                    <small>
                      {dayText(m.date, lang)} · {typeLabel(m.type, lang)}
                    </small>
                    <VerdictBadge meal={m} lang={lang} />
                  </span>
                  <CaretRight size={18} />
                </button>
              ))}
            {!readableMeals.some((m) => m.venueId === selectedVenue.id) ? (
              <p className="muted">
                {t("No shared meals here yet.", "这里还没有用餐记录。")}
              </p>
            ) : null}
          </div>
        ) : null}
        {sheet?.kind === "organize" ? (
          <div>
            <button
              className="collection-check"
              onClick={() => save(sheet.id!)}
            >
              <BookmarkSimple size={22} />
              {t("Saved places", "收藏地点")}
              {state.saved.includes(sheet.id!) ? (
                <Check size={20} />
              ) : (
                <Plus size={20} />
              )}
            </button>
            {state.collections.map((c) => (
              <button
                className="collection-check"
                key={c.id}
                onClick={() => {
                  const id = sheet.id!;
                  setState((s) => ({
                    ...s,
                    saved: s.saved.includes(id) ? s.saved : [...s.saved, id],
                    collections: s.collections.map((x) =>
                      x.id === c.id
                        ? {
                            ...x,
                            venueIds: x.venueIds.includes(id)
                              ? x.venueIds.filter((v) => v !== id)
                              : [...x.venueIds, id],
                          }
                        : x,
                    ),
                  }));
                }}
              >
                <BookmarkSimple size={22} />
                {c.name}
                {c.venueIds.includes(sheet.id!) ? (
                  <Check size={20} />
                ) : (
                  <Plus size={20} />
                )}
              </button>
            ))}
            <button className="primary wide" onClick={close}>
              {t("Done", "完成")}
            </button>
          </div>
        ) : null}
        {sheet?.kind === "recommend" && selectedMeal ? (
          <div className="recommend-form">
            <p className="muted">
              {t(
                "A recommendation feels better when it has someone in mind.",
                "想起一个具体的人，把好吃的推荐给TA。",
              )}
            </p>
            {users
              .filter((u) => state.network.friends.includes(u.id))
              .map((u) => (
                <button
                  className={
                    "recipient " + (recipients.includes(u.id) ? "selected" : "")
                  }
                  key={u.id}
                  onClick={() =>
                    setRecipients((r) =>
                      r.includes(u.id)
                        ? r.filter((x) => x !== u.id)
                        : [...r, u.id],
                    )
                  }
                >
                  <Avatar id={u.id} />
                  <strong>{u.name}</strong>
                  {recipients.includes(u.id) ? (
                    <Check size={22} />
                  ) : (
                    <Plus size={22} />
                  )}
                </button>
              ))}
            <button
              className="primary wide"
              disabled={!recipients.length}
              onClick={() => {
                const id = selectedMeal.id;
                setState((s) => ({
                  ...s,
                  sent: [...s.sent, { mealId: id, from: ME, to: recipients }],
                }));
                close();
                tell(
                  t(
                    "Recommendation saved for your selected friends (demo)",
                    "已在本地演示中保存定向推荐",
                  ),
                );
              }}
            >
              <PaperPlaneTilt size={19} />
              {t("Recommend to selected friends", "推荐给选中的朋友")}
            </button>
            <p className="fine-print">
              {t(
                "Local demo — no real message is sent.",
                "本地演示，不会向真实用户发送消息。",
              )}
            </p>
          </div>
        ) : null}
        {sheet?.kind === "share" ? (
          <div className="share-form">
            <p className="muted">
              {t(
                "They can read your list and open Google Maps. No account needed.",
                "朋友打开就能看名单、跳转Google Maps，无需注册。",
              )}
            </p>
            <label className="field-label">
              {t("List name", "名单名称")}
              <KeyboardInput
                value={shareTitle}
                maxLength={80}
                onChange={(e) => {
                  setShareTitle(e.target.value);
                  setShareLink("");
                }}
              />
            </label>
            <KeyboardTextarea
              aria-label={t("A note for your friend", "给朋友的话")}
              placeholder={t(
                "A little note for your friend (optional)",
                "给朋友留句话（选填）",
              )}
              value={shareNote}
              maxLength={500}
              onChange={(e) => {
                setShareNote(e.target.value);
                setShareLink("");
              }}
            />
            {venues.map((v) => (
              <button
                className={
                  "share-place-check " +
                  (shareIds.includes(v.id) ? "selected" : "")
                }
                key={v.id}
                onClick={() => {
                  setShareIds((a) =>
                    a.includes(v.id)
                      ? a.filter((x) => x !== v.id)
                      : [...a, v.id],
                  );
                  setShareLink("");
                }}
              >
                <span>
                  {v.name}
                  <small>{v.area}</small>
                </span>
                {shareIds.includes(v.id) ? (
                  <Check size={21} />
                ) : (
                  <Plus size={21} />
                )}
              </button>
            ))}
            <button
              className="primary wide"
              disabled={!shareIds.length}
              onClick={() => void copyLink()}
            >
              <ShareNetwork size={18} />
              {t("Create & copy public link", "生成并复制公开链接")}
            </button>
            {shareLink ? (
              <>
                <KeyboardTextarea
                  aria-label={t("Public share link", "公开分享链接")}
                  readOnly
                  value={shareLink}
                />
                <a
                  className="text-button"
                  href={shareLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Preview as a guest", "以访客身份预览")}
                  <ArrowUpRight size={16} />
                </a>
              </>
            ) : null}
            <button
              className="secondary wide"
              disabled={!shareIds.length}
              onClick={exportList}
            >
              <DownloadSimple size={19} />
              {t("Export list image", "导出名单图片")}
            </button>
            <p className="fine-print">
              {t(
                "Public snapshot: only selected places and your note are included. Photos and private conversations are not shared. A localhost link works on this computer; hosting makes it accessible to others.",
                "公开快照仅包含所选餐厅和你的留言，不包含私人对话。本地链接可在本机打开，托管后可分享给其他人。",
              )}
            </p>
          </div>
        ) : null}
        {sheet?.kind === "settings" ? (
          <div className="settings">
            <div className="settings-profile">
              <Avatar id={ME} />
              <div>
                <h2>Daniel Park</h2>
                <p>{t("Your demo profile", "你的演示身份")}</p>
              </div>
            </div>
            <h3>{t("Language", "语言")}</h3>
            <div className="segmented full">
              <button
                className={lang === "en" ? "active" : ""}
                onClick={() => setState((s) => ({ ...s, lang: "en" }))}
              >
                English
              </button>
              <button
                className={lang === "zh" ? "active" : ""}
                onClick={() => setState((s) => ({ ...s, lang: "zh" }))}
              >
                中文
              </button>
            </div>
            <h3>{t("Friends Map", "朋友地图")}</h3>
            <p className="muted">
              {t(
                "Iteration 5 · Explore My friends or opt-in restaurant stories from Friends of friends. Drag the illustrated map, pinch or use +/− to zoom. Pin positions are illustrative; home positions are approximate. Copy, export or share a restaurant address, or open Google Maps. Friend requests, Chat and reactions are local demo state.",
                "第5版 · 可切换我的朋友与朋友的朋友，后者仅显示主动开放的餐厅动态。插画地图可拖动、双指或加减号缩放，标记位置用于演示，住家位置已模糊处理。餐厅支持复制、导出和分享地址，也可打开Google Maps。好友申请、聊天与回应仅保存在本机。",
              )}
            </p>
            <h3>{t("About this demo", "关于本演示")}</h3>
            <p className="muted">
              {t(
                "Post photos were supplied by the designer. Names, avatars, dates and meal histories are demo data, not identities of people in the photos. Restaurant branches are example locations. The map, avatars and older restaurant-catalog images are illustrative. Changes stay in this browser; no real messages are sent. Presentation sessions are temporary.",
                "动态照片由设计者提供。姓名、头像、日期与用餐经历为演示数据，不代表照片中的人物身份。餐厅分店为示例地点，地图、头像和部分旧餐厅目录图片为示意图。更改仅保存在本机，不会发送真实消息；演示文稿中的操作不会保存。",
              )}
            </p>
            <button
              className="secondary wide"
              onClick={() => {
                if (!resetConfirm) {
                  setResetConfirm(true);
                  return;
                }
                setState(initial());
                setResetConfirm(false);
                close();
                setTab("friends");
                setMode("map");
                setCircle("friends");setFriendFilter("");setMapFocusMealId(null);
                tell(t("Demo reset", "演示已重置"));
              }}
            >
              <ArrowClockwise size={18} />
              {resetConfirm
                ? t("Confirm reset local demo", "确认重置本地演示")
                : t("Reset demo", "重置演示")}
            </button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
