import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: (string | Option)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  noResultsText?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "ابحث واختر...",
  noResultsText = "لا توجد نتائج مطابقة",
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to object format
  const normalizedOptions: Option[] = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search input
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2.5 text-right bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm ${
          disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200" : "border-slate-200 hover:border-slate-300 text-slate-800"
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-hidden flex flex-col">
          <div className="flex items-center px-3 py-2 border-b border-slate-100 bg-slate-50">
            <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="اكتب للبحث..."
              className="w-full bg-transparent border-none text-sm outline-none text-slate-800 placeholder-slate-400 py-1"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 py-1 divide-y divide-slate-50 max-h-48 text-right">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={`opt-${option.value || 'noval'}-${index}`}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-emerald-50/50 hover:text-emerald-900 transition-colors ${
                    value === option.value ? "bg-emerald-50 text-emerald-800 font-medium" : "text-slate-700"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && <Check className="w-4 h-4 text-emerald-600 shrink-0 mr-2" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">{noResultsText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
