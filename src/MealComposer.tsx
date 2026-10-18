import { useRef } from "react";
import {
  Camera, CaretDown, Check, ForkKnife, House, Bag, MapPin,
  Smiley, SmileyWink, SmileyMeh, SmileySad, Users, LockSimple,
} from "@phosphor-icons/react";
import { KeyboardInput, KeyboardTextarea, useKeyboard } from "./mobile";
import { venues, verdictLabel, typeLabel, tr, type Lang, type Verdict, type MealType } from "./data";
import "./MealComposer.css";

type MealComposerProps = {
  lang: Lang;
  food: string;
  setFood(v: string): void;
  verdict: Verdict | null;
  setVerdict(v: Verdict | null): void;
  mealType: MealType;
  setMealType(v: MealType): void;
  venueId: string;
  setVenueId(v: string): void;
  place: string;
  setPlace(v: string): void;
  photo: string;
  note: string;
  setNote(v: string): void;
  audience: "friends" | "private";
  setAudience(v: "friends" | "private"): void;
  discoverable: boolean;
  setDiscoverable(v: boolean): void;
  error: string;
  onFile(file?: File): void;
  onPublish(): void;
};

const feelings = ["love", "return", "okay", "no"] as const;
const feelingIcon = { love: SmileyWink, return: Smiley, okay: SmileyMeh, no: SmileySad };
const mealTypes = ["restaurant", "homemade", "delivery", "other"] as const;
const mealTypeIcon = { restaurant: ForkKnife, homemade: House, delivery: Bag, other: MapPin };

/** A single, photo-led draft. Optional context never blocks publishing. */
export default function MealComposer(props: MealComposerProps) {
  const {
    lang, food, setFood, verdict, setVerdict, mealType, setMealType,
    venueId, setVenueId, place, setPlace, photo, note, setNote,
    audience, setAudience, discoverable, setDiscoverable, error, onFile, onPublish,
  } = props;
  const fileInput = useRef<HTMLInputElement>(null);
  const keyboard = useKeyboard();
  const t = (en: string, zh: string) => tr(lang, en, zh);
  const choosePhoto = () => {
    keyboard.hide();
    fileInput.current?.click();
  };
  const chooseType = (next: MealType) => {
    setMealType(next);
    if (next !== "restaurant") setDiscoverable(false);
    if (next === "homemade" || next === "other") setVenueId("");
    if (next === "homemade") setPlace("");
  };
  const canPublish = Boolean(photo || food.trim());

  return (
    <div className="composer meal-composer">
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-label={t("Choose a meal photo", "选择餐食照片")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      {photo ? (
        <div className="meal-composer-photo">
          <img src={photo} alt={t("Your meal photo", "餐食照片")} draggable={false} />
          <button type="button" className="meal-photo-replace" onClick={choosePhoto}>
            <Camera size={16} />{t("Replace", "换一张")}
          </button>
        </div>
      ) : (
        <button type="button" className="meal-photo-add" onClick={choosePhoto}>
          <Camera size={28} weight="light" />
          <span>{t("Add a photo", "添一张照片")}</span>
        </button>
      )}

      <label className="meal-entry-label" htmlFor="meal-food">{t("What did you eat?", "吃了什么？")}</label>
      <KeyboardInput
        id="meal-food"
        className="meal-composer-title"
        maxLength={100}
        placeholder={t("Name this meal", "给这一餐起个名字")}
        value={food}
        onChange={(event) => setFood(event.target.value)}
      />
      <label className="sr-only" htmlFor="meal-note">{t("Your words", "想说的话")}</label>
      <KeyboardTextarea
        id="meal-note"
        className="meal-composer-note"
        placeholder={t("Anything you’d tell a friend?", "有什么想和朋友说的？")}
        maxLength={500}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <details className="optional-details meal-context">
        <summary><MapPin size={16} /><span>{t("Place & feeling", "地点和感受")}</span><CaretDown size={16} /></summary>
        <div className="type-choices" role="group" aria-label={t("Meal type", "餐食类型")}>
          {mealTypes.map((type) => {
            const Icon = mealTypeIcon[type];
            return (
              <button type="button" key={type} className={mealType === type ? "selected" : ""}
                aria-pressed={mealType === type} onClick={() => chooseType(type)}>
                <Icon size={16} />{typeLabel(type, lang)}
              </button>
            );
          })}
        </div>
        {(mealType === "restaurant" || mealType === "delivery") && (
          <label className="select-label">
            {t("Restaurant", "餐厅")}
            <select value={venueId} onChange={(event) => {
              setVenueId(event.target.value);
              if (!event.target.value) setDiscoverable(false);
            }}>
              <option value="">{t("Not selected", "暂不选择")}</option>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          </label>
        )}
        {mealType !== "homemade" && !venueId && (
          <label className="select-label" htmlFor="meal-place">
            {t("Place", "地点")}
            <KeyboardInput
              id="meal-place" value={place} maxLength={80}
              placeholder={t("Optional · a restaurant, campus, a park…", "选填 · 店名、学校、公园…")}
              onChange={(event) => setPlace(event.target.value)}
            />
          </label>
        )}
        <p className="meal-feeling-label">{t("How was it?", "这一餐怎么样？")}</p>
        <div className="rating-choices" role="group" aria-label={t("Optional feeling", "感受，可不选")}>
          {feelings.map((feeling) => {
            const Icon = feelingIcon[feeling];
            return (
              <button type="button" key={feeling} className={verdict === feeling ? "selected" : ""}
                aria-pressed={verdict === feeling}
                onClick={() => setVerdict(verdict === feeling ? null : feeling)}>
                <Icon size={25} weight="fill" /><span>{verdictLabel(feeling, mealType, lang)}</span>
              </button>
            );
          })}
        </div>
      </details>

      <div className="composer-audience meal-audience">
        <span>{t("Visible to", "谁可以看")}</span>
        <div role="group" aria-label={t("Audience", "可见范围")}>
          <button type="button" aria-pressed={audience === "friends"} onClick={() => setAudience("friends")}>
            <Users size={16} />{t("Friends", "朋友")}
          </button>
          <button type="button" aria-pressed={audience === "private"} onClick={() => {
            setAudience("private");
            setDiscoverable(false);
          }}>
            <LockSimple size={15} />{t("Only me", "仅自己")}
          </button>
        </div>
      </div>
      {audience === "friends" && mealType === "restaurant" && venueId && (
        <button type="button" className="meal-discovery-toggle" aria-pressed={discoverable}
          onClick={() => setDiscoverable(!discoverable)}>
          <span>{t("Also let friends of friends discover it", "也让朋友的朋友发现")}</span>
          <span className="meal-discovery-check" aria-hidden="true">{discoverable && <Check size={13} weight="bold" />}</span>
        </button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="button" className="primary wide meal-publish" disabled={!canPublish} onClick={onPublish}>
        {audience === "private" ? t("Save this meal", "留下这一餐") : t("Share this meal", "分享这一餐")}
      </button>
    </div>
  );
}
