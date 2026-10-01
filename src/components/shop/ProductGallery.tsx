"use client";

import Image from "next/image";
import { useState } from "react";

type Props = { images: string[]; alt: string };

export default function ProductGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);
  const list = images.slice(0, 6);

  return (
    <div className="grid gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
        {list[active] && (
          <Image
            key={list[active]}
            src={list[active]}
            alt={alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        )}
      </div>

      {list.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="tablist" aria-label={alt}>
          {list.map((img, i) => (
            <button
              key={img}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-lg bg-stone-100 outline-offset-2 transition focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                i === active ? "ring-2 ring-emerald-700" : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={img} alt={`${alt} ${i + 1}`} fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}