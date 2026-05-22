type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string };

export function Input({ label, className = "", ...props }: Props) {
  return (
    <label className="block">
      {label && (
        <span className="block mb-1 text-sm text-neutral-600 dark:text-neutral-300">
          {label}
        </span>
      )}
      <input
        {...props}
        className={[
          "block w-full rounded-xl px-3 py-2 text-base",
          "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100",
          "border border-neutral-300 dark:border-neutral-700",
          "outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
          "placeholder:text-neutral-400",
          "disabled:bg-neutral-100 dark:disabled:bg-neutral-800",
          "disabled:text-neutral-500 disabled:cursor-not-allowed",
          "read-only:bg-neutral-50 dark:read-only:bg-neutral-800 read-only:cursor-default",
          className,
        ].join(" ")}
        style={{ WebkitTapHighlightColor: "transparent" }}
      />
    </label>
  );
}
