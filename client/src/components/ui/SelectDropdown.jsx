import { useRef, useEffect, useState } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";

/**
 * @param {Array}    options     - [{ value, label }]
 * @param {string}   value       - selected value
 * @param {Function} onChange    - (value) => void
 * @param {string}   placeholder - shown when no selection
 * @param {string}   className   - optional wrapper class
 */
export default function SelectDropdown({ options, value, onChange, placeholder = "Select...", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 border rounded-[var(--radius-md)] px-3 h-9 text-[13px] w-full transition-all"
        style={{
          background: "var(--bg-raised)",
          borderColor: open ? "var(--accent)" : "var(--border-base)",
          color: value ? "var(--text-primary)" : "var(--text-tertiary)",
          boxShadow: open ? "0 0 0 2px rgba(37,99,235,0.15)" : "none",
        }}
      >
        <span className="flex-1 text-left truncate">{selected?.label || placeholder}</span>
        <ChevronDown
          className="w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-full min-w-[160px] rounded-[var(--radius-md)] border overflow-hidden z-50"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-base)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 h-8 text-[13px] transition-colors flex items-center justify-between"
              style={{
                background: value === opt.value ? "var(--accent-bg)" : "transparent",
                color: value === opt.value ? "var(--accent)" : "var(--text-secondary)",
              }}
              onMouseEnter={(e) => { if (value !== opt.value) e.currentTarget.style.background = "var(--bg-raised)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = value === opt.value ? "var(--accent-bg)" : "transparent"; }}
            >
              <span>{opt.label}</span>
              {value === opt.value && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}