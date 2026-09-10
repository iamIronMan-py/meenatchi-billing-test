/**
 * Intelligent Tamil Grocery Parser
 * 
 * Rules:
 * 1. Unit Fixing: "ச்" -> kg, "கு" -> g (if qty >= 50)
 * 2. Quantity Handling: Number words (ஒரு=1, அரை=0.5, etc.)
 * 3. Context Rules: Infer missing units, handle mashups.
 * 4. Output: Strict JSON format.
 */

const tamilNumbers = {
  'ஒரு': 1, 'ஒன்னு': 1, 'ஒன்று': 1, 
  'இரண்டு': 2, 'ரெண்டு': 2, 'ரண்டு': 2,
  'மூன்று': 3, 'மூணு': 3,
  'நான்கு': 4, 'நாலு': 4,
  'ஐந்து': 5, 'ஐஞ்சு': 5, 'அஞ்சு': 5,
  'ஆறு': 6,
  'ஏழு': 7,
  'எட்டு': 8,
  'ஒன்பது': 9,
  'பத்து': 10,
  'ஒன்னரை': 1.5, 'ஒன்றரை': 1.5
};

const fractionWords = {
  'அரை': 0.5, 'ஹாஃப்': 0.5, 'half': 0.5, '1/2': 0.5,
  'கால்': 0.25, 'quarter': 0.25, '1/4': 0.25,
  'முக்கால்': 0.75, '3/4': 0.75
};

const unitMap = {
  'கிலோ': 'kg', 'கிலோஸ்': 'kg', 'கி': 'kg', 'கில': 'kg', 'kg': 'kg', 'kgs': 'kg', 'kilo': 'kg',
  'கிராம்': 'g', 'கிராம்ஸ்': 'g', 'க்ராம்': 'g', 'g': 'g', 'gram': 'g', 'grams': 'g',
  'லிட்டர்': 'liter', 'லிடர்': 'liter', 'லிடர்ஸ்': 'liter', 'liter': 'liter', 'litre': 'liter', 'l': 'liter',
  'எம்எல்': 'ml', 'மில்லி': 'ml', 'ml': 'ml',
  'பாக்கெட்': 'pkt', 'பாக்கட்': 'pkt', 'பக்கெட்': 'pkt', 'பக்கட்': 'pkt', 'packet': 'pkt', 'pkt': 'pkt',
  'பீஸ்': 'pcs', 'பீஸஸ்': 'pcs', 'pcs': 'pcs', 'piece': 'pcs', 'pieces': 'pcs',
  'ரூபாய்': 'rs', 'ரூ': 'rs', 'rs': 'rs',
  'ச்': 'kg', 'கு': 'g'
};

