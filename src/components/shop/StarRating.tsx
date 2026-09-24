"use client";

import { Star } from "lucide-react";

interface Props {
  value: number;
  size?: number;
  onChange?: (value: number) => void; // إن وُجدت يصبح المكون تفاعلياً
}

export default function StarRating({ value, size = 18, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = (
          <Star
            size={size}
            className={filled ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"}
          />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n}`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}