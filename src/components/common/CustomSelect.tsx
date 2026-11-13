import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface CustomSelectOption {
  value: string | number;
  label: string | React.ReactNode;
  icon?: React.ReactNode;
  sublabel?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value?: string | number;
  onChange?: (e: any) => void;
  options?: CustomSelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  searchable?: boolean;
  name?: string;
  id?: string;
  'aria-label'?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  children,
  placeholder = 'Select an option...',
  className = '',
  dropdownClassName = '',
  disabled = false,
  icon,
  searchable,
  name,
  id,
  'aria-label': ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Parse options from props or children (<option value="...">...</option>)
  const parsedOptions = useMemo<CustomSelectOption[]>(() => {
    if (options && options.length > 0) {
      return options;
    }

    const collected: CustomSelectOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const val = child.props.value !== undefined ? child.props.value : '';
        const label = child.props.children !== undefined ? child.props.children : String(val);
        collected.push({
          value: val,
          label: label,
          disabled: Boolean(child.props.disabled),
        });
      }
    });
    return collected;
  }, [options, children]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchFilter('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchFilter('');
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Current selected option
  const selectedOption = useMemo(() => {
    return parsedOptions.find((opt) => String(opt.value) === String(value));
  }, [parsedOptions, value]);

  // Auto-enable search if options count > 7 unless explicitly false
  const isSearchEnabled = searchable !== undefined ? searchable : parsedOptions.length > 7;

  // Filter options by search text
  const filteredOptions = useMemo(() => {
    if (!searchFilter.trim()) return parsedOptions;
    const q = searchFilter.toLowerCase();
    return parsedOptions.filter((opt) => {
      const text = typeof opt.label === 'string' ? opt.label : String(opt.value);
      const sub = opt.sublabel || '';
      return text.toLowerCase().includes(q) || sub.toLowerCase().includes(q);
    });
  }, [parsedOptions, searchFilter]);

  const handleSelect = (opt: CustomSelectOption) => {
    if (opt.disabled || disabled) return;
    setIsOpen(false);
    setSearchFilter('');

    if (onChange) {
      const syntheticEvent = {
        target: { value: opt.value, name },
        currentTarget: { value: opt.value, name },
        value: opt.value,
        toString() {
          return String(opt.value);
        },
        valueOf() {
          return opt.value;
        },
        preventDefault() {},
        stopPropagation() {},
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full text-xs font-sans text-left">
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        name={name}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchFilter('');
          }
        }}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs select-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
            : isOpen
              ? 'border-[#06C167] ring-2 ring-[#06C167]/20 shadow-md text-gray-900'
              : 'border-gray-200 hover:border-gray-300 text-gray-900 bg-white'
        } ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {icon && <span className="shrink-0 text-gray-400">{icon}</span>}
          {selectedOption ? (
            <span className="truncate font-semibold text-gray-900 flex items-center gap-1.5">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[10px] text-gray-400 font-normal">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400 font-medium truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#06C167]' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
        >
          {/* Search Filter Header (for long lists) */}
          {isSearchEnabled && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/70">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter options..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#06C167]"
                />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400 font-medium">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left text-xs font-semibold transition-colors cursor-pointer ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-gray-400'
                        : isSelected
                          ? 'bg-[#E8F8EE] text-[#048747] font-bold shadow-2xs'
                          : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-gray-400 font-normal">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#06C167] stroke-[3] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