export function parseInput(text) {
  if (!text) return { quantity: 1, unit: 'kg', product: '', normalized_text: '' };

  let input = text.toLowerCase().trim();
  
  // Handle ₹ symbol -> ரூபாய்
  input = input.replace(/₹\s*(\d+)/g, '$1 ரூபாய்').replace(/₹/g, 'ரூபாய்');
  
  // Pre-process: Replace number words using a safer method for Tamil
  let processed = ` ${input} `;
  for (const [word, val] of Object.entries(tamilNumbers)) {
    // Avoid \b for Tamil, use whitespace/start/end markers
    processed = processed.replace(new RegExp(`(\\s)${word}(\\s)`, 'g'), `$1${val}$2`);
  }
  processed = processed.trim();

  // Handle corrections for "ச்" and "கு"
  // "2 ச்" -> "2 kg"
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*ச்(\s|$)/g, '$1 கிலோ$2');
  
  // "கு" -> "கிராம்" (always if after a number)
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*கு(\s|$)/g, '$1 கிராம்$2');

  // Handle common mashups like "100g", "1kg"
  processed = processed.replace(/(\d+(?:\.\d+)?)(kg|g|ml|l|கிலோ|கிராம்|லிட்டர்|மில்லி)\b/g, '$1 $2');

  const words = processed.split(/\s+/);
  let pairs = [];
  let currentNum = null;
  let remainingWords = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Fraction
    if (fractionWords[word]) {
      currentNum = (currentNum || 0) + fractionWords[word];
      continue;
    }

    // Number
    const num = parseFloat(word);
    if (!isNaN(num)) {
      if (currentNum !== null) {
        remainingWords.push(currentNum.toString());
      }
      currentNum = num;
      continue;
    }

    // Unit
    if (unitMap[word]) {
      pairs.push({ quantity: currentNum === null ? 1 : currentNum, unit: unitMap[word] });
      currentNum = null;
      continue;
    }

    // Not a number or unit
    if (currentNum !== null) {
      remainingWords.push(currentNum.toString());
      currentNum = null;
    }
    remainingWords.push(word);
  }
  if (currentNum !== null) remainingWords.push(currentNum.toString());

  // Clean remainingWords of Tamil suffixes (க்கு, க்) and noise words
  const noiseWords = ['ஒரு', 'ஒன்னு', 'ஒன்று', 'இரண்டு', 'ரெண்டு', 'ரண்டு', 'மூன்று', 'மூணு', 'நாலு', 'நான்கு', 'ஐந்து', 'ஐஞ்சு', 'அஞ்சு', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது', 'பத்து', 'ஒன்னரை', 'ஒன்றரை', 'அரை', 'கால்', 'முக்கால்', 'பாக்கெட்', 'பாக்கட்', 'பக்கெட்', 'பக்கட்', 'பீஸ்', 'எண்', 'ரூபாய்', 'ரூ'];
  remainingWords = remainingWords
    .filter(w => !noiseWords.includes(w))
    .map(w => w.replace(/(க்கு|க்)$/, ''));

  // Logic to decide which pair is the main quantity
  let mainQuantity = 1;
  let mainUnit = null;

  if (pairs.length > 0) {
    // 1. If we have a count unit (pkt, pcs), that is the main unit
    const countPair = pairs.find(p => ['pkt', 'pcs'].includes(p.unit));
    // rs (price) pairs always go into the product name, never as main unit
    const rsPairs = pairs.filter(p => p.unit === 'rs');
    if (countPair) {
      mainQuantity = countPair.quantity;
      mainUnit = countPair.unit;
      // The other pairs (e.g. weight) go into the product name
      pairs.forEach(p => {
        if (p !== countPair) {
          const unitLabel = Object.keys(unitMap).find(k => unitMap[k] === p.unit && k.length > 1) || p.unit;
          remainingWords.push(p.quantity + ' ' + unitLabel);
        }
      });
    } else {
      // 2. Otherwise take the last non-rs weight pair
      const nonRsPairs = pairs.filter(p => p.unit !== 'rs');
      if (nonRsPairs.length > 0) {
        const lastPair = nonRsPairs[nonRsPairs.length - 1];
        mainQuantity = lastPair.quantity;
        mainUnit = lastPair.unit;
        // Other weight pairs go into the product name
        nonRsPairs.slice(0, -1).forEach(p => {
          const unitLabel = Object.keys(unitMap).find(k => unitMap[k] === p.unit && k.length > 1) || p.unit;
          remainingWords.push(p.quantity + ' ' + unitLabel);
        });
      } else {
        // Only rs pairs - this is a price-based packet reference like "சர்க்கரை 10 ரூபாய்"
        mainQuantity = 1;
        mainUnit = 'pkt';
      }
      // Always push rs pairs into product name
      rsPairs.forEach(p => {
        remainingWords.push(p.quantity + ' ரூபாய்');
      });
    }
  }

  let quantity = mainQuantity;
  let unit = mainUnit;
  let product = remainingWords.join(' ').trim();
  
  // Default unit if not found
  if (unit === null) {
    unit = 'kg'; // Default for solids
    // Simple liquid detection? 
    const liquidKeywords = ['பால்', 'நல்லெண்ணெய்', 'தேங்காய் எண்ணெய்', 'கடலை எண்ணெய்', 'நெய்', 'தயிர்', 'தண்ணீர்', 'oil', 'milk', 'water'];
    if (liquidKeywords.some(k => input.includes(k))) {
      unit = 'liter';
    }
  }

  // Normalized Text Reconstruction
  let unitInTamil = '';
  if (unit === 'kg') unitInTamil = 'கிலோ';
  else if (unit === 'g') unitInTamil = 'கிராம்';
  else if (unit === 'liter') unitInTamil = 'லிட்டர்';
  else if (unit === 'ml') unitInTamil = 'எம்எல்';
  else unitInTamil = unit;

  // Special case: if quantity was words, use original if possible? 
  // For simplicity, we use numbers in normalized text for clarity.
  const normalized_text = `${product} ${quantity} ${unitInTamil}`.trim();

  return {
    quantity,
    unit,
    product,
    normalized_text
  };
}

