'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface SimpleMultiSelectProps {
  label: string;
  filterKey: string;
  options: (string | number)[];
  placeholder: string;
  selectedValues: string[];
  onSelectionChange: (
    filterKey: string,
    value: string,
    checked: boolean
  ) => void;
}

const SEARCH_THRESHOLD = 7;

export const SimpleMultiSelect = memo(function SimpleMultiSelect({
  label,
  filterKey,
  options,
  placeholder,
  selectedValues,
  onSelectionChange,
}: SimpleMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, filterKey]);

  const showSearch = options.length > SEARCH_THRESHOLD;

  const filteredOptions = useMemo(() => {
    if (!showSearch || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((option) => String(option).toLowerCase().includes(q));
  }, [options, search, showSearch]);

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? String(selectedValues[0])
        : `${selectedValues.length} seleccionados`;

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) setSearch('');
      return next;
    });
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={toggleOpen}
          className="flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-none hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
        >
          <span
            className={
              selectedValues.length === 0 ? 'text-gray-400 truncate' : 'truncate'
            }
          >
            {displayText}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </button>

        {isOpen && (
          <div
            className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-md"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            {showSearch && (
              <div className="border-b border-gray-100 p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="h-8 pl-8 text-[13px] border-gray-200 shadow-none"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredOptions.length === 0 ? (
                <p className="text-[13px] text-gray-400 py-1.5 px-2">
                  Sin resultados
                </p>
              ) : (
                filteredOptions.map((option) => {
                  const value = String(option);
                  const isChecked = selectedValues.includes(value);
                  return (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-[13px] py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          onSelectionChange(filterKey, value, checked === true);
                        }}
                        className="h-4 w-4 rounded border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:border-emerald-600"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
