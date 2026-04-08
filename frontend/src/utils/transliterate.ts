/**
 * English (Latin) to Marathi (Devanagari) Transliteration Utility
 * Converts phonetic English input to Devanagari script for search matching.
 * Supports common Marathi names, places, and words.
 */

// Vowel matras (used after consonants)
const MATRA: Record<string, string> = {
    'aa': 'ा', 'a': '', // default inherent 'a'
    'ee': 'ी', 'ii': 'ी', 'i': 'ि',
    'oo': 'ू', 'uu': 'ू', 'u': 'ु',
    'ai': 'ै', 'ei': 'ै',
    'au': 'ौ', 'ou': 'ौ',
    'e': 'े', 'o': 'ो',
    'ri': 'ृ', 'ru': 'ृ',
};

// Standalone vowels (used at beginning of word or after another vowel)
const VOWELS: Record<string, string> = {
    'aa': 'आ', 'a': 'अ',
    'ee': 'ई', 'ii': 'ई', 'i': 'इ',
    'oo': 'ऊ', 'uu': 'ऊ', 'u': 'उ',
    'ai': 'ऐ', 'ei': 'ऐ',
    'au': 'औ', 'ou': 'औ',
    'e': 'ए', 'o': 'ओ',
    'ri': 'ऋ',
};

// Consonants mapping (longer patterns first for greedy match)
const CONSONANTS: [string, string][] = [
    // Aspirated & special combinations first (longer matches)
    ['shh', 'ष'], ['sh', 'श'],
    ['chh', 'छ'], ['ch', 'च'],
    ['thh', 'ठ'], ['th', 'थ'],
    ['dhh', 'ढ'], ['dh', 'ध'],
    ['kh', 'ख'], ['gh', 'घ'],
    ['jh', 'झ'], ['ph', 'फ'],
    ['bh', 'भ'],
    ['ng', 'ं'],  // anusvar
    ['ny', 'ञ'], ['gn', 'ज्ञ'],
    ['tr', 'त्र'], ['dn', 'द्न'],
    ['nh', 'ण'],
    // Simple consonants
    ['k', 'क'], ['g', 'ग'],
    ['c', 'च'],
    ['j', 'ज'], ['z', 'झ'],
    ['t', 'त'], ['d', 'द'],
    ['n', 'न'],
    ['p', 'प'], ['f', 'फ'],
    ['b', 'ब'],
    ['m', 'म'],
    ['y', 'य'], ['r', 'र'],
    ['l', 'ल'], ['v', 'व'], ['w', 'व'],
    ['s', 'स'], ['h', 'ह'],
    ['q', 'क'], ['x', 'क्ष'],
];

// Common name/word shortcuts for direct matching
const COMMON_WORDS: Record<string, string[]> = {
    'vijay': ['विजय'],
    'sonu': ['सोनू', 'सोनु'],
    'raju': ['राजू', 'राजु'],
    'shankarpur': ['शंकरपुर'],
    'velahri': ['वेळाहरी', 'वेळाहारी'],
    'velahari': ['वेळाहरी', 'वेळाहारी'],
    'gotal': ['गोटाळ'],
    'gotaal': ['गोटाळ'],
    'panjri': ['पांजरी'],
    'panjari': ['पांजरी'],
    'ward': ['वॉर्ड'],
    'shri': ['श्री', 'श्रि'],
    'sri': ['श्री'],
    'smt': ['सौ', 'श्रीमती'],
    'kumar': ['कुमार'],
    'bai': ['बाई', 'बाइ'],
    'rao': ['राव', 'राऊ'],
    'patil': ['पाटील', 'पाटिल'],
    'deshmukh': ['देशमुख'],
    'jadhav': ['जाधव'],
    'bhujhe': ['भुजे'],
    'bhuje': ['भुजे'],
    'khandale': ['खंडाळे', 'खंडाले'],
    'rcc': ['आर.सी.सी'],
    'khali': ['खाली'],
    'jaga': ['जागा'],
    'bandh': ['बांध'],
    'bandhkam': ['बांधकाम'],
    'malak': ['मालक'],
    'bhogvata': ['भोगवटा'],
    'plot': ['प्लॉट'],
    'khasra': ['खसरा'],
    'layout': ['लेआउट'],
};

/**
 * Normalize digits between English (0-9) and Marathi (०-९)
 */
export function normalizeDigits(input: string, toMarathi: boolean = false): string {
    const en = '0123456789';
    const mr = '०१२३४५६७८९';
    if (toMarathi) {
        return input.replace(/[0-9]/g, d => mr[en.indexOf(d)]);
    }
    return input.replace(/[०-९]/g, d => en[mr.indexOf(d)]);
}

/**
 * Transliterate English text to Devanagari (Marathi)
 */
