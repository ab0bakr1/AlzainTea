type JsonLdData = Record<string, unknown> | Record<string, unknown>[];

// نهرب "<" لمنع إغلاق وسم <script> من داخل البيانات (XSS)
function serialize(data: JsonLdData): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}