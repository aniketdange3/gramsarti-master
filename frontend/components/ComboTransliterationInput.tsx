
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TransliterationInput } from './TransliterationInput';
import { ChevronDown } from 'lucide-react';
import { getSearchVariations } from '../utils/transliterate';

interface ComboTransliterationInputProps {
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    options: { value: string; label: string }[];
    className?: string;
}

export const ComboTransliterationInput: React.FC<ComboTransliterationInputProps> = ({
    value,
    onChangeText,
    placeholder,
    options,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter options based on input value
    const filteredOptions = useMemo(() => {
        if (!value || !value.trim() || !isOpen) return options;
        
        const variations = getSearchVariations(value);
        return options.filter(opt => {
            const labelLower = opt.label.toLowerCase().replace(/[\s\.]/g, '');
            const valueLower = opt.value.toLowerCase().replace(/[\s\.]/g, '');
            
            return variations.some(vari => {
                const variLower = vari.toLowerCase().replace(/[\s\.]/g, '');
                return labelLower.includes(variLower) || valueLower.includes(variLower);
            });
        });
    }, [value, options, isOpen]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative flex items-center">
                <TransliterationInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    className={`w-full pr-10 ${className}`}
                    onFocus={() => setIsOpen(true)}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute z-[70] left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden shadow-indigo-600/10 animate-in fade-in zoom-in-95 duration-100 min-w-[200px]">
                    <div className="overflow-y-auto max-h-[50vh] py-1">
                        {filteredOptions.map((option, idx) => (
                            <button
                                key={`${option.value}-${idx}`}
                                type="button"
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-between group
                                    ${value === option.value 
                                        ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                                        : 'text-gray-600 hover:bg-slate-50 hover:text-primary border-l-4 border-transparent'
                                    }`}
                                onClick={() => {
                                    onChangeText(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                <span>{option.label}</span>
                                {value === option.value && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
