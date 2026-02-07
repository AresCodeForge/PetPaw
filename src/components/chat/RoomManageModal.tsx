"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  X, Plus, Pencil, Trash2, Loader2,
  MessageCircle, Dog, Cat, Heart, GraduationCap, Users,
  Megaphone, Globe, MapPin, Music, Gamepad2, Camera,
  Palette, Coffee, Flame, Sparkles, BookOpen, HelpCircle,
  type LucideIcon,
} from "lucide-react";

type Room = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
  description_en: string | null;
  description_el: string | null;
  type: string;
  icon: string | null;
  is_active: boolean;
};

type Props = {
  rooms: Room[];
  onClose: () => void;
  onRoomsChanged: () => void;
};

const ICON_MAP: Record<string, LucideIcon> = {
  MessageCircle, Dog, Cat, Heart, GraduationCap, Users,
  Megaphone, Globe, MapPin, Music, Gamepad2, Camera,
  Palette, Coffee, Flame, Sparkles, BookOpen, HelpCircle,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

export default function RoomManageModal({ rooms, onClose, onRoomsChanged }: Props) {
  const { lang } = useLanguage();
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [nameEn, setNameEn] = useState("");
  const [nameEl, setNameEl] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descEl, setDescEl] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("MessageCircle");

  const labels = {
    en: {
      title: "Manage Rooms",
      create: "Create Room",
      edit: "Edit Room",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      nameEn: "Name (English)",
      nameEl: "Name (Greek)",
      descEn: "Description (English)",
      descEl: "Description (Greek)",
      slug: "Slug (URL-friendly)",
      icon: "Icon",
      confirmDelete: "Delete this room? All messages will be lost.",
    },
    el: {
      title: "Διαχ. Δωματίων",
      create: "Δημιουργία",
      edit: "Επεξεργασία",
      delete: "Διαγραφή",
      save: "Αποθήκευση",
      cancel: "Ακύρωση",
      nameEn: "Όνομα (Αγγλικά)",
      nameEl: "Όνομα (Ελληνικά)",
      descEn: "Περιγραφή (Αγγλικά)",
      descEl: "Περιγραφή (Ελληνικά)",
      slug: "Slug (URL-friendly)",
      icon: "Εικονίδιο",
      confirmDelete: "Διαγραφή δωματίου; Όλα τα μηνύματα θα χαθούν.",
    },
  }[lang];

  const resetForm = () => {
    setNameEn(""); setNameEl(""); setDescEn(""); setDescEl(""); setSlug(""); setIcon("MessageCircle");
    setError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditRoom(null);
    setView("create");
  };

  const openEdit = (room: Room) => {
    setEditRoom(room);
    setNameEn(room.name_en);
    setNameEl(room.name_el);
    setDescEn(room.description_en || "");
    setDescEl(room.description_el || "");
    setSlug(room.slug);
    setIcon(room.icon || "MessageCircle");
    setError(null);
    setView("edit");
  };

  const handleSave = async () => {
    if (!nameEn.trim() || !slug.trim()) {
      setError("Name (EN) and slug are required");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const body = {
        name_en: nameEn.trim(),
        name_el: nameEl.trim() || nameEn.trim(),
        description_en: descEn.trim() || null,
        description_el: descEl.trim() || null,
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        icon,
      };
      const isEdit = view === "edit" && editRoom;
      const res = await fetch("/api/chat/rooms/manage", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...body, id: editRoom.id } : body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed");
        return;
      }
      onRoomsChanged();
      setView("list");
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm(labels.confirmDelete)) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/rooms/manage?id=${roomId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed");
        return;
      }
      onRoomsChanged();
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Form view (create / edit) ──
  if (view === "create" || view === "edit") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="w-96 max-w-[95vw] rounded-xl border border-border bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              {view === "create" ? labels.create : labels.edit}
            </h2>
            <button onClick={() => setView("list")} className="p-1 rounded hover:bg-border text-foreground-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-foreground-subtle">{labels.slug}</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} disabled={view === "edit"}
                className="mt-0.5 w-full rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-sm text-foreground disabled:opacity-50 focus:border-navy-soft focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-foreground-subtle">{labels.nameEn}</label>
                <input value={nameEn} onChange={e => setNameEn(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-sm text-foreground focus:border-navy-soft focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-foreground-subtle">{labels.nameEl}</label>
                <input value={nameEl} onChange={e => setNameEl(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-sm text-foreground focus:border-navy-soft focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-foreground-subtle">{labels.descEn}</label>
                <input value={descEn} onChange={e => setDescEn(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-sm text-foreground focus:border-navy-soft focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-foreground-subtle">{labels.descEl}</label>
                <input value={descEl} onChange={e => setDescEl(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-sm text-foreground focus:border-navy-soft focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-foreground-subtle">{labels.icon}</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ICON_OPTIONS.map(ic => {
                  const IconComp = ICON_MAP[ic];
                  return (
                    <button key={ic} onClick={() => setIcon(ic)} title={ic}
                      className={`rounded-lg p-1.5 border transition-colors ${icon === ic ? "border-navy-soft bg-navy-soft/10 text-navy-soft" : "border-border text-foreground-muted hover:bg-border/30"}`}>
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button onClick={() => setView("list")} className="flex-1 rounded-lg border border-border py-1.5 text-sm text-foreground-muted hover:bg-border/30 transition-colors">
              {labels.cancel}
            </button>
            <button onClick={handleSave} disabled={isLoading}
              className="flex-1 rounded-lg bg-navy-soft py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50 transition-colors">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : labels.save}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-96 max-w-[95vw] max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">{labels.title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-border text-foreground-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <button onClick={openCreate}
          className="mb-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-navy-soft/50 px-3 py-2 text-sm text-navy-soft hover:bg-navy-soft/5 transition-colors">
          <Plus className="h-4 w-4" />
          {labels.create}
        </button>

        <div className="space-y-2">
          {rooms.map(room => (
            <div key={room.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{lang === "el" ? room.name_el : room.name_en}</p>
                <p className="text-xs text-foreground-subtle truncate">{room.slug}</p>
              </div>
              <button onClick={() => openEdit(room)} className="shrink-0 rounded p-1 text-foreground-muted hover:bg-border transition-colors" title={labels.edit}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(room.id)} disabled={isLoading}
                className="shrink-0 rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50" title={labels.delete}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