/**
 * Normalizes text for search and matching
 * Handles both English and Tamil
 */
export function normalizeQuery(text) {
  if (!text) return '';
  return text.toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
    .replace(/\s{2,}/g, " "); // Collapse spaces
}

/**
 * More aggressive normalization for strict matching
 */
export function normalizeForMatch(text) {
  if (!text) return '';
  return normalizeQuery(text)
    .replace(/\s/g, '') // Remove all spaces
    .replace(/(க்கு|க்|்)$/, ''); // Remove common Tamil grammar suffixes
}

/**
 * Strict whole word matching that handles English and Tamil scripts
 */
export function isWholeWordMatch(text, query) {
  if (!text || !query) return false;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let index = t.indexOf(q);
  while (index !== -1) {
    const before = index === 0 || !/[a-zA-Z0-9\u0B80-\u0BFF]/.test(t[index - 1]);
    const after = index + q.length === t.length || !/[a-zA-Z0-9\u0B80-\u0BFF]/.test(t[index + q.length]);
    if (before && after) return true;
    index = t.indexOf(q, index + 1);
  }
  return false;
}

/**
 * Flexible matching: checks if all words in query are present in target
 * Used for "english ka english search and tamil ka thamil search"
 */
export function fuzzyMatch(target, query) {
  if (!query) return true;
  const t = normalizeQuery(target);
  const q = normalizeQuery(query);
  const words = q.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return true;
  return words.every(word => t.includes(word));
}

/**
 * Splits a long voice command into multiple item segments.
 * Smart splitting: only splits after a unit when the next word is NOT a number
 * (which would indicate a second unit for the same item, like "50 கிராம் 3 பாக்கெட்").
 */
export function splitMultipleItems(text) {
  if (!text) return [];
  
  const input = text.toLowerCase().trim();
  const unitsList = ['கிலோ', 'கிராம்', 'கிலோஸ்', 'கிராம்ஸ்', 'லிட்டர்', 'எம்எல்', 
    'பாக்கெட்', 'பாக்கட்', 'பாக்கெட்ஸ்', 'பீஸ்', 'பீஸஸ்', 'எண்',
    'ரூபாய்', 'ரூ',
    'kg', 'kgs', 'g', 'gram', 'grams', 'ml', 'l', 'liter', 'litre',
    'pkt', 'packet', 'pcs', 'piece', 'pieces', 'nos'];
  
  const numberWords = ['ஒரு', 'ஒன்னு', 'ஒன்று', 'இரண்டு', 'ரெண்டு', 'ரண்டு',
    'மூன்று', 'மூணு', 'நான்கு', 'நாலு', 'ஐந்து', 'ஐஞ்சு', 'அஞ்சு',
    'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது', 'பத்து', 'ஒன்னரை', 'ஒன்றரை',
    'அரை', 'கால்', 'முக்கால்'];
  
  const words = input.split(/\s+/);
  const segments = [];
  let currentSegment = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentSegment.push(word);
    
    // Check if current word is a unit
    const isUnit = unitsList.includes(word);
    
    if (isUnit && i < words.length - 1) {
      const nextWord = words[i + 1];
      const isNextNumber = /^\d/.test(nextWord) || numberWords.includes(nextWord);
      
      if (isNextNumber) {
        // Next word is a number — check if this is same-item multi-unit (e.g. "50g 3 pkt")
        // or a new item starting with quantity (e.g. "... கிலோ 2 சர்க்கரை")
        // Look 2 words ahead: if it's another unit, keep together (same item)
        const nextNextWord = words[i + 2];
        const isNextNextUnit = nextNextWord && unitsList.includes(nextNextWord);
        
        if (isNextNextUnit) {
          // Pattern: [unit] [number] [unit] — same item, keep together
          continue;
        }
        
        // Pattern: [unit] [number] [product-name] — could be new item
        // Only split if the word AFTER the number is NOT a unit (it's a product name)
        if (nextNextWord && !unitsList.includes(nextNextWord) && !/^\d/.test(nextNextWord) && !numberWords.includes(nextNextWord)) {
          segments.push(currentSegment.join(' '));
          currentSegment = [];
        }
        // else: end of input or ambiguous, keep together
      } else {
        // Next word is not a number — it's a new product name starting, split here
        segments.push(currentSegment.join(' '));
        currentSegment = [];
      }
    }
  }
  
  // Don't forget the last segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment.join(' '));
  }
  
  return segments.length > 0 ? segments : [text];
}