export function transliterate(input: string): string {
    if (!input) return '';
    
    // First, pass through numbers but normalize them if they are Marathi digits
    // Actually, for search we want to handle both, so we'll keep digits as they are
    // but the normalizeDigits helper will be used in getSearchVariations.

    const text = input.toLowerCase().trim();
    let result = '';
    let i = 0;
    let afterConsonant = false;

    while (i < text.length) {
        let matched = false;

        // Skip spaces and special chars
        if (text[i] === ' ' || text[i] === '.' || text[i] === '/' || text[i] === '-') {
            if (afterConsonant) {
                result += '्'; // halant before space if consonant without vowel
            }
            result += text[i];
            afterConsonant = false;
            i++;
            continue;
        }

        // Handle digits (keep them as is in transliterate, normalization happens in variations)
        if (/[0-9०-९]/.test(text[i])) {
            if (afterConsonant) {
                result += '्';
            }
            result += text[i];
            afterConsonant = false;
            i++;
            continue;
        }

        // Try matching consonants (longest first)
        for (const [eng, dev] of CONSONANTS) {
            if (text.substring(i, i + eng.length) === eng) {
                if (afterConsonant) {
                    // Check if next is a vowel
                    const remaining = text.substring(i + eng.length);
                    let hasVowel = false;
                    // Check for vowel patterns after this consonant
                    for (const vKey of Object.keys(MATRA).sort((a, b) => b.length - a.length)) {
                        if (remaining.startsWith(vKey)) {
                            hasVowel = true;
                            break;
                        }
                    }
                    if (!hasVowel) {
                        result += '्'; // halant - no vowel follows previous consonant
                    }
                }
                result += dev;
                afterConsonant = true;
                i += eng.length;
                matched = true;
                break;
            }
        }
        if (matched) continue;

        // Try matching vowels (longest first)
        const vowelKeys = Object.keys(afterConsonant ? MATRA : VOWELS).sort((a, b) => b.length - a.length);
        for (const vKey of vowelKeys) {
            if (text.substring(i, i + vKey.length) === vKey) {
                if (afterConsonant) {
                    result += MATRA[vKey] || '';
                } else {
                    result += VOWELS[vKey] || MATRA[vKey] || '';
                }
                afterConsonant = false;
                i += vKey.length;
                matched = true;
                break;
            }
        }
        if (matched) continue;

        // Number or unknown char - pass through
        if (afterConsonant) {
            afterConsonant = false;
        }
        result += text[i];
        i++;
    }

    // End of string: if last char was consonant, add inherent 'a' (common in Marathi names)
    // Don't add halant at end - Marathi names usually end with inherent vowel
    return result;
}

/**
 * Generate multiple possible Devanagari variations for a search term
 */
export function getSearchVariations(input: string): string[] {
    if (!input) return [];
    const q = input.toLowerCase().trim();
    const variations: string[] = [q]; // Always include original

    // Digit normalization: if contains digits, add the other script's version
    if (/[0-9]/.test(q)) {
        variations.push(normalizeDigits(q, true));
    }
    if (/[०-९]/.test(q)) {
        variations.push(normalizeDigits(q, false));
    }

    // Check common words dictionary
    const words = q.split(/\s+/);
    for (const word of words) {
        if (COMMON_WORDS[word]) {
            variations.push(...COMMON_WORDS[word]);
        }
    }

    // Add transliterated version
    const transliterated = transliterate(q);
    if (transliterated && transliterated !== q) {
        variations.push(transliterated);
        
        // Also add digit-normalized versions of the transliteration
        if (/[0-9]/.test(transliterated)) {
            variations.push(normalizeDigits(transliterated, true));
        }
        if (/[०-९]/.test(transliterated)) {
            variations.push(normalizeDigits(transliterated, false));
        }
    }

    // Also try with halant at end (consonant-ending words)
    if (transliterated && !transliterated.endsWith('्')) {
        const withHalant = transliterated + '्';
        variations.push(withHalant);
        if (/[0-9]/.test(withHalant)) variations.push(normalizeDigits(withHalant, true));
    }

    return [...new Set(variations)]; // deduplicate
}

/**
 * Check if any field in a record matches any of the search variations
 */
export function matchesSearch(record: any, searchTerm: string): boolean {
    if (!searchTerm || !searchTerm.trim()) return true;

    const variations = getSearchVariations(searchTerm);

    const propertyTypesArr: string[] = [];
    if (record.sections && Array.isArray(record.sections)) {
        for (const s of record.sections) {
            if (s.propertyType && s.propertyType !== 'निवडा') {
                propertyTypesArr.push(s.propertyType);
            }
        }
    }
    const propertyTypesStr = propertyTypesArr.join(' ');

    const fieldsToSearch = [
        record.ownerName || '',
    ];

    for (const field of fieldsToSearch) {
        const fieldLower = field.toLowerCase().replace(/[\s\.]/g, '');
        for (const variation of variations) {
            const varLower = variation.toLowerCase().replace(/[\s\.]/g, '');
            if (varLower && fieldLower.includes(varLower)) {
                return true;
            }
        }
    }

    return false;
}
