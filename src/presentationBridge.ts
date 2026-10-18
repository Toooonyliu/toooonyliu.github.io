/** Presentation-only navigation. No meal content or personal data crosses the frame. */
export const presentationFeatures = ["map", "feed", "people", "restaurant", "capture", "chat", "memories", "profile"] as const;
export type PresentationFeature = typeof presentationFeatures[number];
export type PresentationScene = PresentationFeature | "post" | "home-meal" | "extended";
export const isPresentationScene = (value: unknown): value is PresentationScene =>
  typeof value === "string" && [...presentationFeatures, "post", "home-meal", "extended"].includes(value);

type Location = {
  tab: "friends" | "today" | "me" | "chat" | "memories" | "profile";
  mode: "map" | "feed";
  circle: "friends" | "extended";
  sheet: { kind: string } | null;
  memoryView: "moments" | "calendar" | "recaps";
  meMode: "memories" | "places";
};

export function presentationLocation({ tab, mode, circle, sheet, memoryView, meMode }: Location): { feature: PresentationFeature; screen: string } {
  const kind = sheet?.kind;
  if (kind === "compose") return { feature: "capture", screen: "Capture a meal" };
  if (["venue", "share", "organize"].includes(kind || "")) return { feature: "restaurant", screen: kind === "venue" ? "Restaurant details" : "Share & save places" };
  if (["people", "person", "audience"].includes(kind || "")) return { feature: "people", screen: kind === "person" ? "Friend profile" : kind === "audience" ? "Choose your circle" : "People & requests" };
  if (kind === "settings") return { feature: "profile", screen: "Settings" };
  if (kind === "meal" || kind === "recommend") {
    if (tab === "chat") return { feature: "chat", screen: "Meal conversation" };
    if (tab === "memories" || (tab === "me" && meMode === "memories")) return { feature: "memories", screen: "A saved meal memory" };
    if (tab === "profile") return { feature: "profile", screen: "Your meal" };
    return { feature: "feed", screen: kind === "recommend" ? "Recommend a meal" : "Meal details & replies" };
  }
  if (tab === "chat") return { feature: "chat", screen: "Meal conversations" };
  if (tab === "profile") return { feature: "profile", screen: "Your profile" };
  if (tab === "memories") return { feature: "memories", screen: memoryView === "calendar" ? "Meal calendar" : memoryView === "recaps" ? "Monthly recap" : "Your meal memories" };
  if (tab === "today" || (tab === "me" && meMode === "places")) return { feature: "restaurant", screen: tab === "today" ? "Pick a restaurant" : "Saved places" };
  if (tab === "me") return { feature: "memories", screen: "Your food diary" };
  if (circle === "extended") return { feature: "people", screen: `Friends of friends · ${mode === "map" ? "Map" : "Feed"}` };
  return { feature: mode, screen: mode === "map" ? "Today’s food map" : "Friends’ meal feed" };
}
