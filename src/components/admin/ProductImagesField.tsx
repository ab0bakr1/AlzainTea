"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const MAX_IMAGES = 10;

const inputClass = "adm-control w-full";

const iconButtonClass =
  "grid size-9 place-items-center rounded-full border border-[var(--border-color-strong)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-200)] disabled:cursor-not-allowed disabled:opacity-30";

/** قائمة روابط الصور. الصورة الأولى هي الرئيسية في المتجر. */
export function ProductImagesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations("adminPanel.productImages");

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
        <p className="adm-empty !p-4 text-sm">{t("empty")}</p>
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
              aria-label={t("urlAria", { n: index + 1 })}
              className={inputClass}
            />
            {index === 0 && url.trim() && (
              <span className="ds-text-alt text-xs font-medium">{t("primary")}</span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={t("moveUp")}
              className={iconButtonClass}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === value.length - 1}
              aria-label={t("moveDown")}
              className={iconButtonClass}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label={t("remove")}
              className={`${iconButtonClass} !text-[var(--color-danger)]`}
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
          className="ds-btn ds-btn-outline adm-btn-sm"
        >
          {t("add")}
        </button>
        <span className="adm-subtle ms-3 text-xs">
          {value.length} / {MAX_IMAGES}
        </span>
      </div>
    </div>
  );
}

function Thumb({ url }: { url: string }) {
  const t = useTranslations("adminPanel.productImages");
  const [failed, setFailed] = useState(false);
  const src = url.trim();
  const valid = /^(https?:\/\/|\/)\S+$/.test(src);

  if (!valid || failed) {
    return (
      <div
        className="adm-thumb adm-thumb-empty grid !size-14 place-items-center text-[10px] text-[var(--color-text-disabled)]"
        title={src && !failed ? t("invalidUrl") : undefined}
      >
        {src ? t("failed") : ""}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="adm-thumb !size-14"
    />
  );
}