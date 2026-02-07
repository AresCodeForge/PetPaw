"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { sanitizeText, VALIDATION } from "@/lib/validation";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

const PRO_PRICE = 1.5; // Annual Pro subscription price

type DayColor = "green" | "yellow" | "orange";

interface JournalEntry {
  id: string;
  content: string;
  entry_date: string | null;
  created_at: string;
  updated_at: string;
}

function toDateKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function entryDateKey(createdAt: string, entryDate?: string | null): string {
  if (entryDate) return entryDate;
  const d = new Date(createdAt);
  return toDateKey(d);
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const DAY_COLOR_BG: Record<DayColor, string> = {
  green: "bg-mint",
  yellow: "bg-warm-yellow",
  orange: "bg-[#f08080]",
};

export default function PetJournalPage() {
  const { t, lang } = useLanguage();
  const dateLocale = lang === "el" ? "el-GR" : "en-GB";
  const { addItem } = useCart();
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [petName, setPetName] = useState("");
  const [tier, setTier] = useState<"free" | "pro">("free");
  const isPro = tier === "pro";
  const DAY_COLOR_LABELS: Record<DayColor, string> = {
    green: t("journal_colorGreen"),
    yellow: t("journal_colorYellow"),
    orange: t("journal_colorOrange"),
  };
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [dayColors, setDayColors] = useState<Record<string, DayColor>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());

  const loadPetAndEntries = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      router.push("/login");
      return;
    }

    const profileRes = await fetch("/api/profile", { credentials: "include" });
    const tierFromProfile = profileRes.ok ? (await profileRes.json()).tier : "free";
    const isProUser = tierFromProfile === "pro";
    setTier(isProUser ? "pro" : "free");

    const { data: pet, error: petError } = await supabase
      .from("pets")
      .select("name")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();

    if (petError || !pet) {
      router.push("/dashboard");
      return;
    }
    setPetName(pet.name);

    if (!isProUser) {
      setLoading(false);
      return;
    }

    const { data: rows, error } = await supabase
      .from("pet_journal_entries")
      .select("id, content, entry_date, created_at, updated_at")
      .eq("pet_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Αποτυχία φόρτωσης ημερολογίου.");
      setIsError(true);
    } else {
      setEntries((rows ?? []).map((r) => ({
        id: r.id,
        content: r.content,
        entry_date: r.entry_date ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })));
    }
    setLoading(false);
  };

  const loadDayColorsForMonth = async (year: number, month: number) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startKey = toDateKey(start);
    const endKey = toDateKey(end);

    try {
      const { data: rows, error } = await supabase
        .from("pet_journal_day_colors")
        .select("day, color")
        .eq("pet_id", id)
        .gte("day", startKey)
        .lte("day", endKey);

      if (error) return;
      const map: Record<string, DayColor> = {};
      for (const r of rows ?? []) {
        map[r.day] = r.color as DayColor;
      }
      setDayColors((prev) => ({ ...prev, ...map }));
    } catch {
      // Πίνακας pet_journal_day_colors μπορεί να μην υπάρχει ακόμα· τρέξτε supabase/migrations/002_pet_journal_day_colors.sql
    }
  };

  useEffect(() => {
    loadPetAndEntries();
  }, [id, router]);

  useEffect(() => {
    if (!id) return;
    loadDayColorsForMonth(calendarMonth.year, calendarMonth.month);
  }, [id, calendarMonth.year, calendarMonth.month]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setMessage("");
    setIsError(false);
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const entryDate = selectedDate || toDateKey(new Date());
    const { error } = await supabase.from("pet_journal_entries").insert({
      pet_id: id,
      owner_id: user.id,
      content: sanitizeText(newContent),
      entry_date: entryDate,
    });

    setSaving(false);
    if (error) {
      setMessage(error.message || t("journal_failSave"));
      setIsError(true);
      return;
    }
    setNewContent("");
    setMessage(t("journal_entryAdded"));
    loadPetAndEntries();
  };

  const handleStartEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("pet_journal_entries")
      .update({ content: sanitizeText(editContent) })
      .eq("id", editingId);

    setSaving(false);
    if (error) {
      setMessage(error.message || t("journal_failUpdate"));
      setIsError(true);
      return;
    }
    setEditingId(null);
    setEditContent("");
    setMessage(t("journal_entryUpdated"));
    loadPetAndEntries();
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm(t("journal_confirmDelete"))) return;
    setSaving(true);
    const { error } = await supabase.from("pet_journal_entries").delete().eq("id", entryId);
    setSaving(false);
    if (error) {
      setMessage(error.message || t("journal_failDelete"));
      setIsError(true);
      return;
    }
    setMessage(t("journal_entryDeleted"));
    loadPetAndEntries();
  };

  const setDayColor = async (dateKey: string, color: DayColor) => {
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase.from("pet_journal_day_colors").upsert(
        { pet_id: id, day: dateKey, color },
        { onConflict: "pet_id,day" }
      );
      if (error) {
        setMessage(error.message?.includes("schema cache") || error.message?.includes("does not exist")
          ? "Ο πίνακας χρωμάτων ημερών δεν υπάρχει ακόμα. Τρέξτε το migration 002 στο Supabase (βλ. supabase/migrations/002_pet_journal_day_colors.sql)."
          : (error.message || "Αποτυχία αποθήκευσης χρώματος."));
        setIsError(true);
        setSaving(false);
        return;
      }
      setDayColors((prev) => ({ ...prev, [dateKey]: color }));
      setMessage("Χρώμα μέρας αποθηκεύτηκε.");
    } catch {
      setMessage("Αποτυχία αποθήκευσης χρώματος. Βεβαιωθείτε ότι έχει τρέξει το migration 002 στο Supabase.");
      setIsError(true);
    }
    setSaving(false);
  };

  /** Format a date string to DD-MM-YYYY HH:MM */
  const formatDate = (s: string) => {
    const d = new Date(s);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  /** Format a YYYY-MM-DD date to DD-MM-YYYY */
  const formatDateShort = (dateKey: string) => {
    if (!dateKey) return "";
    const parts = dateKey.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateKey;
  };

  const entriesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      const k = entryDateKey(e.created_at, e.entry_date);
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!selectedDate) return entries;
    return entries.filter((e) => entryDateKey(e.created_at, e.entry_date) === selectedDate);
  }, [entries, selectedDate]);

  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const days: { dateKey: string; day: number; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, 1 - (startPad - i));
      days.push({ dateKey: toDateKey(d), day: d.getDate(), isCurrentMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const dateKey = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      days.push({ dateKey, day: d, isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 0; i < remaining; i++) {
      const d = new Date(year, month + 1, i + 1);
      days.push({ dateKey: toDateKey(d), day: d.getDate(), isCurrentMonth: false });
    }
    return days;
  }, [calendarMonth]);

  const monthLabel = useMemo(() => {
    return new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString(dateLocale, {
      month: "long",
      year: "numeric",
    });
  }, [calendarMonth, dateLocale]);

  const prevMonth = () => {
    setCalendarMonth((m) =>
      m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }
    );
  };

  const nextMonth = () => {
    setCalendarMonth((m) =>
      m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }
    );
  };

  const applyMonthYearPicker = () => {
    setCalendarMonth({ year: pickerYear, month: pickerMonth });
    setShowMonthYearPicker(false);
  };

  const openMonthYearPicker = () => {
    setPickerYear(calendarMonth.year);
    setPickerMonth(calendarMonth.month);
    setShowMonthYearPicker(true);
  };

  const MONTH_NAMES = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαϊ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center text-foreground-muted">
        {t("journal_loading")}
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/dashboard" className="text-navy-soft font-semibold hover:underline">
          ← {t("editPet_back")}
        </Link>
        <div className="mt-8 rounded-2xl border border-border bg-background-secondary p-8 text-center">
          <h2 className="text-xl font-bold text-foreground">{t("journal_title")}: {petName}</h2>
          <p className="mt-4 text-foreground-muted">{t("journal_proOnly")}</p>
          <button
            type="button"
            onClick={() => {
              addItem({
                type: "pro_subscription",
                name: t("cart_proSubscription"),
                price: PRO_PRICE,
                quantity: 1,
              });
            }}
            className="mt-6 inline-block rounded-full bg-navy-soft px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            {t("upgrade_to_pro")} — €{PRO_PRICE.toFixed(2)}/{t("cart_year")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/dashboard" className="text-navy-soft font-semibold hover:underline">
        ← {t("editPet_back")}
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">{t("journal_title")}: {petName}</h1>
        <AnimatedButton href={`/dashboard/pets/${id}/edit`} variant="sky" size="sm">
          {t("journal_editLink")}
        </AnimatedButton>
      </div>
      <p className="mt-2 text-foreground-muted">
        {t("journal_desc")}
      </p>

      {/* Calendar */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors duration-300">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background-secondary"
          >
            ←
          </button>
          <button
            type="button"
            onClick={openMonthYearPicker}
            className="text-lg font-semibold text-foreground capitalize hover:underline focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2 rounded px-2 py-1"
            title={t("journal_selectMonthYear")}
          >
            {monthLabel}
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background-secondary"
          >
            →
          </button>
        </div>
        {showMonthYearPicker && (
          <div className="mb-3 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-background-secondary p-3">
            <select
              value={pickerMonth}
              onChange={(e) => setPickerMonth(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
            <select
              value={pickerYear}
              onChange={(e) => setPickerYear(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <AnimatedButton variant="primary" size="sm" onClick={applyMonthYearPicker}>
              Εφαρμογή
            </AnimatedButton>
            <button
              type="button"
              onClick={() => setShowMonthYearPicker(false)}
              className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-card"
            >
              {t("common_cancel")}
            </button>
          </div>
        )}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-foreground-muted">
          {["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {calendarDays.map(({ dateKey, day, isCurrentMonth }) => {
            const hasEntries = entriesByDate[dateKey] > 0;
            const color = dayColors[dateKey];
            const isSelected = selectedDate === dateKey;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={`relative flex h-9 w-full flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors duration-300 ${
                  !isCurrentMonth ? "text-foreground-subtle" : "text-foreground"
                } ${
                  isSelected
                    ? "ring-2 ring-navy-soft ring-offset-2 bg-sky-soft/40"
                    : "hover:bg-background-secondary"
                } ${color ? DAY_COLOR_BG[color] + " text-foreground" : ""}`}
              >
                <span>{day}</span>
                {hasEntries && (
                  <svg className="h-3.5 w-3.5 shrink-0 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day: color picker */}
      {selectedDate && (
        <div className="mt-6 rounded-2xl border border-border bg-background-secondary p-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            Χρώμα μέρας ({formatDateShort(selectedDate)}) — διάθεση / πώς ήταν η μέρα
          </p>
          <div className="flex flex-wrap gap-2">
            {(["green", "yellow", "orange"] as const).map((c) => (
              <button
                key={c}
                type="button"
                disabled={saving}
                onClick={() => setDayColor(selectedDate, c)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                  dayColors[selectedDate] === c
                    ? DAY_COLOR_BG[c] + " ring-2 ring-foreground ring-offset-2"
                    : "bg-card border border-border text-foreground-muted hover:bg-card/80"
                }`}
              >
                {DAY_COLOR_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="mt-8 rounded-2xl border border-border bg-background-secondary p-6">
        <Input
          as="textarea"
          id="new_entry"
          rows={3}
          maxLength={VALIDATION.MAX_TEXT_LENGTH}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          label="Νέα καταχώρηση"
          placeholder={t("journal_placeholder")}
        />
        <div className="mt-3">
          <AnimatedButton type="submit" variant="primary" disabled={saving || !newContent.trim()}>
            {saving ? t("editPet_saving") : t("journal_add")}
          </AnimatedButton>
        </div>
      </form>

      {message && (
        <p className={`mt-4 text-sm ${isError ? "text-amber-700" : "text-navy-soft"}`}>
          {message}
        </p>
      )}

      <div className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {selectedDate
            ? `Καταχωρήσεις για ${formatDateShort(selectedDate)}`
            : "Προηγούμενες καταχωρήσεις"}
        </h2>
        {filteredEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-background-secondary p-8 text-center text-foreground-muted">
            {selectedDate
              ? t("journal_noEntriesDay")
              : t("journal_noEntriesAddFirst")}
          </p>
        ) : (
          <ul className="space-y-4">
            {filteredEntries.map((entry) => (
              <li
                key={entry.id}
                className="relative rounded-2xl border border-border bg-card p-4 pr-12 shadow-sm transition-colors duration-300"
              >
                <div className="absolute right-3 top-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(entry)}
                    className="rounded-lg p-1.5 text-foreground-muted hover:bg-background-secondary hover:text-navy-soft"
                    title={t("journal_edit")}
                    aria-label={t("journal_edit")}
                  >
                    <IconPencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-lg p-1.5 text-foreground-muted hover:bg-background-secondary hover:text-amber-600"
                    title={t("journal_delete")}
                    aria-label={t("journal_delete")}
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
                {editingId === entry.id ? (
                  <div>
                    <Input
                      as="textarea"
                      maxLength={VALIDATION.MAX_TEXT_LENGTH}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="rounded-lg p-2 text-foreground bg-mint hover:bg-mint-hover disabled:opacity-60 transition-colors duration-300"
                        title={t("journal_save")}
                        aria-label={t("journal_save")}
                      >
                        <IconCheck className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-lg p-2 text-foreground-muted border border-border hover:bg-background-secondary"
                        title={t("journal_cancel")}
                        aria-label={t("journal_cancel")}
                      >
                        <IconX className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-foreground whitespace-pre-wrap pr-2">{entry.content}</p>
                    <p className="mt-2 text-xs text-foreground-subtle">
                      {formatDate(entry.created_at)}
                      {entry.updated_at !== entry.created_at && (
                        <> · Ενημερώθηκε: {formatDate(entry.updated_at)}</>
                      )}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
