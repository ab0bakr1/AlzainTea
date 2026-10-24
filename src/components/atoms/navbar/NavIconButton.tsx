interface Props {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

export default function NavIconButton({ onClick, label, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#f0e6d3] transition-colors hover:bg-[var(--color-bg-alt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      {children}
    </button>
  );
}