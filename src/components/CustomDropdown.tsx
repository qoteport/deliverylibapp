import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  sublabel?: string;
}

interface CustomDropdownProps {
  options: (DropdownOption | string)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  showSearch?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search street or area...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  icon,
  disabled = false,
  showSearch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options
  const normalizedOptions: DropdownOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Auto-enable search bar when option count is 4 or more, or if explicitly enabled
  const shouldShowSearch = showSearch !== undefined ? showSearch : normalizedOptions.length >= 4;

  // Filter options based on embedded search query
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      if (shouldShowSearch) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }
  }, [isOpen, shouldShowSearch]);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-2xl text-xs font-semibold text-[#111827] flex items-center justify-between gap-2 shadow-xs transition-all focus:outline-none focus:border-[#06C167] focus:ring-2 focus:ring-[#06C167]/10 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-gray-500 shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#E8F8EE] text-[#048747] rounded-md">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#06C167]' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Menu Popover with Embedded Search Bar */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 mt-1.5 max-h-72 overflow-hidden flex flex-col rounded-2xl bg-white border border-gray-100 shadow-2xl animate-dropdown ${menuClassName}`}
        >
          {/* Embedded Search Bar */}
          {shouldShowSearch && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/70 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#06C167] focus:ring-2 focus:ring-[#06C167]/10 transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-gray-400 hover:text-gray-700 p-0.5 rounded-full"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Options List */}
          <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-60">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                <p className="font-semibold text-gray-600">No matching streets found</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Try searching &quot;Sinkor&quot;, &quot;12th&quot; or &quot;Broad&quot;</p>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs font-medium rounded-xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8F8EE] text-[#048747] font-bold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <span className="truncate block">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-gray-400 font-normal block truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-[#048747]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Counter Footer if Searching */}
          {searchQuery && (
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between font-mono shrink-0">
              <span>{filteredOptions.length} of {normalizedOptions.length} places</span>
              <span>Monrovia Map</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
