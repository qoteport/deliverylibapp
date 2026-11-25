import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  LoaderCircle,
  Image as ImageIcon,
  ChevronDown,
  Search,
} from "lucide-react";
import { Row } from "./model";
const dialogStack: symbol[] = [];
let bodyOverflow = "";
export const Button = ({
  children,
  secondary = false,
  danger = false,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  secondary?: boolean;
  danger?: boolean;
}) => (
  <button
    {...props}
    className={`a-button ${secondary ? "secondary" : ""} ${danger ? "danger" : ""} ${className}`}
  >
    {children}
  </button>
);
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose),
    token = useRef(Symbol()),
    id = useId();
  closeRef.current = onClose;
  useEffect(() => {
    const prior = document.activeElement as HTMLElement;
    if (!dialogStack.length) bodyOverflow = document.body.style.overflow;
    dialogStack.push(token.current);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (dialogStack.at(-1) !== token.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
          ) || [],
        ).filter((n) => n.offsetParent !== null);
        const first = nodes[0],
          last = nodes.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey && document.activeElement === first) {
          last?.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      const index = dialogStack.indexOf(token.current);
      if (index >= 0) dialogStack.splice(index, 1);
      if (!dialogStack.length) document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", key, true);
      prior?.focus();
    };
  }, []);
  return createPortal(
    <div
      className="a-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`a-dialog ${wide ? "wide" : ""}`}
      >
        <header>
          <h2 id={id}>{title}</h2>
          <button
            className="a-icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={22} />
          </button>
        </header>
        <div className="a-dialog-body">{children}</div>
        <footer>
          <Button secondary onClick={onClose}>
            <X size={17} />
            Close
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <label className="a-field">
      <span>{label}</span>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, { id })
        : children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: (string | { value: string; label: string })[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <>
      <Field label={label}>
        <button
          disabled={disabled}
          className="a-select"
          type="button"
          onClick={() => {
            setOpen(true);
            setQuery("");
          }}
        >
          <span>
            {normalized.find((o) => o.value === value)?.label ||
              "Choose an option"}
          </span>
          <ChevronDown size={18} />
        </button>
      </Field>
      {open && (
        <Dialog title={label} onClose={() => setOpen(false)}>
          <input
            aria-label={`Search ${label}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an option..."
          />
          {normalized
            .filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
            .map((o) => (
              <button
                type="button"
                key={o.value}
                className={`a-option ${o.value === value ? "selected" : ""}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
                {o.value === value && <span>✓</span>}
              </button>
            ))}
        </Dialog>
      )}
    </>
  );
}
export function Photo({
  src,
  alt = "",
  className = "",
  style,
}: {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={style}
    />
  ) : (
    <span
      className={`a-photo-fallback ${className}`}
      style={style}
      role="img"
      aria-label={alt || "No photo"}
    >
      <ImageIcon size={28} />
    </span>
  );
}
export const Busy = ({ text = "Loading..." }: { text?: string }) => (
  <div className="a-busy" role="status">
    <LoaderCircle className="spin" size={24} />
    {text}
  </div>
);
export const Empty = ({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) => (
  <div className="a-empty">
    <h3>{title}</h3>
    {children}
  </div>
);
export function Notice({
  error,
  retry,
}: {
  error: string | null;
  retry?: () => void;
}) {
  return error ? (
    <div className="a-error" role="alert">
      {error}
      {retry && <button onClick={retry}>Try again</button>}
    </div>
  ) : null;
}

export const ShoeIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 14V8l4 2 3-3 4 5 5 2c1.4.5 2 1.4 2 3v2H3v-5Z" />
    <path d="M3 16h18M9 10l3 1m-1 1 3 1" />
  </svg>
);
