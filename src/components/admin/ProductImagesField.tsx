"use client";

import { useState } from "react";

const MAX_IMAGES = 10;

const inputClass =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

const iconButtonClass =
  "grid size-8 place-items-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-30";

/** قائمة روابط الصور. الصورة الأولى هي الرئيسية في المتجر. */
export function ProductImagesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function setAt(index: number, url: string) {
    onChange(value.map((item, i) => (i === index ? url : item)));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      {value.length === 0 && (
        <p className="rounded-md border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">
          لم تُضف صوراً بعد. المنتج النشط يحتاج صورة واحدة على الأقل.
        </p>
      )}

      {value.map((url, index) => (
        <div key={index} className="flex items-center gap-3">
          <Thumb key={url} url={url} />
          <div className="grid min-w-0 flex-1 gap-1">
            <input
              dir="ltr"
              inputMode="url"
              value={url}
              onChange={(e) => setAt(index, e.target.value)}
              placeholder="https://.../image.jpg"
              aria-label={`رابط الصورة ${index + 1}`}
              className={inputClass}
            />
            {index === 0 && url.trim() && (
              <span className="text-xs text-emerald-700">الصورة الرئيسية</span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label="نقل للأعلى"
              className={iconButtonClass}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === value.length - 1}
              aria-label="نقل للأسفل"
              className={iconButtonClass}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="حذف الصورة"
              className={`${iconButtonClass} text-red-600`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
          disabled={value.length >= MAX_IMAGES}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          إضافة صورة
        </button>
        <span className="ms-3 text-xs text-stone-400">
          {value.length} / {MAX_IMAGES}
        </span>
      </div>
    </div>
  );
}

function Thumb({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const src = url.trim();
  const valid = /^(https?:\/\/|\/)\S+$/.test(src);

  if (!valid || failed) {
    return (
      <div
        className="grid size-14 shrink-0 place-items-center rounded-md border border-dashed border-stone-300 bg-stone-50 text-[10px] text-stone-400"
        title={src && !failed ? "رابط غير صالح" : undefined}
      >
        {src ? "تعذّر" : ""}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="size-14 shrink-0 rounded-md border border-stone-200 object-cover"
    />
  );
}