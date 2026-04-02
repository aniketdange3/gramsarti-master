import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { getSearchVariations } from '../utils/transliterate';

interface Option {
    value: string;
    label: string;
}

interface CustomDropdownProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
    showX?: boolean;
    onClear?: () => void;
    hideSearch?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder,
    className = "",
    showX = false,
    onClear,
    hideSearch = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(o => o.value === value);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const variations = getSearchVariations(searchTerm).map(v => v.toLowerCase());
        
        return options.filter(opt => {
            const labelLower = opt.label.toLowerCase();
            const valueLower = opt.value.toLowerCase();
            return variations.some(variant => 
                labelLower.includes(variant) || 
                valueLower.includes(variant)
            );
        });
    }, [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-primary/50 transition-all min-w-[120px]"
            >
                <span className={`text-xs font-bold truncate ${!value ? 'text-gray-400' : 'text-primary'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {showX && value && onClear && (
                        <X 
                            className="w-3 h-3 text-gray-400 hover:text-rose-500 transition-colors" 
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                        />
                    )}
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 min-w-[200px]">
                    {/* Search Input */}
                    {!hideSearch && (
                        <div className="p-2 border-b border-gray-50 bg-slate-50/50 sticky top-0">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-[11px] font-bold outline-none focus:border-primary/50 transition-all"
                                    placeholder="शोधा..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}

                    {/* Options List */}
                    <div className="overflow-y-auto max-h-[50vh] py-1">
                        <div
                            onClick={() => { onChange(""); setIsOpen(false); }}
                            className="px-3 py-2 text-xs font-bold text-gray-400 hover:bg-slate-50 cursor-pointer"
                        >
                            {placeholder}
                        </div>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                    className={`px-3 py-2 text-xs font-bold hover:bg-primary/5 cursor-pointer transition-colors ${opt.value === value ? 'text-primary bg-primary/[0.02]' : 'text-gray-700'}`}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                                काहीही आढळले नाही
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
