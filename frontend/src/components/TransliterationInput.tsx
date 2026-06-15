import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Languages } from 'lucide-react';

interface TransliterationInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
    value: string;
    onChangeText: (value: string) => void;
    lang?: string; // default 'mr' (Marathi)
    isTextArea?: boolean;
}

export const TransliterationInput: React.FC<TransliterationInputProps> = ({
    value,
    onChangeText,
    lang = 'mr',
    className = '',
    isTextArea = false,
    ...props
}) => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [currentEnglishWord, setCurrentEnglishWord] = useState('');
    const [cursorPos, setCursorPos] = useState(0);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchSuggestions = useCallback(async (word: string) => {
        if (!word || word.length < 1) {
            setSuggestions([]);
            return;
        }
        try {
            const response = await fetch(
                `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=${lang}-t-i0-und&num=10&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
            );
            const data = await response.json();
            if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
                setSuggestions(data[1][0][1]);
                setHighlightedIndex(0);
            } else {
                setSuggestions([]);
            }
        } catch (error) {
            console.error('Transliteration error:', error);
            setSuggestions([]);
        }
    }, [lang]);

    const getCurrentWord = useCallback((text: string, cursor: number) => {
        const leftPart = text.slice(0, cursor);
        const match = leftPart.match(/([a-zA-Z]+)$/);
        return match ? match[1] : '';
    }, []);

    const applySuggestion = useCallback((suggestion: string) => {
        const text = value;
        const cursor = cursorPos;
        const wordLen = currentEnglishWord.length;
        const beforeWord = text.slice(0, cursor - wordLen);
        const afterCursor = text.slice(cursor);
        const newValue = beforeWord + suggestion + afterCursor;
        onChangeText(newValue);
        setSuggestions([]);
        setCurrentEnglishWord('');

        requestAnimationFrame(() => {
            if (inputRef.current) {
                const newPos = beforeWord.length + suggestion.length;
                inputRef.current.setSelectionRange(newPos, newPos);
                inputRef.current.focus();
            }
        });
    }, [value, cursorPos, currentEnglishWord, onChangeText]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        let newValue = e.target.value;
        const newCursor = e.target.selectionStart || 0;

        // Convert English digits to Marathi digits automatically if enabled
        if (isEnabled) {
            newValue = newValue.replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
        }

        onChangeText(newValue);
        setCursorPos(newCursor);

        if (!isEnabled) return;

        const word = getCurrentWord(newValue, newCursor);
        setCurrentEnglishWord(word);

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        if (word.length >= 1) {
            debounceTimerRef.current = setTimeout(() => {
                fetchSuggestions(word);
            }, 300);
        } else {
            setSuggestions([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!isEnabled || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
            return;
        }

        if (e.key === 'Enter' && suggestions.length > 0) {
            e.preventDefault();
            applySuggestion(suggestions[highlightedIndex]);
            return;
        }

        if (e.key === ' ' && suggestions.length > 0 && currentEnglishWord) {
            e.preventDefault();
            const selected = suggestions[highlightedIndex];
            const text = value;
            const cursor = cursorPos;
            const wordLen = currentEnglishWord.length;
            const beforeWord = text.slice(0, cursor - wordLen);
            const afterCursor = text.slice(cursor);
            const newValue = beforeWord + selected + ' ' + afterCursor;
            onChangeText(newValue);
            setSuggestions([]);
            setCurrentEnglishWord('');

            requestAnimationFrame(() => {
                if (inputRef.current) {
                    const newPos = beforeWord.length + selected.length + 1;
                    inputRef.current.setSelectionRange(newPos, newPos);
                    inputRef.current.focus();
                }
            });
            return;
        }

        if (e.key === 'Escape') {
            setSuggestions([]);
            return;
        }

        const numKey = parseInt(e.key);
        if (e.key === '0' && suggestions.length >= 10) {
            e.preventDefault();
            applySuggestion(suggestions[9]);
            return;
        }
        if (numKey >= 1 && numKey <= Math.min(suggestions.length, 9)) {
            e.preventDefault();
            applySuggestion(suggestions[numKey - 1]);
            return;
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)
            ) {
                setSuggestions([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    const Component = isTextArea ? 'textarea' : 'input';

    return (
        <div className="relative" style={{ position: 'relative' }}>
            <Component
                ref={inputRef as any}
                className={`${className} pr-10`}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onClick={(e: any) => setCursorPos(e.currentTarget.selectionStart || 0)}
                {...props}
            />
            <button
                type="button"
                onClick={() => {
                    setIsEnabled(!isEnabled);
                    if (isEnabled) setSuggestions([]);
                }}
                className={`absolute right-2 top-2 p-1 rounded-md transition-colors ${isEnabled ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
                title={isEnabled ? "मराठी टायपिंग चालू (Marathi ON)" : "मराठी टायपिंग बंद (Marathi OFF)"}
            >
                <Languages className="w-4 h-4" />
            </button>

            {suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 1000,
                        backgroundColor: 'white',
                        border: '1px solid rgba(79,70,229,0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(79,70,229,0.2)',
                        marginTop: '6px',
                        minWidth: '220px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        maxHeight: '50vh',
                        overflowY: 'auto'
                    }}
                >
                    <div style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        color: '#6366f1',
                        background: '#eef2ff',
                        borderBottom: '1px solid #e0e7ff',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                    }}>
                        "{currentEnglishWord}" → मराठी
                    </div>
                    {suggestions.map((s, i) => (
                        <div
                            key={i}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                applySuggestion(s);
                            }}
                            onMouseEnter={() => setHighlightedIndex(i)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '15px',
                                background: i === highlightedIndex ? '#eef2ff' : '#fff',
                                borderBottom: i < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                                transition: 'background 0.1s',
                            }}
                        >
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                background: i === highlightedIndex ? '#6366f1' : '#e2e8f0',
                                color: i === highlightedIndex ? '#fff' : '#64748b',
                                fontSize: '11px',
                                fontWeight: 700,
                                flexShrink: 0,
                            }}>
                                {i === 9 ? 0 : i + 1}
                            </span>
                            <span style={{
                                fontWeight: i === highlightedIndex ? 600 : 400,
                                color: '#1e293b',
                            }}>
                                {s}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
