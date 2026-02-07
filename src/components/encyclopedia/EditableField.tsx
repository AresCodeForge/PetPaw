"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, X, Check, Loader2, Plus } from "lucide-react";

export type FieldType = "text" | "short" | "tags" | "number" | "select";

type EditableFieldProps = {
  breedId: string;
  fieldName: string;
  currentValue: string | number | string[];
  fieldType: FieldType;
  selectOptions?: { value: string; label: string }[];
  numberMin?: number;
  numberMax?: number;
  isAdmin: boolean;
  lang: string;
  onSave: (field: string, value: string | number | string[]) => Promise<boolean>;
  children: React.ReactNode;
  // For bilingual editing: show both languages side by side
  pairedField?: {
    fieldName: string;
    currentValue: string | number | string[];
    label: string;
  };
  label?: string;
};

export default function EditableField({
  breedId,
  fieldName,
  currentValue,
  fieldType,
  selectOptions,
  numberMin = 1,
  numberMax = 5,
  isAdmin,
  lang,
  onSave,
  children,
  pairedField,
  label,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | number | string[]>(currentValue);
  const [pairedEditValue, setPairedEditValue] = useState<string | number | string[]>(
    pairedField?.currentValue ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [newPairedTag, setNewPairedTag] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(currentValue);
      if (pairedField) {
        setPairedEditValue(pairedField.currentValue);
      }
    }
  }, [currentValue, pairedField?.currentValue, isEditing]);

  // Auto-focus and resize textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      autoResizeTextarea(textareaRef.current);
    }
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (!isAdmin) return <>{children}</>;

  function autoResizeTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function handleStartEdit() {
    setEditValue(currentValue);
    if (pairedField) {
      setPairedEditValue(pairedField.currentValue);
    }
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setError(null);
    setNewTag("");
    setNewPairedTag("");
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const success = await onSave(fieldName, editValue);
      if (!success) {
        setError(lang === "el" ? "Αποτυχία αποθήκευσης" : "Failed to save");
        setIsSaving(false);
        return;
      }

      // Save paired field if present
      if (pairedField) {
        const pairedSuccess = await onSave(pairedField.fieldName, pairedEditValue);
        if (!pairedSuccess) {
          setError(lang === "el" ? "Αποτυχία αποθήκευσης δεύτερου πεδίου" : "Failed to save paired field");
          setIsSaving(false);
          return;
        }
      }

      setIsEditing(false);
    } catch {
      setError(lang === "el" ? "Αποτυχία αποθήκευσης" : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddTag(isPaired = false) {
    const tag = isPaired ? newPairedTag.trim() : newTag.trim();
    if (!tag) return;
    if (isPaired) {
      const arr = Array.isArray(pairedEditValue) ? [...pairedEditValue] : [];
      if (!arr.includes(tag)) {
        arr.push(tag);
        setPairedEditValue(arr);
      }
      setNewPairedTag("");
    } else {
      const arr = Array.isArray(editValue) ? [...editValue] : [];
      if (!arr.includes(tag)) {
        arr.push(tag);
        setEditValue(arr);
      }
      setNewTag("");
    }
  }

  function handleRemoveTag(index: number, isPaired = false) {
    if (isPaired) {
      const arr = Array.isArray(pairedEditValue) ? [...pairedEditValue] : [];
      arr.splice(index, 1);
      setPairedEditValue(arr);
    } else {
      const arr = Array.isArray(editValue) ? [...editValue] : [];
      arr.splice(index, 1);
      setEditValue(arr);
    }
  }

  // Render the inline editor based on field type
  function renderEditor(
    value: string | number | string[],
    setValue: (v: string | number | string[]) => void,
    editorLabel?: string,
    isPaired = false
  ) {
    switch (fieldType) {
      case "text":
        return (
          <div className="space-y-1">
            {editorLabel && (
              <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
                {editorLabel}
              </label>
            )}
            <textarea
              ref={!isPaired ? textareaRef : undefined}
              value={value as string}
              onChange={(e) => {
                setValue(e.target.value);
                autoResizeTextarea(e.target);
              }}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground leading-relaxed focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft/30 transition-colors duration-200 resize-none"
            />
          </div>
        );

      case "short":
        return (
          <div className="space-y-1">
            {editorLabel && (
              <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
                {editorLabel}
              </label>
            )}
            <input
              ref={!isPaired ? inputRef : undefined}
              type="text"
              value={value as string}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft/30 transition-colors duration-200"
            />
          </div>
        );

      case "tags":
        const tags = Array.isArray(value) ? value : [];
        const tagInput = isPaired ? newPairedTag : newTag;
        const setTagInput = isPaired ? setNewPairedTag : setNewTag;
        return (
          <div className="space-y-2">
            {editorLabel && (
              <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
                {editorLabel}
              </label>
            )}
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-full bg-mint/20 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(idx, isPaired)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-red-100 hover:text-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(isPaired);
                  }
                }}
                placeholder={lang === "el" ? "Νέα ετικέτα..." : "New tag..."}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft/30 transition-colors duration-200"
              />
              <button
                onClick={() => handleAddTag(isPaired)}
                className="flex items-center gap-1 rounded-lg bg-navy-soft px-2.5 py-1.5 text-xs text-white hover:opacity-90 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        );

      case "number":
        const numValue = typeof value === "number" ? value : numberMin;
        return (
          <div className="space-y-1">
            {editorLabel && (
              <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
                {editorLabel}
              </label>
            )}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: numberMax - numberMin + 1 }, (_, i) => i + numberMin).map(
                (n) => (
                  <button
                    key={n}
                    onClick={() => setValue(n)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-all duration-200 ${
                      n === numValue
                        ? "bg-navy-soft text-white shadow-sm scale-110"
                        : "bg-background-secondary text-foreground-muted hover:bg-border"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
              <span className="ml-2 text-xs text-foreground-subtle">/ {numberMax}</span>
            </div>
          </div>
        );

      case "select":
        return (
          <div className="space-y-1">
            {editorLabel && (
              <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
                {editorLabel}
              </label>
            )}
            <select
              value={value as string}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft/30 transition-colors duration-200"
            >
              {selectOptions?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  }

  // Edit mode view
  if (isEditing) {
    return (
      <div className="relative rounded-xl border-2 border-navy-soft/30 bg-navy-soft/5 p-4 transition-all duration-200">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-soft">
            {lang === "el" ? "Επεξεργασία" : "Editing"}{label ? `: ${label}` : ""}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-background-secondary transition-colors disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              {lang === "el" ? "Ακύρωση" : "Cancel"}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-lg bg-navy-soft px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {lang === "el" ? "Αποθήκευση" : "Save"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Editor(s) */}
        <div className="space-y-3">
          {renderEditor(
            editValue,
            setEditValue,
            pairedField
              ? fieldName.endsWith("_en")
                ? "English"
                : fieldName.endsWith("_el")
                ? "Ελληνικά"
                : label
              : undefined,
            false
          )}
          {pairedField &&
            renderEditor(
              pairedEditValue,
              setPairedEditValue,
              pairedField.label,
              true
            )}
        </div>
      </div>
    );
  }

  // Normal view with edit button
  return (
    <div className="group relative">
      {children}
      <button
        onClick={handleStartEdit}
        className="absolute -right-1 -top-1 z-10 rounded-full bg-card/90 p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-navy-soft hover:text-white border border-border hover:border-navy-soft"
        title={lang === "el" ? "Επεξεργασία" : "Edit"}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
