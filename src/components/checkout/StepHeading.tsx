// src/components/checkout/StepHeading.tsx
// عنوان قسم بنفس أسلوب عناوين الصفحة الرئيسية: عنوان + خط رفيع تحته.
// عرضي بالكامل (تصميم فقط).

type StepHeadingProps = {
  id?: string;
  as?: "h2" | "h3";
  children: React.ReactNode;
};

export default function StepHeading({ id, as: Tag = "h2", children }: StepHeadingProps) {
  return (
    <div>
      <Tag id={id} className="ds-font-heading text-2xl font-bold md:text-3xl">
        {children}
      </Tag>
      <span aria-hidden className="mt-3 block h-[2px] w-12 rounded-full bg-[var(--border-color-strong)]" />
    </div>
  );
}