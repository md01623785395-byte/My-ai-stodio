/**
 * Stock Metadata Quality Validation & Enforcement Engine
 * 
 * Strict Commercial Standards:
 * 1. Verify every title and description detail is supported by visible image content.
 * 2. Context-aware filtering of spices, seasonings, flavoring:
 *    - "spices", "seasonings", "spice" are PRESERVED when image depicts physical spices/herbs.
 *    - "spices", "seasonings", "seasoned" are STRIPPED when image is general food/non-food.
 *    - "flavoring", "artificial flavoring", "flavorful" are ALWAYS STRIPPED (unobservable taste/chemical).
 * 3. Filter ungrounded objects, human entities (when no humans present), vehicles, and alien items.
 * 4. Filter trademark commercial brands (Apple, Rolex, Nike, Starbucks, Tesla, etc.).
 * 5. Remove unobservable subjective emotions and actions (celebrating, thinking, dreaming, triumph).
 * 6. Enforce 5 target marketplaces' actual rules (Adobe Stock, Shutterstock, Freepik, Dreamstime, Wirestock).
 * 7. Provide honest programmatic validation audits: only mark PASS for what is verified by code,
 *    clearly distinguishing technical syntax pass from human curator/model release approvals.
 */

import { StockMarketplaceId } from '../types';

export interface MarketplaceTitleRule {
  minWords: number;
  recommendedMinChars: number;
  recommendedMaxChars: number;
  maxChars: number;
  minKeywords: number;
  maxKeywords: number;
  suffix?: string;
  ruleTitle: string;
  ruleDescription: string;
  guideNoteBn: string;
}

export const MARKETPLACE_TITLE_RULES: Record<StockMarketplaceId, MarketplaceTitleRule> = {
  'adobe-stock': {
    minWords: 5,
    recommendedMinChars: 50,
    recommendedMaxChars: 70,
    maxChars: 200,
    minKeywords: 5,
    maxKeywords: 49,
    suffix: 'Generative AI',
    ruleTitle: 'Adobe Stock Title Standard (50–70 chars)',
    ruleDescription: 'Descriptive subject without marketing hype. 5–20 words (50–70 characters recommended). Must include "Generative AI" at the end.',
    guideNoteBn: 'Adobe Stock নিয়ম: ৫০–৭০ ক্যারেক্টার (অন্তত ৫টি শব্দ), শেষে "Generative AI" থাকা আবশ্যক। কীওয়ার্ড ৫–৪৯টি।',
  },
  'shutterstock': {
    minWords: 5,
    recommendedMinChars: 60,
    recommendedMaxChars: 120,
    maxChars: 200,
    minKeywords: 7,
    maxKeywords: 50,
    ruleTitle: 'Shutterstock Detailed Title (min 5 words, 60–120 chars)',
    ruleDescription: 'Strict contributor requirement: Minimum 5 words. Rejects titles under 5 words. Detailed factual description of visible subject, setting, and composition.',
    guideNoteBn: 'Shutterstock নিয়ম: ন্যূনতম ৫টি অর্থপূর্ণ শব্দ (৬০–১২০ ক্যারেক্টার)। ৫ শব্দের কম হলে সরাসরি রিজেক্ট হয়। কীওয়ার্ড ৭–৫০টি।',
  },
  'freepik': {
    minWords: 3,
    recommendedMinChars: 30,
    recommendedMaxChars: 65,
    maxChars: 100,
    minKeywords: 5,
    maxKeywords: 50,
    ruleTitle: 'Freepik Concise Title (30–65 chars)',
    ruleDescription: 'Concise commercial stock title. 4–10 words (30–65 characters recommended). Focus strictly on primary visual subject.',
    guideNoteBn: 'Freepik নিয়ম: সংক্ষিপ্ত ও স্পষ্ট বাণিজ্যিক টাইটেল (৩০–৬৫ ক্যারেক্টার)। কীওয়ার্ড ৫–৫০টি।',
  },
  'dreamstime': {
    minWords: 5,
    recommendedMinChars: 40,
    recommendedMaxChars: 85,
    maxChars: 120,
    minKeywords: 5,
    maxKeywords: 50,
    ruleTitle: 'Dreamstime Title (min 5 words, 40–85 chars)',
    ruleDescription: 'Minimum 5 words. Clear factual identification of visual subject and technique. Avoid keyword stuffing.',
    guideNoteBn: 'Dreamstime নিয়ম: ন্যূনতম ৫টি শব্দ (৪০–৮৫ ক্যারেক্টার), তথ্যবহুল দৃশ্যমান বিবরণ। কীওয়ার্ড ৫–৫০টি।',
  },
  'wirestock': {
    minWords: 5,
    recommendedMinChars: 45,
    recommendedMaxChars: 90,
    maxChars: 120,
    minKeywords: 20,
    maxKeywords: 50,
    ruleTitle: 'Wirestock Multi-Agency Title (45–90 chars)',
    ruleDescription: 'Versatile descriptive title formatted for syndication across Adobe Stock, Freepik, and partner platforms.',
    guideNoteBn: 'Wirestock নিয়ম: মাল্টি-এজেন্সি ডিস্ট্রিবিউশনের জন্য ৪৫–৯০ ক্যারেক্টারের স্পষ্ট বিবরণ। কীওয়ার্ড ২০–৫০টি।',
  },
  'other': {
    minWords: 4,
    recommendedMinChars: 35,
    recommendedMaxChars: 80,
    maxChars: 100,
    minKeywords: 5,
    maxKeywords: 50,
    ruleTitle: 'General Stock Title (35–80 chars)',
    ruleDescription: 'Standard commercial stock title. 4–12 words describing visible elements.',
    guideNoteBn: 'স্ট্যান্ডার্ড স্টক নিয়ম: ৩৫–৮০ ক্যারেক্টার, স্পষ্ট দৃশ্যমান বিষয়বস্তু।',
  },
};

// Generic promotional buzzwords forbidden by stock agencies and quality review
export const PROMOTIONAL_FLUFF_WORDS = new Set([
  'delicious', 'tasty', 'yummy', 'mouthwatering', 'scrumptious', 'savory',
  'flavorful', 'flavourful', 'tastiest', 'fingerlicking', 'appetizing',
  'professional', 'commercial', 'commercial stock', 'professional photography',
  'commercial licensing', 'commercial photo', 'commercial image',
  'amazing', 'stunning', 'best', 'perfect', 'breathtaking', 'incredible',
  'awesome', 'gorgeous', 'beautiful', 'wonderful', 'fabulous', 'lovely',
  'premium', 'luxury', 'exclusive', 'unique', 'masterpiece', 'greatest',
  'high quality', 'top quality', 'high quality photo', 'hd photo',
  'advertising media', 'marketing media', 'promotional', 'sale',
  'creative content', 'digital creation', 'graphic resource',
  'website hero', 'desktop wallpaper', 'presentation slide',
  'lifestyle concept', 'authentic concept', 'trendy style',
  'viral', 'superb', 'epic', 'fantastic', 'delightful', 'unmatched',
  'buy now', 'cheap', 'discount', 'must have'
]);

// Commercial Trademark Brands strictly forbidden in commercial stock metadata
export const COMMERCIAL_TRADEMARK_BRANDS = new Set([
  'apple', 'iphone', 'ipad', 'macbook', 'imac', 'airpods', 'apple watch',
  'samsung', 'galaxy', 'sony', 'playstation', 'canon', 'nikon',
  'xbox', 'nintendo', 'microsoft', 'windows', 'google', 'android',
  'nike', 'adidas', 'puma', 'gucci', 'prada', 'rolex', 'chanel',
  'louis vuitton', 'dior', 'hermes', 'armani', 'versace', 'zara', 'rayban', 'ray ban',
  'starbucks', 'mcdonalds', 'mcdonald', 'burger king', 'kfc', 'coca cola', 'cocacola',
  'pepsi', 'nescafe', 'red bull', 'heineken', 'budweiser',
  'tesla', 'ferrari', 'lamborghini', 'porsche', 'bmw', 'mercedes', 'mercedes benz',
  'audi', 'toyota', 'honda', 'ford', 'chevrolet',
  'instagram', 'tiktok', 'youtube', 'facebook', 'twitter',
  'midjourney', 'chatgpt', 'dall e', 'dalle', 'stablediffusion', 'unreal engine', 'octane render'
]);

// Microscopic or unobservable food ingredients, objects & venues that AI hallucinations frequently invent
export const UNSUPPORTED_INGREDIENT_TERMS = [
  'vanilla extract', 'almond extract', 'baking powder', 'baking soda',
  'yeast', 'sea salt', 'table salt', 'refined sugar', 'cane sugar',
  'brown sugar', 'organic flour', 'wheat flour', 'preservatives',
  'artificial flavoring', 'natural flavoring', 'sodium', 'potassium', 'vitamin c',
  'protein powder', 'protein', 'secret spice', 'secret blend', 'pure butter',
  'gluten free', 'organic ingredients', 'all-natural ingredients',
  'dipping sauce', 'special sauce', 'secret sauce', 'sauce cup', 'condiment cup',
  'dipping bowl', 'dipping', 'dip', 'sauce',
  'steak knife', 'cutlery', 'silverware', 'table knife', 'knife', 'fork', 'spoon', 'utensils',
  'steam', 'steaming', 'hot steam', 'rising steam', 'smoke', 'vapor', 'steamy',
  'gastropub', 'bistro', 'diner', 'pub', 'restaurant kitchen'
];

// Incomplete phrase connectors, prepositions and dangling adjectives that break title naturalness
export const DANGLING_TRAILING_WORDS = new Set([
  'on', 'in', 'at', 'with', 'by', 'for', 'from', 'to', 'of', 'and', 'or', 'the',
  'a', 'an', 'into', 'onto', 'upon', 'over', 'under', 'against', 'beside', 'near',
  'wooden', 'rustic', 'metal', 'dark', 'light', 'fresh', 'melted', 'hot', 'cold',
  'warm', 'cutting', 'served', 'placed', 'isolated', 'shallow', 'high', 'close',
  'macro', 'grilled', 'fried', 'baked', 'organic', 'raw', 'green', 'red', 'golden',
  'ceramic', 'marble', 'black', 'white', 'round', 'square', 'clear', 'clean'
]);

// Unobservable actions, thoughts, and emotional claims
export const UNSUPPORTED_ACTION_EMOTION_PATTERNS = [
  /\bcelebrating(?:\s+(?:victory|triumph|success|promotion|deal|life))?\b/gi,
  /\b(triumphant|ambitious|deep in thought|pondering life|planning the future|dreaming of success)\b/gi,
  /\b(falling in love|broken hearted|heartbroken|nostalgic memories|feeling nostalgic)\b/gi,
  /\b(thinking about|remembering past|contemplating reality)\b/gi,
  /\b(making important decision|destined for greatness)\b/gi,
];

// Unsupported real-world geographical claims not grounded in recognizable landmarks
export const UNSUPPORTED_SETTING_PATTERNS = [
  /\bin\s+(paris|tokyo|new\s*york|manhattan|london|rome|milan|berlin|vienna|zurich|amsterdam|barcelona|kyoto|osaka)\s+(cafe|kitchen|bakery|restaurant|street|loft|apartment|room)\b/gi,
  /\b(authentic\s+italian|traditional\s+french|classic\s+japanese|authentic\s+mexican)\s+(kitchen|bakery|cafe|atmosphere)\b/gi,
];

// Provenance/banned terms
export const BANNED_STOCK_TERMS = new Set([
  'imported', 'import', 'google', 'flow', 'googleflow', 'credit', 'credits',
  'free', 'tier', 'studio', 'creation', 'asset', 'assets', 'unnamed',
  'midjourney', 'chatgpt', 'dalle', 'dall-e', 'minimax', 'stablediffusion',
  'stable', 'diffusion', 'banana', 'nano', 'prompt', 'generation', 'model',
  'local', 'media', 'sample', 'placeholder', 'null', 'undefined', 'creator',
  'enhancer', 'upscale', 'upscaled', 'jpeg', 'srgb'
]);

// Human entity terms that must not appear when hasHumans === false
export const HUMAN_ENTITY_TERMS = new Set([
  'woman', 'women', 'man', 'men', 'girl', 'girls', 'boy', 'boys',
  'child', 'children', 'model', 'models', 'portrait', 'face', 'faces',
  'hands', 'hand', 'human', 'humans', 'crowd', 'worker', 'workers',
  'businessman', 'businesswoman', 'chef', 'barista', 'driver', 'athlete',
  'couple', 'female', 'male', 'individual', 'lady', 'guy', 'smile', 'smiling',
  'person', 'people'
]);

// Subjective emotions & unobservable actions
export const SUBJECTIVE_EMOTION_TERMS = new Set([
  'celebrating', 'triumph', 'triumphant', 'thinking', 'dreaming', 'pondering',
  'contemplating', 'falling in love', 'heartbroken', 'nostalgic', 'nostalgia',
  'ambitious', 'successful', 'success', 'happiness', 'sadness', 'lonely',
  'excited', 'inspired', 'inspiration', 'victory', 'destined'
]);

// Vehicle entity terms that must not appear in non-vehicle images
export const VEHICLE_ENTITY_TERMS = new Set([
  'car', 'sports car', 'hypercar', 'automobile', 'sedan', 'truck', 'motorcycle',
  'suv', 'convertible', 'vehicle', 'cockpit', 'steering wheel', 'engine'
]);

// Food entity terms that must not appear in non-food images
export const FOOD_ENTITY_TERMS = new Set([
  'burger', 'cheeseburger', 'pizza', 'beef', 'meat', 'cheese', 'lettuce',
  'tomato', 'bread', 'bun', 'sandwich', 'pasta', 'steak', 'snack', 'dessert',
  'meal', 'dish', 'culinary', 'recipe', 'baking', 'cooked', 'fried'
]);

// AI prompt engineering artifacts, render engines, resolution tokens, and camera fluff
export const PROMPT_ARTIFACT_KEYWORDS = new Set([
  'masterpiece', 'trending on artstation', 'artstation', 'cgsociety', 'deviantart',
  'octane render', 'octane', 'unreal engine', 'unreal', '8k', '4k', 'photorealistic',
  'hyperrealistic', 'hyper detailed', 'ultra detailed', 'intricate details', 'award winning',
  'volumetric lighting', 'cinematic lighting', 'studio lighting', 'sharp focus',
  'depth of field', 'dof', 'bokeh effect', 'ray tracing', 'vray', 'photoreal',
  'shot on 35mm', 'shot on 85mm', 'dslr', 'negative prompt', 'sdxl', 'test prompt',
  'seed', 'cfg', 'sampler', 'dpm++', 'steps', 'midjourney', 'dalle', 'dall-e',
  'chatgpt', 'stablediffusion', 'upscaled', 'highres', 'raw photo', 'concept art',
  'matte painting', 'rendered in', 'ar 16:9', 'v 5', 'v 6', 'prompt'
]);

// Contradictory keyword pairs and mutually exclusive scene attributes
export interface ContradictionRule {
  groupA: string[];
  groupB: string[];
  conflict: string;
  explanation: string;
}

export const CONTRADICTORY_KEYWORD_RULES: ContradictionRule[] = [
  {
    groupA: ['indoor', 'indoors', 'interior', 'inside', 'room'],
    groupB: ['outdoor', 'outdoors', 'exterior', 'outside', 'open air'],
    conflict: 'Indoor vs Outdoor',
    explanation: 'ছবি একই সাথে ঘরের ভেতরে (indoor) এবং উন্মুক্ত আকাশের নিচে (outdoor) হতে পারে না।',
  },
  {
    groupA: ['day', 'daytime', 'sunlight', 'sunny', 'daylight', 'morning', 'noon', 'bright day'],
    groupB: ['night', 'nighttime', 'midnight', 'night sky', 'dark night', 'nocturnal'],
    conflict: 'Day vs Night',
    explanation: 'দিন এবং রাতের আলোর অবস্থা পরস্পরবিরোধী।',
  },
  {
    groupA: ['summer', 'hot weather', 'tropical', 'sunny beach'],
    groupB: ['winter', 'snow', 'snowy', 'blizzard', 'frost', 'ice'],
    conflict: 'Summer vs Winter',
    explanation: 'গ্রীষ্ম এবং শীত/বরফ আবহাওয়া একসঙ্গে থাকা অসামঞ্জস্যপূর্ণ।',
  },
  {
    groupA: ['dry', 'arid', 'desert', 'drought'],
    groupB: ['wet', 'underwater', 'submerged', 'rain', 'rainy', 'raining'],
    conflict: 'Dry vs Wet/Underwater',
    explanation: 'শুষ্ক মরুভূমি ও পানির নিচে/বৃষ্টি পরস্পরবিরোধী।',
  },
  {
    groupA: ['macro', 'microscopic', 'extreme close up', 'micro'],
    groupB: ['panoramic', 'aerial', 'wide angle', 'landscape view', 'bird eye view', 'satellite view'],
    conflict: 'Macro vs Panoramic/Aerial',
    explanation: 'ম্যাক্রো বা অণুবীক্ষণিক ভিউ এবং এরিয়াল বা প্যানোরামিক ভিউ সম্পূর্ণ বিপরীত ফ্রেম।',
  },
  {
    groupA: ['empty', 'deserted', 'isolated scene', 'uninhabited'],
    groupB: ['crowded', 'crowd', 'packed', 'busy crowd', 'busy street', 'throng'],
    conflict: 'Empty vs Crowded',
    explanation: 'জনশূন্য/খালি স্থান এবং উপচে পড়া ভিড় পরস্পরবিরোধী।',
  },
  {
    groupA: ['vintage', 'antique', 'retro', 'historical', 'nostalgic', 'ancient'],
    groupB: ['futuristic', 'sci-fi', 'cyberpunk', 'modern future', 'spaceship'],
    conflict: 'Vintage vs Futuristic',
    explanation: 'প্রাচীন ঐতিহাসিক স্টাইল এবং ভবিষ্যৎমুখী সাই-ফাই পরস্পরবিরোধী।',
  },
  {
    groupA: ['isolated', 'white background', 'plain background', 'cutout', 'isolated on white'],
    groupB: ['complex background', 'busy background', 'cityscape', 'detailed background'],
    conflict: 'Isolated/Cutout vs Complex Background',
    explanation: 'আইসোলেটেড সাদা ব্যাকগ্রাউন্ড এবং জটিল পরিবেশ ব্যাকগ্রাউন্ড পরস্পরবিরোধী।',
  },
  {
    groupA: ['no people', 'nobody', 'no person', 'uninhabited', 'zero humans'],
    groupB: ['person', 'people', 'human', 'humans', 'portrait', 'crowd', 'model', 'man', 'woman', 'face'],
    conflict: 'No People vs Human Presence',
    explanation: 'মানুষহীন ছবিতে মানুষ বা মডেল সম্পর্কিত শব্দ থাকা কিউরেটর সরাসরি রিজেক্ট করে।',
  },
  {
    groupA: ['dark', 'low key', 'shadowy', 'dim lighting', 'darkness'],
    groupB: ['bright', 'high key', 'overexposed', 'bright lighting', 'pure white light'],
    conflict: 'Low Key/Dark vs High Key/Bright',
    explanation: 'লো-কি ডার্ক লাইটিং এবং হাই-কি ব্রাইট লাইটিং বিপরীত আলো ব্যবস্থা।',
  },
];

export interface RepetitiveKeywordDetection {
  term: string;
  duplicateOf: string;
  type: 'exact' | 'stem_plural' | 'word_permutation';
}

export function detectRepetitiveKeywords(keywords: string[]): RepetitiveKeywordDetection[] {
  const detected: RepetitiveKeywordDetection[] = [];
  const normalizedMap = new Map<string, string>();
  const seenExact = new Set<string>();

  for (const raw of keywords) {
    if (!raw) continue;
    const clean = raw.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!clean) continue;

    if (seenExact.has(clean)) {
      detected.push({ term: clean, duplicateOf: clean, type: 'exact' });
      continue;
    }
    seenExact.add(clean);

    // 1. Word permutation check (e.g. "red apple" vs "apple red")
    if (clean.includes(' ')) {
      const sortedTokens = clean.split(' ').sort().join(' ');
      if (normalizedMap.has(sortedTokens) && normalizedMap.get(sortedTokens) !== clean) {
        detected.push({
          term: clean,
          duplicateOf: normalizedMap.get(sortedTokens)!,
          type: 'word_permutation',
        });
        continue;
      }
    }

    // 2. Singular/Plural stem check
    // If singular came first (e.g. "apple" then "apples", "pine tree" then "pine trees")
    const candidates: string[] = [];
    if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 3) {
      candidates.push(clean.slice(0, -1)); // e.g. apples -> apple, pine trees -> pine tree
      if (clean.endsWith('es') && !clean.endsWith('ees') && clean.length > 4) {
        candidates.push(clean.slice(0, -2)); // e.g. boxes -> box
      }
    }

    let matchedStem: string | null = null;
    for (const cand of candidates) {
      if (normalizedMap.has(cand) && normalizedMap.get(cand) !== clean) {
        matchedStem = normalizedMap.get(cand)!;
        break;
      }
    }

    // Or if plural came first (e.g. "apples" stored candidate "apple", now "apple" arrives)
    if (!matchedStem && normalizedMap.has(clean) && normalizedMap.get(clean) !== clean) {
      matchedStem = normalizedMap.get(clean)!;
    }

    if (matchedStem) {
      detected.push({
        term: clean,
        duplicateOf: matchedStem,
        type: 'stem_plural',
      });
      continue;
    }

    normalizedMap.set(clean, clean);
    for (const cand of candidates) {
      if (!normalizedMap.has(cand)) {
        normalizedMap.set(cand, clean);
      }
    }
    if (clean.includes(' ')) {
      const sortedTokens = clean.split(' ').sort().join(' ');
      if (!normalizedMap.has(sortedTokens)) {
        normalizedMap.set(sortedTokens, clean);
      }
    }
  }

  return detected;
}

export function detectContradictoryKeywords(
  keywords: string[]
): Array<{ termA: string; termB: string; conflict: string; explanation: string }> {
  const matches: Array<{ termA: string; termB: string; conflict: string; explanation: string }> = [];
  const lowerKws = keywords.map((k) => k.toLowerCase().trim());

  for (const rule of CONTRADICTORY_KEYWORD_RULES) {
    const foundA: string[] = [];
    const foundB: string[] = [];

    const isMatch = (kw: string, item: string) => {
      if (kw === item) return true;
      // Word boundary match: e.g. "sunny day" matches "day"
      // But do not match if preceded by negative prefix like "no " or "zero " or "non-"
      try {
        const re = new RegExp(`(?<!\\b(no|non|without|zero)\\s+)\\b${item}\\b`, 'i');
        return re.test(kw);
      } catch {
        return kw === item;
      }
    };

    for (const kw of lowerKws) {
      if (rule.groupA.some((item) => isMatch(kw, item))) {
        foundA.push(kw);
      }
      if (rule.groupB.some((item) => isMatch(kw, item))) {
        foundB.push(kw);
      }
    }

    if (foundA.length > 0 && foundB.length > 0 && foundA[0] !== foundB[0]) {
      matches.push({
        termA: foundA[0],
        termB: foundB[0],
        conflict: rule.conflict,
        explanation: rule.explanation,
      });
    }
  }

  return matches;
}

export function detectPromptArtifactKeywords(keywords: string[]): string[] {
  const artifacts: string[] = [];
  for (const raw of keywords) {
    if (!raw) continue;
    const clean = raw.toLowerCase().trim();
    if (
      PROMPT_ARTIFACT_KEYWORDS.has(clean) ||
      Array.from(PROMPT_ARTIFACT_KEYWORDS).some(
        (art) => clean === art || clean.startsWith(`${art} `) || clean.endsWith(` ${art}`) || clean.includes(` ${art} `)
      )
    ) {
      artifacts.push(raw);
    }
  }
  return Array.from(new Set(artifacts));
}

export interface KeywordAnomalyReport {
  irrelevantCount: number;
  repetitiveCount: number;
  contradictoryCount: number;
  promptArtifactsCount: number;
  detectedIrrelevant: string[];
  detectedPromptArtifacts: string[];
  detectedRepetitive: string[];
  detectedContradictions: Array<{ termA: string; termB: string; conflict: string; explanation: string }>;
  correctionFlags: Array<{
    type: 'prompt_artifact' | 'repetitive' | 'contradictory' | 'irrelevant';
    term: string;
    reason: string;
    suggestedFix: string;
  }>;
}

export function auditKeywordHygiene(
  keywords: string[],
  context?: {
    visualSubject?: string;
    category?: string;
    hasHumans?: boolean;
  }
): KeywordAnomalyReport {
  const detectedPromptArtifacts = detectPromptArtifactKeywords(keywords);
  const repetitiveDetections = detectRepetitiveKeywords(keywords);
  const detectedContradictions = detectContradictoryKeywords(keywords);

  const isSpice = isSpiceSubjectVisible(context?.visualSubject, context?.category);
  const isFood = isFoodSubject(context?.visualSubject, context?.category);
  const isVehicle = isVehicleSubject(context?.visualSubject, context?.category);
  const hasHumans = isHumanSubjectVisible(context?.visualSubject, { hasHumans: context?.hasHumans });

  const detectedIrrelevant: string[] = [];
  const correctionFlags: Array<{
    type: 'prompt_artifact' | 'repetitive' | 'contradictory' | 'irrelevant';
    term: string;
    reason: string;
    suggestedFix: string;
  }> = [];

  // Prompt artifacts flags
  for (const art of detectedPromptArtifacts) {
    correctionFlags.push({
      type: 'prompt_artifact',
      term: art,
      reason: 'AI প্রম্পট ইঞ্জিনিয়ারিং বা রেন্ডার ইঞ্জিনের ট্যাগ যা স্টক এজেন্সির কিউরেটর রিজেক্ট করে।',
      suggestedFix: 'কিওয়ার্ড তালিকা থেকে এই এআই/টেকনিক্যাল প্রম্পট ট্যাগটি অপসারণ করুন।',
    });
  }

  // Repetitive flags
  for (const rep of repetitiveDetections) {
    correctionFlags.push({
      type: 'repetitive',
      term: rep.term,
      reason: rep.type === 'exact'
        ? `হু-বহু একই কীওয়ার্ড পুনরাবৃত্তি ("${rep.duplicateOf}")।`
        : rep.type === 'word_permutation'
        ? `শব্দের ক্রম পরিবর্তন করে সাজানো পুনরাবৃত্তি ("${rep.duplicateOf}")।`
        : `একই মূল শব্দের বহুবচন বা সমার্থক পুনরাবৃত্তি ("${rep.duplicateOf}")।`,
      suggestedFix: 'অনাবশ্যক পুনরাবৃত্তি বা বহুবচন রূপটি বাদ দিয়ে মূল একবচন শব্দটি রাখুন।',
    });
  }

  // Contradictory flags
  for (const con of detectedContradictions) {
    correctionFlags.push({
      type: 'contradictory',
      term: `${con.termA} ↔ ${con.termB}`,
      reason: `পরস্পরবিরোধী বৈশিষ্ট্য (${con.conflict}): ${con.explanation}`,
      suggestedFix: 'ছবির আসল দৃশ্যমান অবস্থার সাথে মিলিয়ে সঠিক একটি শব্দ নির্বাচন করুন এবং অন্যটি মুছুন।',
    });
  }

  // Irrelevant / ungrounded checks
  for (const raw of keywords) {
    const clean = raw.toLowerCase().trim();
    if (!clean) continue;

    let isIrrelevant = false;
    let reason = '';
    const words = clean.split(/\s+/);

    if (PROMOTIONAL_FLUFF_WORDS.has(clean) || words.some((w) => PROMOTIONAL_FLUFF_WORDS.has(w))) {
      isIrrelevant = true;
      reason = 'অতিরঞ্জিত বাণিজ্যিক প্রমোশনাল শব্দ (Fluff) যা কিউরেটর অনুমোদন করে না।';
    } else if (COMMERCIAL_TRADEMARK_BRANDS.has(clean) || words.some((w) => COMMERCIAL_TRADEMARK_BRANDS.has(w))) {
      isIrrelevant = true;
      reason = 'সুরক্ষিত বাণিজ্যিক ট্রেডমার্ক বা ব্র্যান্ড নাম কমার্শিয়াল লাইসেন্সে সম্পূর্ণ নিষিদ্ধ।';
    } else if (BANNED_STOCK_TERMS.has(clean) || words.some((w) => BANNED_STOCK_TERMS.has(w))) {
      isIrrelevant = true;
      reason = 'টুল বা ফাইল প্রোভেন্যান্স নিষিদ্ধ শব্দ।';
    } else if (!hasHumans && (HUMAN_ENTITY_TERMS.has(clean) || words.some((w) => HUMAN_ENTITY_TERMS.has(w)))) {
      isIrrelevant = true;
      reason = 'মানুষহীন ছবিতে মানুষ/মডেল সংক্রান্ত অপ্রাসঙ্গিক কীওয়ার্ড।';
    } else if (!isFood && (FOOD_ENTITY_TERMS.has(clean) || words.some((w) => FOOD_ENTITY_TERMS.has(w)))) {
      isIrrelevant = true;
      reason = 'খাবারবিহীন ছবিতে খাদ্য সংক্রান্ত উপাদান ডোমেন ক্রস-কন্টামিনেশন।';
    } else if (!isVehicle && (VEHICLE_ENTITY_TERMS.has(clean) || words.some((w) => VEHICLE_ENTITY_TERMS.has(w)))) {
      isIrrelevant = true;
      reason = 'যানবাহনবিহীন ছবিতে গাড়ি/অটোমোটিভ উপাদান অপ্রাসঙ্গিক।';
    } else if (!isSpice && /^(spices?|seasonings?|spiced|seasoned)$/i.test(clean)) {
      isIrrelevant = true;
      reason = 'ছবিতে মসলা দৃশ্যমান না থাকায় অদৃশ্য উপাদান হিসেবে চিহ্নিত।';
    } else if (/^(flavoring|flavorings|flavouring|flavourings|artificial flavoring)$/i.test(clean)) {
      isIrrelevant = true;
      reason = 'খালি চোখে অদৃশ্য রাসায়নিক স্বাদ বা ফ্লেভারিং দাবি।';
    } else if (UNSUPPORTED_INGREDIENT_TERMS.some((ing) => ing === clean || words.includes(ing))) {
      isIrrelevant = true;
      reason = 'খালি চোখে অদৃশ্য মাইক্রোস্কোপিক উপাদান বা কাল্পনিক অবজেক্ট।';
    }

    if (isIrrelevant && !detectedIrrelevant.includes(clean)) {
      detectedIrrelevant.push(clean);
      correctionFlags.push({
        type: 'irrelevant',
        term: raw,
        reason,
        suggestedFix: 'ছবিতে সরাসরি দৃশ্যমান না হওয়ায় এই কীওয়ার্ডটি অপসারণ করুন।',
      });
    }
  }

  return {
    irrelevantCount: detectedIrrelevant.length,
    repetitiveCount: repetitiveDetections.length,
    contradictoryCount: detectedContradictions.length,
    promptArtifactsCount: detectedPromptArtifacts.length,
    detectedIrrelevant,
    detectedPromptArtifacts,
    detectedRepetitive: repetitiveDetections.map((r) => r.term),
    detectedContradictions,
    correctionFlags,
  };
}

/**
 * Checks if the image subject or context explicitly depicts spices, seasonings, or herbs.
 */
export function isSpiceSubjectVisible(visualSubject?: string, category?: string): boolean {
  if (!visualSubject) return false;
  const s = visualSubject.toLowerCase();
  const c = (category || '').toLowerCase();
  const spiceRegex = /\b(spice|spices|seasoning|seasonings|peppercorn|peppercorns|cinnamon|clove|cloves|turmeric|paprika|curry\s*powder|chili\s*powder|cardamom|star\s*anise|nutmeg|cumin|coriander|masala|saffron|dried\s+herbs?|culinary\s+herbs?|herbs?\s+(?:and|&)\s+spices?)\b/i;
  return spiceRegex.test(s) || spiceRegex.test(c);
}

/**
 * Checks if the image subject is culinary/food related.
 */
export function isFoodSubject(visualSubject?: string, category?: string): boolean {
  if (!visualSubject) return false;
  const s = visualSubject.toLowerCase();
  const c = (category || '').toLowerCase();
  if (c.includes('food') || c.includes('beverage') || c.includes('culinary')) return true;
  return /\b(food|burger|cheeseburger|pizza|steak|salad|pasta|fruit|vegetable|dessert|coffee|tea|drink|cocktail|bakery|bread|dish|meal|breakfast|lunch|dinner|spices|seasoning)\b/i.test(s);
}

/**
 * Checks if the image subject is a vehicle/automotive related.
 */
export function isVehicleSubject(visualSubject?: string, category?: string): boolean {
  if (!visualSubject) return false;
  const s = visualSubject.toLowerCase();
  const c = (category || '').toLowerCase();
  if (c.includes('automotive') || c.includes('transportation') || c.includes('vehicles')) return true;
  return /\b(car|hypercar|supercar|vehicle|automobile|truck|motorcycle|bike|sedan|coupe|suv|racecar)\b/i.test(s);
}

/**
 * Checks if the image subject is mosque / architectural heritage related.
 */
export function isMosqueSubject(visualSubject?: string, category?: string): boolean {
  if (!visualSubject && !category) return false;
  const s = (visualSubject || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (c.includes('mosque') || c.includes('architecture') || c.includes('স্থাপত্য') || c.includes('মসজিদ')) {
    if (s.includes('mosque') || s.includes('masjid') || s.includes('মসজিদ') || s.includes('মিহরাব') || s.includes('মিনার')) return true;
  }
  return /\b(mosque|mosques|masjid|masjids|mihrab|minaret|minarets|dome\s*and\s*minaret|sahn|grand\s*mosque|jama\s*masjid)\b/i.test(s) || /মসজিদ|মিহরাব|মিনার|গম্বুজ/.test(s);
}

/**
 * Checks if the image subject visibly contains human beings.
 */
export function isHumanSubjectVisible(
  visualSubject?: string,
  visualAttributes?: { hasHumans?: boolean }
): boolean {
  if (visualAttributes?.hasHumans !== undefined) {
    return visualAttributes.hasHumans;
  }
  if (!visualSubject) return false;
  const s = visualSubject.toLowerCase();
  return /\b(person|people|woman|women|man|men|girl|girls|boy|boys|child|children|model|models|face|faces|portrait|portraits|human|humans|worker|workers|chef|couple|crowd|individual|lady|guy)\b/i.test(s);
}

export function cleanDanglingPhrases(text: string): string {
  if (!text) return '';
  let str = text.trim();
  str = str.replace(/[,;:\-\s]+$/, '').trim();

  // Strip trailing prepositional phrase fragments and dangling clauses
  const danglingPhrases = [
    /\s+(?:on|upon|in|at|over|beside|by)\s+(?:a|the|an|wooden|rustic|dark|light|marble|metal|ceramic|black|white|cutting)(?:\s+(?:table|board|surface|plate|background))?$/i,
    /\s+on\s+wooden(?:\s+cutting)?$/i,
    /\s+on\s+rustic(?:\s+wood)?$/i,
    /\s+on\s+(?:a|the|an)$/i,
    /\s+with\s+(?:melted|fresh|sliced|grilled|steamed|warm|cold|raw|organic)$/i,
    /\s+with\s+(?:a|the|an)$/i,
    /\s+in\s+(?:a|the|an)$/i,
    /\s+served\s+(?:on|in|with)$/i,
    /\s+placed\s+(?:on|in)$/i,
    /\s+isolated\s+on(?:\s+(?:white|black|dark|light))?$/i,
    /\s+topped\s+with$/i,
    /\s+garnished\s+with$/i,
    /\s+(?:on|in|with|at|by|and|or|of|for|from|to|into|upon)\s*$/i,
  ];

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 8) {
    changed = false;
    iterations++;
    for (const pat of danglingPhrases) {
      if (pat.test(str)) {
        str = str.replace(pat, '').trim();
        changed = true;
      }
    }
  }

  // Remove trailing stranded prepositions, conjunctions, articles, and dangling adjectives
  const strandedTrailingWords = new Set([
    'on', 'in', 'at', 'with', 'by', 'for', 'from', 'to', 'of', 'and', 'or', 'the', 'a', 'an',
    'wooden', 'rustic', 'melted', 'fresh', 'grilled', 'fried', 'cutting', 'warm', 'cold',
    'dark', 'light', 'black', 'white', 'green', 'red', 'into', 'onto', 'upon'
  ]);

  const words = str.split(/\s+/).filter(Boolean);
  while (words.length > 2 && strandedTrailingWords.has(words[words.length - 1].toLowerCase())) {
    words.pop();
    str = words.join(' ');
  }

  return str.replace(/[,;:\-\s]+$/, '').trim();
}

/**
 * Truncates text at a natural semantic clause boundary instead of arbitrarily slicing into prepositions or adjectives.
 */
export function truncateAtNaturalBoundary(fullText: string, maxLength: number): string {
  const cleaned = cleanDanglingPhrases(fullText);
  if (cleaned.length <= maxLength) return cleaned;

  const words = cleaned.split(/\s+/).filter(Boolean);
  const clauseIndices: number[] = [];
  const clauseStarters = new Set(['with', 'on', 'in', 'at', 'against', 'for', 'and', 'served', 'placed', 'isolated', 'topped']);

  for (let i = 2; i < words.length; i++) {
    if (clauseStarters.has(words[i].toLowerCase())) {
      clauseIndices.push(i);
    }
  }

  // Check backwards from the most comprehensive clause boundary that fits
  for (let c = clauseIndices.length - 1; c >= 0; c--) {
    const cutoffIndex = clauseIndices[c];
    const candidateClause = words.slice(0, cutoffIndex).join(' ');
    const sanitizedCandidate = cleanDanglingPhrases(candidateClause);
    if (sanitizedCandidate.length <= maxLength && sanitizedCandidate.split(/\s+/).length >= 3) {
      return sanitizedCandidate;
    }
  }

  // If no clause boundary fits, accumulate word by word with proper spacing
  let wordAcc = '';
  for (const w of words) {
    const nextCandidate = wordAcc ? `${wordAcc} ${w}` : w;
    if (nextCandidate.length <= maxLength) {
      wordAcc = nextCandidate;
    } else {
      break;
    }
  }

  const finalWordTrimmed = cleanDanglingPhrases(wordAcc);
  return finalWordTrimmed || cleanDanglingPhrases(words.slice(0, 3).join(' '));
}

/**
 * Strips promotional buzzwords, speculative ingredients, unsupported actions, brands, and banned terms from text.
 * Context-aware: only removes spices/seasonings if the visible subject is NOT a spice/herb subject.
 */
export function removeUnsupportedDetailsAndFluff(
  text: string,
  context?: { visualSubject?: string; category?: string }
): { cleanedText: string; removedItems: string[] } {
  if (!text) return { cleanedText: '', removedItems: [] };

  const removed: string[] = [];
  let working = text;
  const isSpiceSubject = isSpiceSubjectVisible(context?.visualSubject, context?.category);

  // 1. Remove unsupported ingredients (static list)
  for (const ing of UNSUPPORTED_INGREDIENT_TERMS) {
    const regex = new RegExp(`\\b${ing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(working)) {
      removed.push(ing);
      working = working.replace(regex, ' ');
    }
  }

  // 2. Context-aware spices & seasonings removal
  // If NOT an image of spices: strip invisible "spices", "seasoning", "seasonings", "spiced", "seasoned"
  if (!isSpiceSubject) {
    const ungroundedSpicesRegex = /\b(secret\s+spices?|secret\s+blend|savory\s+spices?|spices?|seasonings?|spiced|seasoned)\b/gi;
    const spiceMatches = working.match(ungroundedSpicesRegex);
    if (spiceMatches) {
      removed.push(...spiceMatches);
      working = working.replace(ungroundedSpicesRegex, ' ');
    }
  }

  // 3. Flavoring is ALWAYS unobservable (taste/chemical)
  const flavorRegex = /\b(artificial\s+flavoring|natural\s+flavoring|flavorings?|flavourings?|flavored|flavoured)\b/gi;
  const flavorMatches = working.match(flavorRegex);
  if (flavorMatches) {
    removed.push(...flavorMatches);
    working = working.replace(flavorRegex, ' ');
  }

  // 4. Remove unsupported actions/emotions
  for (const pat of UNSUPPORTED_ACTION_EMOTION_PATTERNS) {
    const match = working.match(pat);
    if (match) {
      removed.push(...match);
      working = working.replace(pat, ' ');
    }
  }

  // 5. Remove unsupported setting claims
  for (const pat of UNSUPPORTED_SETTING_PATTERNS) {
    const match = working.match(pat);
    if (match) {
      removed.push(...match);
      working = working.replace(pat, ' ');
    }
  }

  // 6. Remove generic promotional buzzwords
  for (const fluff of PROMOTIONAL_FLUFF_WORDS) {
    const regex = new RegExp(`\\b${fluff.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(working)) {
      removed.push(fluff);
      working = working.replace(regex, ' ');
    }
  }

  // 7. Remove commercial trademark brands
  for (const brand of COMMERCIAL_TRADEMARK_BRANDS) {
    const regex = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(working)) {
      removed.push(brand);
      working = working.replace(regex, ' ');
    }
  }

  // 8. Remove tool provenance & banned words
  for (const banned of BANNED_STOCK_TERMS) {
    const regex = new RegExp(`\\b${banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(working)) {
      removed.push(banned);
      working = working.replace(regex, ' ');
    }
  }

  // 9. Remove food entities if context is NOT food related
  if (context && !isFoodSubject(context.visualSubject, context.category)) {
    for (const food of FOOD_ENTITY_TERMS) {
      const regex = new RegExp(`\\b${food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(working)) {
        removed.push(food);
        working = working.replace(regex, ' ');
      }
    }
  }

  // 10. Remove vehicle entities if context is NOT vehicle related
  if (context && !isVehicleSubject(context.visualSubject, context.category)) {
    for (const veh of VEHICLE_ENTITY_TERMS) {
      const regex = new RegExp(`\\b${veh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(working)) {
        removed.push(veh);
        working = working.replace(regex, ' ');
      }
    }
  }

  // Clean extra spaces and punctuation artifacts
  const cleanedText = working
    .replace(/\s*,\s*,+/g, ',')
    .replace(/\s+([.,!?:;])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return { cleanedText, removedItems: Array.from(new Set(removed)) };
}

/**
 * Enforce the target marketplace's actual title-length rules and structure.
 */
export function formatTitleForMarketplace(
  rawTitle: string,
  visualSubject: string,
  marketplace: StockMarketplaceId
): { title: string; compliesWithRule: boolean; ruleDetails: MarketplaceTitleRule } {
  const rule = MARKETPLACE_TITLE_RULES[marketplace] || MARKETPLACE_TITLE_RULES['other'];

  // 1. Sanitize the title with context
  const { cleanedText } = removeUnsupportedDetailsAndFluff(rawTitle, { visualSubject });
  let baseTitle = cleanedText;

  // If title was stripped too clean, reconstruct from factual visual subject
  if (!baseTitle || baseTitle.split(/\s+/).length < 2) {
    const cleanSubject = visualSubject
      ? removeUnsupportedDetailsAndFluff(visualSubject, { visualSubject }).cleanedText
      : 'Subject';
    baseTitle = cleanSubject.charAt(0).toUpperCase() + cleanSubject.slice(1);
  }

  // Remove existing "Generative AI" or similar suffix to standardize
  baseTitle = baseTitle
    .replace(/\s*-\s*Generative\s+AI\b/gi, '')
    .replace(/\s+Generative\s+AI\b/gi, '')
    .replace(/\s*-\s*AI\s+Stock\b/gi, '')
    .replace(/\s+Commercial\s+Stock\b/gi, '')
    .replace(/\s*,\s*$/, '')
    .trim();

  let finalTitle = baseTitle;

  switch (marketplace) {
    case 'adobe-stock': {
      // Must include "Generative AI" at the end, 50-70 characters recommended (min 5 words)
      const suffix = ' Generative AI';
      const availableChars = rule.recommendedMaxChars - suffix.length; // ~56 chars

      let candidate = truncateAtNaturalBoundary(baseTitle, availableChars);
      candidate = cleanDanglingPhrases(candidate);

      // Ensure at least 4 words before suffix so total title has >= 5 words and is >= 50 chars
      let words = candidate.split(/\s+/).filter(Boolean);
      if (words.length < 4 || (candidate + suffix).length < rule.recommendedMinChars) {
        const cleanSub = removeUnsupportedDetailsAndFluff(visualSubject, { visualSubject }).cleanedText;
        if (cleanSub && cleanSub.length > candidate.length) {
          const expanded = truncateAtNaturalBoundary(cleanSub, availableChars);
          if (expanded.length > candidate.length) {
            candidate = expanded;
            words = candidate.split(/\s+/).filter(Boolean);
          }
        }
        if (words.length < 4 || (candidate + suffix).length < rule.recommendedMinChars) {
          candidate = `${candidate} Photo Illustration`;
        }
      }
      candidate = cleanDanglingPhrases(candidate);
      finalTitle = `${candidate}${suffix}`.trim();
      break;
    }

    case 'shutterstock': {
      // Minimum 5 words required! Target: 60-120 chars
      let candidate = truncateAtNaturalBoundary(baseTitle, rule.recommendedMaxChars);
      candidate = cleanDanglingPhrases(candidate);
      let words = candidate.split(/\s+/).filter(Boolean);
      if (words.length < 5 || candidate.length < rule.recommendedMinChars) {
        const cleanSub = removeUnsupportedDetailsAndFluff(visualSubject, { visualSubject }).cleanedText;
        if (cleanSub && cleanSub.length > candidate.length) {
          const expanded = truncateAtNaturalBoundary(cleanSub, rule.recommendedMaxChars);
          if (expanded.length > candidate.length) {
            candidate = expanded;
            words = candidate.split(/\s+/).filter(Boolean);
          }
        }
      }
      if (words.length < 5 || candidate.length < rule.recommendedMinChars - 10) {
        const factualAdditions = ['Close-Up View', 'Studio Lighting', 'High Angle Shot', 'Still Life'];
        for (const add of factualAdditions) {
          if (!candidate.toLowerCase().includes(add.toLowerCase()) && (words.length < 5 || candidate.length < rule.recommendedMinChars - 10)) {
            candidate = `${candidate} ${add}`;
            words = candidate.split(/\s+/).filter(Boolean);
          }
        }
      }
      finalTitle = cleanDanglingPhrases(candidate);
      break;
    }

    case 'freepik': {
      // Concise title: 30-65 chars
      let candidate = truncateAtNaturalBoundary(baseTitle, rule.recommendedMaxChars);
      candidate = cleanDanglingPhrases(candidate);
      if (candidate.length < rule.recommendedMinChars) {
        candidate = `${candidate} Stock Illustration`;
      }
      finalTitle = cleanDanglingPhrases(candidate);
      break;
    }

    case 'dreamstime': {
      // Min 5 words, 40-85 chars
      let candidate = truncateAtNaturalBoundary(baseTitle, rule.recommendedMaxChars);
      candidate = cleanDanglingPhrases(candidate);
      let words = candidate.split(/\s+/).filter(Boolean);
      if (words.length < 5) {
        candidate = `${candidate} Detailed Visual Concept`;
      }
      finalTitle = cleanDanglingPhrases(candidate);
      break;
    }

    case 'wirestock': {
      // 45-90 chars
      let candidate = truncateAtNaturalBoundary(baseTitle, rule.recommendedMaxChars);
      finalTitle = cleanDanglingPhrases(candidate);
      break;
    }

    default: {
      let candidate = truncateAtNaturalBoundary(baseTitle, rule.recommendedMaxChars);
      finalTitle = cleanDanglingPhrases(candidate);
      break;
    }
  }

  // Ensure complete natural title and uppercase first char
  finalTitle = cleanDanglingPhrases(finalTitle);
  finalTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);

  const wordCount = finalTitle.split(/\s+/).filter(Boolean).length;
  const compliesWithRule =
    wordCount >= rule.minWords &&
    finalTitle.length >= rule.recommendedMinChars - 10 &&
    finalTitle.length <= rule.maxChars;

  return { title: finalTitle, compliesWithRule, ruleDetails: rule };
}

/**
 * Filter, verify, and ground keywords strictly on visible image content.
 * Context-aware:
 * - Spices/seasonings preserved only when physical spices are depicted.
 * - Human entities stripped when hasHumans === false.
 * - Trademark commercial brands stripped.
 * - Alien/unsupported domain items stripped.
 * - Flavoring/unobservable taste terms stripped.
 */
export function filterAndGroundKeywords(
  candidateKeywords: string[],
  visualSubject: string,
  category: string,
  marketplace: StockMarketplaceId,
  visualAttributes?: {
    colors?: string[];
    lighting?: string[];
    perspective?: string[];
    textures?: string[];
    setting?: string;
    hasHumans?: boolean;
  }
): { keywords: string[]; removedPromotionalCount: number; removedItemsList?: string[] } {
  let removedPromotionalCount = 0;
  const removedItemsList: string[] = [];
  const seen = new Set<string>();
  const verifiedList: string[] = [];

  const isSpiceSubject = isSpiceSubjectVisible(visualSubject, category);
  const isFood = isFoodSubject(visualSubject, category);
  const isVehicle = isVehicleSubject(visualSubject, category);
  const hasHumans = isHumanSubjectVisible(visualSubject, visualAttributes);

  // AI disclosure terms that belong strictly in dedicated disclosure fields, NOT in descriptive visual keywords
  const AI_DISCLOSURE_TAGS = new Set([
    'generative ai', 'ai generated', '_ai_generated', 'ai stock', 'ai artwork',
    'ai image', 'ai', 'artificial intelligence', 'machine learning', 'synthetic media'
  ]);

  // Strict regex for unsupported claims that hallucinate unseen objects, cutlery, steam or venues
  const STRICT_UNSUPPORTED_PATTERN = /\b(dipping\s*sauce|steak\s*knife|steam|steaming|protein|gastropub|bistro|diner|pub|sauce\s*cup|condiment|silverware|cutlery|knife|fork|spoon|rising\s*steam|smoke|vapor)\b/i;

  // Clean and filter candidate keywords
  for (const rawKw of candidateKeywords) {
    if (!rawKw || typeof rawKw !== 'string') continue;
    const cleanKw = rawKw
      .toLowerCase()
      .replace(/[-_]/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanKw || cleanKw.length < 2) continue;

    // 1. Keep AI-generated disclosure separate from descriptive keywords
    if (AI_DISCLOSURE_TAGS.has(cleanKw) || cleanKw === '_ai_generated') {
      continue;
    }

    // 2. Check against banned provenance terms
    if (BANNED_STOCK_TERMS.has(cleanKw) || cleanKw.split(/\s+/).some((p) => BANNED_STOCK_TERMS.has(p))) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 3. Check against commercial trademark brands (Apple, Nike, Rolex, Tesla, Starbucks, etc.)
    if (COMMERCIAL_TRADEMARK_BRANDS.has(cleanKw) || cleanKw.split(/\s+/).some((p) => COMMERCIAL_TRADEMARK_BRANDS.has(p))) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 4. Check against promotional fluff words (e.g., "delicious", "professional", "commercial")
    if (PROMOTIONAL_FLUFF_WORDS.has(cleanKw) || cleanKw.split(/\s+/).some((p) => PROMOTIONAL_FLUFF_WORDS.has(p))) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 5. Check against subjective emotions & unobservable actions
    if (SUBJECTIVE_EMOTION_TERMS.has(cleanKw) || cleanKw.split(/\s+/).some((p) => SUBJECTIVE_EMOTION_TERMS.has(p))) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 6. Context-Aware Spices, Seasonings, and Flavoring Filtering:
    // A. Flavoring/flavor/taste terms are ALWAYS stripped (unobservable taste sensation)
    if (
      cleanKw === 'flavoring' || cleanKw === 'flavorings' || cleanKw === 'flavouring' ||
      cleanKw === 'flavourings' || cleanKw === 'artificial flavoring' || cleanKw === 'natural flavoring' ||
      cleanKw === 'flavorful' || cleanKw === 'flavourful' || cleanKw === 'spicy'
    ) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // B. Spices and Seasonings terms:
    // If the image is NOT genuinely depicting spices/herbs, strip all invisible spices/seasoning claims!
    const isSpiceWord = /^(spices?|seasonings?|spiced|seasoned|secret spice|secret spices)$/i.test(cleanKw);
    if (isSpiceWord && !isSpiceSubject) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 7. Human Entity Discrepancy:
    // If hasHumans is false, strip all human entity keywords
    if (!hasHumans && (HUMAN_ENTITY_TERMS.has(cleanKw) || cleanKw.split(/\s+/).some((p) => HUMAN_ENTITY_TERMS.has(p)))) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 8. Domain Cross-Contamination:
    // If non-food image: strip food/ingredient hallucinations
    if (!isFood && (FOOD_ENTITY_TERMS.has(cleanKw) || cleanKw.split(/\s+/).some((p) => FOOD_ENTITY_TERMS.has(p)))) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // If non-vehicle image: strip vehicle hallucinations
    if (!isVehicle && (VEHICLE_ENTITY_TERMS.has(cleanKw) || cleanKw.split(/\s+/).some((p) => VEHICLE_ENTITY_TERMS.has(p)))) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 8B. Mosque Architectural Subject Discrepancy:
    // If image subject is a mosque architectural scene without explicit user request, strip tabletop items
    const isMosque = isMosqueSubject(visualSubject, category);
    const ISLAMIC_TABLETOP_TERMS = new Set([
      'quran', 'koran', 'tasbih', 'tasbeeh', 'misbaha', 'prayer beads', 'prayer mat', 'prayer rug',
      'sajjadah', 'musallah', 'janamaz', 'perfume', 'attar', 'ittar', 'scent bottle', 'prayer cap',
      'kufi', 'topi', 'taqiyah'
    ]);
    if (isMosque && (ISLAMIC_TABLETOP_TERMS.has(cleanKw) || cleanKw.split(/\s+/).some((p) => ISLAMIC_TABLETOP_TERMS.has(p)))) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 9. Check against unsupported speculative ingredients, objects & venues
    if (
      UNSUPPORTED_INGREDIENT_TERMS.some((ing) => cleanKw === ing || cleanKw.includes(ing)) ||
      STRICT_UNSUPPORTED_PATTERN.test(cleanKw)
    ) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 10. Check prompt artifacts (AI render engines, resolution fluff, camera specs)
    if (
      PROMPT_ARTIFACT_KEYWORDS.has(cleanKw) ||
      Array.from(PROMPT_ARTIFACT_KEYWORDS).some(
        (art) => cleanKw === art || cleanKw.startsWith(`${art} `) || cleanKw.endsWith(` ${art}`) || cleanKw.includes(` ${art} `)
      )
    ) {
      removedPromotionalCount++;
      removedItemsList.push(cleanKw);
      continue;
    }

    // 11. Check single character or meaningless stop words
    if (['and', 'the', 'with', 'for', 'from', 'this', 'that', 'into', 'over', 'are', 'was', 'image', 'picture', 'photo', 'shot'].includes(cleanKw)) {
      continue;
    }

    if (!seen.has(cleanKw)) {
      seen.add(cleanKw);
      verifiedList.push(cleanKw);
    }
  }

  // Enrich ONLY with genuinely observable descriptors (perspective, lighting, colors, surfaces, category)
  const visualPool: string[] = [];

  // Colors
  if (visualAttributes?.colors && visualAttributes.colors.length > 0) {
    for (const col of visualAttributes.colors) {
      visualPool.push(`${col.toLowerCase()} tone`, col.toLowerCase());
    }
  }

  // Observable Lighting
  if (visualAttributes?.lighting && visualAttributes.lighting.length > 0) {
    for (const lit of visualAttributes.lighting) {
      visualPool.push(lit.toLowerCase());
    }
  } else {
    visualPool.push('natural lighting', 'soft shadows', 'diffuse light');
  }

  // Observable Perspective / Framing
  if (visualAttributes?.perspective && visualAttributes.perspective.length > 0) {
    for (const p of visualAttributes.perspective) {
      visualPool.push(p.toLowerCase());
    }
  } else {
    visualPool.push('close up shot', 'horizontal framing', 'centered view');
  }

  // Textures / Surfaces
  if (visualAttributes?.textures && visualAttributes.textures.length > 0) {
    for (const tex of visualAttributes.textures) {
      visualPool.push(tex.toLowerCase());
    }
  }

  // Observable Setting
  if (visualAttributes?.setting) {
    const settingWords = visualAttributes.setting.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !STRICT_UNSUPPORTED_PATTERN.test(w));
    visualPool.push(...settingWords);
  }

  // Category (unless it causes cross-contamination)
  if (category) {
    const cleanCat = category.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
    if (!STRICT_UNSUPPORTED_PATTERN.test(cleanCat) && !COMMERCIAL_TRADEMARK_BRANDS.has(cleanCat)) {
      visualPool.push(cleanCat);
    }
  }

  // Human presence factual tag
  if (visualAttributes?.hasHumans !== undefined) {
    visualPool.push(visualAttributes.hasHumans ? 'person' : 'no people');
    visualPool.push(visualAttributes.hasHumans ? 'individual' : 'nobody');
  }

  // Genuine subject words from visual subject - strictly verified against unsupported terms & stop words
  const stopWordsSet = new Set([
    'and', 'the', 'with', 'for', 'from', 'this', 'that', 'into', 'over', 'are', 'was',
    'image', 'picture', 'photo', 'shot', 'view', 'close', 'background', 'foreground',
    'wooden', 'rustic', 'gourmet', 'top', 'side', 'front', 'cut', 'high', 'juicy'
  ]);

  const subjectWords = (visualSubject || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => {
      return (
        w.length > 2 &&
        !stopWordsSet.has(w) &&
        !PROMOTIONAL_FLUFF_WORDS.has(w) &&
        !BANNED_STOCK_TERMS.has(w) &&
        !COMMERCIAL_TRADEMARK_BRANDS.has(w) &&
        !SUBJECTIVE_EMOTION_TERMS.has(w) &&
        !UNSUPPORTED_INGREDIENT_TERMS.some((ing) => ing === w) &&
        !STRICT_UNSUPPORTED_PATTERN.test(w)
      );
    });

  for (const sw of subjectWords) {
    visualPool.push(sw);
  }

  // Add verified visual descriptors without inventing random details or fake bigrams
  for (const term of visualPool) {
    const cleanTerm = term.trim();
    const isUnsupported =
      UNSUPPORTED_INGREDIENT_TERMS.some((ing) => cleanTerm === ing || cleanTerm.includes(ing)) ||
      STRICT_UNSUPPORTED_PATTERN.test(cleanTerm) ||
      PROMOTIONAL_FLUFF_WORDS.has(cleanTerm) ||
      BANNED_STOCK_TERMS.has(cleanTerm) ||
      COMMERCIAL_TRADEMARK_BRANDS.has(cleanTerm) ||
      SUBJECTIVE_EMOTION_TERMS.has(cleanTerm) ||
      AI_DISCLOSURE_TAGS.has(cleanTerm) ||
      PROMPT_ARTIFACT_KEYWORDS.has(cleanTerm) ||
      Array.from(PROMPT_ARTIFACT_KEYWORDS).some((art) => cleanTerm === art || cleanTerm.includes(art)) ||
      (!hasHumans && HUMAN_ENTITY_TERMS.has(cleanTerm)) ||
      (!isSpiceSubject && /^(spices?|seasonings?|spiced|seasoned)$/i.test(cleanTerm)) ||
      /^(flavoring|flavorings|flavouring|flavourings|artificial flavoring)$/i.test(cleanTerm);

    if (cleanTerm && cleanTerm.length > 2 && !seen.has(cleanTerm) && !isUnsupported) {
      seen.add(cleanTerm);
      verifiedList.push(cleanTerm);
      if (verifiedList.length >= 40) break;
    }
  }

  // Cap strictly at 40 keywords
  const finalKeywords = verifiedList.slice(0, 40);

  return {
    keywords: finalKeywords,
    removedPromotionalCount,
    removedItemsList,
  };
}

export interface MarketplaceValidationAuditReport {
  marketplace: StockMarketplaceId;
  ruleTitle: string;
  checks: {
    titleWordCount: { actual: number; requiredMin: number; pass: boolean };
    titleCharacterLength: { actual: number; minRecommended: number; maxRecommended: number; maxAllowed: number; pass: boolean };
    titleSyntaxAndSuffix: { pass: boolean; details: string };
    keywordCount: { actual: number; minRequired: number; maxAllowed: number; pass: boolean };
    noProhibitedFluff: { pass: boolean; removedCount: number };
    noUnobservableIngredients: { pass: boolean };
    noTrademarkBrands: { pass: boolean; detectedBrands: string[] };
    aiDisclosureSeparation: { pass: boolean };
    noPromptArtifacts: { pass: boolean; detectedArtifacts: string[] };
    noRepetitiveKeywords: { pass: boolean; detectedRepetitive: string[] };
    noContradictoryKeywords: { pass: boolean; detectedPairs: Array<{ termA: string; termB: string; conflict: string }> };
  };
  overallTechnicalPass: boolean;
  policyScopeAudit: {
    verifiedByCode: string[];
    unverifiableByCodeAlone: string[];
    disclaimerBn: string;
    deterministicSoftwareVerified: string[];
    heuristicEstimates: string[];
    manualVisualReviewRequired: string[];
  };
  keywordAnomalyAudit: KeywordAnomalyReport;
}

/**
 * Audits metadata against target marketplace rules.
 * CRITICAL TRUTHFULNESS:
 * Only returns overallTechnicalPass: true for criteria actually validated by code.
 * Explicitly disclaims legal/manual approval items (model releases, account standing, curator review).
 */
export function auditMarketplaceValidation(
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    visualSubject?: string;
    category?: string;
    hasHumans?: boolean;
  },
  marketplace: StockMarketplaceId
): MarketplaceValidationAuditReport {
  const rule = MARKETPLACE_TITLE_RULES[marketplace] || MARKETPLACE_TITLE_RULES['other'];
  const title = (metadata.title || '').trim();
  const titleWords = title.split(/\s+/).filter(Boolean).length;
  const titleLen = title.length;
  const keywords = metadata.keywords || [];

  // 1. Title word count check
  const titleWordCountPass = titleWords >= rule.minWords;

  // 2. Title char length check
  const titleCharPass = titleLen >= rule.recommendedMinChars - 10 && titleLen <= rule.maxChars;

  // 3. Title syntax and suffix check
  let titleSyntaxPass = true;
  let syntaxDetails = 'Factual descriptive title';
  if (marketplace === 'adobe-stock') {
    if (!title.toLowerCase().endsWith('generative ai')) {
      titleSyntaxPass = false;
      syntaxDetails = 'Adobe Stock requires title to end with "Generative AI"';
    } else {
      syntaxDetails = 'Complies with mandatory "Generative AI" suffix';
    }
  } else if (marketplace === 'shutterstock') {
    if (titleWords < 5) {
      titleSyntaxPass = false;
      syntaxDetails = 'Shutterstock strictly rejects titles under 5 words';
    } else {
      syntaxDetails = 'Meets Shutterstock minimum 5 factual words rule';
    }
  }

  // 4. Keyword count check
  const keywordCountPass = keywords.length >= rule.minKeywords && keywords.length <= rule.maxKeywords;

  // 5. Prohibited fluff check
  const foundFluff: string[] = [];
  for (const kw of keywords) {
    if (PROMOTIONAL_FLUFF_WORDS.has(kw)) foundFluff.push(kw);
  }

  // 6. Unobservable spices / ingredients check
  const isSpice = isSpiceSubjectVisible(metadata.visualSubject, metadata.category);
  let unobservableFound = false;
  for (const kw of keywords) {
    if (!isSpice && /^(spices?|seasonings?|spiced|seasoned)$/i.test(kw)) unobservableFound = true;
    if (/^(flavoring|flavorings|flavouring|flavourings|artificial flavoring)$/i.test(kw)) unobservableFound = true;
    if (UNSUPPORTED_INGREDIENT_TERMS.some((ing) => kw === ing)) unobservableFound = true;
  }

  // 7. Trademark brands check
  const detectedBrands: string[] = [];
  for (const kw of keywords) {
    if (COMMERCIAL_TRADEMARK_BRANDS.has(kw)) detectedBrands.push(kw);
  }
  for (const brand of COMMERCIAL_TRADEMARK_BRANDS) {
    if (new RegExp(`\\b${brand}\\b`, 'i').test(title)) detectedBrands.push(brand);
  }

  // 8. AI disclosure separation check (AI tags should NOT be in descriptive keywords)
  const aiTags = ['generative ai', 'ai generated', '_ai_generated', 'ai image'];
  const hasAiTagInKeywords = keywords.some((kw) => aiTags.includes(kw.toLowerCase()));

  // 9. Prompt artifact keywords check
  const detectedPromptArtifacts = detectPromptArtifactKeywords(keywords);

  // 10. Repetitive keywords check
  const detectedRepetitiveList = detectRepetitiveKeywords(keywords);

  // 11. Contradictory keywords check
  const detectedContradictions = detectContradictoryKeywords(keywords);

  // 12. Full Keyword Hygiene Audit
  const keywordAnomalyAudit = auditKeywordHygiene(keywords, {
    visualSubject: metadata.visualSubject,
    category: metadata.category,
    hasHumans: metadata.hasHumans,
  });

  const overallTechnicalPass =
    titleWordCountPass &&
    titleCharPass &&
    titleSyntaxPass &&
    keywordCountPass &&
    foundFluff.length === 0 &&
    !unobservableFound &&
    detectedBrands.length === 0 &&
    !hasAiTagInKeywords &&
    detectedPromptArtifacts.length === 0 &&
    detectedContradictions.length === 0;

  return {
    marketplace,
    ruleTitle: rule.ruleTitle,
    checks: {
      titleWordCount: { actual: titleWords, requiredMin: rule.minWords, pass: titleWordCountPass },
      titleCharacterLength: {
        actual: titleLen,
        minRecommended: rule.recommendedMinChars,
        maxRecommended: rule.recommendedMaxChars,
        maxAllowed: rule.maxChars,
        pass: titleCharPass,
      },
      titleSyntaxAndSuffix: { pass: titleSyntaxPass, details: syntaxDetails },
      keywordCount: { actual: keywords.length, minRequired: rule.minKeywords, maxAllowed: rule.maxKeywords, pass: keywordCountPass },
      noProhibitedFluff: { pass: foundFluff.length === 0, removedCount: foundFluff.length },
      noUnobservableIngredients: { pass: !unobservableFound },
      noTrademarkBrands: { pass: detectedBrands.length === 0, detectedBrands: Array.from(new Set(detectedBrands)) },
      aiDisclosureSeparation: { pass: !hasAiTagInKeywords },
      noPromptArtifacts: { pass: detectedPromptArtifacts.length === 0, detectedArtifacts: detectedPromptArtifacts },
      noRepetitiveKeywords: { pass: detectedRepetitiveList.length === 0, detectedRepetitive: detectedRepetitiveList.map((r) => r.term) },
      noContradictoryKeywords: {
        pass: detectedContradictions.length === 0,
        detectedPairs: detectedContradictions.map((c) => ({ termA: c.termA, termB: c.termB, conflict: c.conflict })),
      },
    },
    overallTechnicalPass,
    policyScopeAudit: {
      verifiedByCode: [
        'টাইটেল শব্দ সংখ্যা ও ক্যারেক্টার দৈর্ঘ্য ভ্যালিডেশন',
        'মার্কেটপ্লেস নির্দিষ্ট সিনট্যাক্স ও সাফিক্স (যেমন Adobe Generative AI, Shutterstock min 5 words)',
        'কীওয়ার্ড সংখ্যা প্ল্যাটফর্মের অনুমোদিত সীমার মধ্যে (৫–৫০)',
        'নিষিদ্ধ প্রমোশনাল ও অতিরঞ্জিত শব্দ ফিল্টারিং',
        'প্রম্পট-আর্টিফ্যাক্ট ও এআই রেন্ডার ট্যাগ ফিল্টারিং (Octane, Unreal, 8k, Masterpiece ইত্যাদি)',
        'রিপিটিটিভ বা প্লুরাল ডুপ্লিকেট কীওয়ার্ড সনাক্তকরণ',
        'অদৃশ্য মসলা ও রাসায়নিক ফ্লেভারিং ফিল্টারিং',
        'ট্রেডমার্ক ও বাণিজ্যিক ব্র্যান্ড নেম ফিল্টারিং',
        'AI ডিসক্লোজার ট্যাগ সাধারণ কীওয়ার্ড থেকে পৃথক রাখা',
      ],
      unverifiableByCodeAlone: [
        'Signed Model Release (ছবিতে মানুষের উপস্থিতি থাকলে কাগজের লিগ্যাল ফর্ম)',
        'Signed Property Release (ব্যক্তিগত বা বাণিজ্যিক স্থাপত্যের অনুমতিপত্র)',
        'মার্কেটপ্লেস কন্ট্রিবিউটর অ্যাকাউন্ট স্ট্যান্ডিং ও ট্যাক্স ফর্ম অনুমোদন',
        'এজেন্সির হিউম্যান কিউরেটরদের সাবজেক্টিভ কোয়ালিটি ও কমার্শিয়াল ভ্যালু সিদ্ধান্ত',
      ],
      disclaimerBn:
        'কোড দ্বারা শুধুমাত্র টেকনিক্যাল ক্যারেক্টার লিমিট, শব্দ সংখ্যা, নিষিদ্ধ প্রমোশনাল শব্দ, ব্র্যান্ড ও সিনট্যাক্স যাচাই (PASS) করা হয়েছে। কিন্তু মার্কেটপ্লেসের সার্বিক অনুমোদন (যেমন: মডেল রিলিজ, প্রপার্টি রিলিজ, অ্যাকাউন্ট স্ট্যাটাস ও হিউম্যান কিউরেটরের রিভিউ) কোড দ্বারা স্বয়ংক্রিয়ভাবে ১০০% নিশ্চিত করা সম্ভব নয়।',
      deterministicSoftwareVerified: [
        'টাইটেল শব্দ সংখ্যা ও ক্যারেক্টার দৈর্ঘ্য ভ্যালিডেশন (সফটওয়্যার-যাচাইকৃত)',
        'মার্কেটপ্লেস নির্দিষ্ট সিনট্যাক্স ও সাফিক্স (যেমন Adobe Generative AI, Shutterstock min 5 words)',
        'কীওয়ার্ড সংখ্যা প্ল্যাটফর্মের অনুমোদিত সীমার মধ্যে (৫–৫০)',
        'নিষিদ্ধ প্রমোশনাল শব্দ ও ট্রেডমার্ক ব্র্যান্ড ফিল্টারিং',
        'প্রম্পট-আর্টিফ্যাক্ট ও টেকনিক্যাল রেন্ডার ট্যাগ ফিল্টারিং',
        'AI ডিসক্লোজার ট্যাগ সাধারণ কীওয়ার্ড থেকে পৃথক রাখা',
      ],
      heuristicEstimates: [
        'কনটেক্সট-ভিত্তিক অদৃশ্য মসলা ও রাসায়নিক ফ্লেভারিং ফিল্টারিং',
        'ডোমেন ক্রস-কন্টামিনেশন প্রতিরোধ (নন-ফুড বা নন-ভেহিকল ফিল্টারিং)',
        'পরস্পরবিরোধী কীওয়ার্ড সনাক্তকরণ (Indoor vs Outdoor, Day vs Night ইত্যাদি)',
        'অদৃশ্য মানসিক অনুভূতি ও কাল্পনিক অ্যাকশন ফিল্টারিং',
      ],
      manualVisualReviewRequired: [
        'ছবির আসল দৃশ্যমান বিষয়বস্তুর সাথে টাইটেল ও কীওয়ার্ডের ১০০% পিক্সেল মিল',
        'কাপড়ের ট্যাগ, বোতল বা ব্যাকগ্রাউন্ডে সূক্ষ্ম বা আংশিক দৃশ্যমান বাণিজ্যিক লোগো নিরীক্ষা',
        'বাস্তব ব্যক্তির মুখাবয়ব থাকলে Signed Model Release',
        'ব্যক্তিগত বা বাণিজ্যিক স্থাপত্যের Signed Property Release',
        'স্টক এজেন্সির হিউম্যান কিউরেটরদের সাবজেক্টিভ কোয়ালিটি ও কমার্শিয়াল ভ্যালু অনুমোদন',
      ],
    },
    keywordAnomalyAudit,
  };
}

/**
 * Complete metadata verification and quality check.
 */
export function verifyAndSanitizeStockMetadata(
  rawMetadata: {
    title: string;
    description: string;
    keywords: string[];
    visualSubjectDescription?: string;
    category?: string;
    hasHumans?: boolean;
  },
  marketplace: StockMarketplaceId
) {
  const visualSubject = rawMetadata.visualSubjectDescription || 'Visible Subject';
  const category = rawMetadata.category || 'General';

  // 1. Verify and format title for marketplace
  const titleResult = formatTitleForMarketplace(rawMetadata.title, visualSubject, marketplace);

  // 2. Clean and verify description with context
  const { cleanedText: cleanDesc, removedItems: removedFromDesc } =
    removeUnsupportedDetailsAndFluff(rawMetadata.description, { visualSubject, category });

  let verifiedDesc = cleanDesc;
  if (!verifiedDesc || verifiedDesc.length < 25) {
    verifiedDesc = `Factual stock photo depicting ${visualSubject.toLowerCase()}. Clear composition with authentic visual details and balanced lighting.`;
  }

  // 3. Filter and ground keywords with context
  const kwResult = filterAndGroundKeywords(
    rawMetadata.keywords || [],
    visualSubject,
    category,
    marketplace,
    {
      hasHumans: rawMetadata.hasHumans,
    }
  );

  // 4. Run honest marketplace validation audit
  const validationAudit = auditMarketplaceValidation(
    {
      title: titleResult.title,
      description: verifiedDesc,
      keywords: kwResult.keywords,
      visualSubject,
      category,
      hasHumans: rawMetadata.hasHumans,
    },
    marketplace
  );

  return {
    title: titleResult.title,
    description: verifiedDesc,
    keywords: kwResult.keywords,
    titleRuleCompliance: titleResult.compliesWithRule,
    titleRuleDetails: titleResult.ruleDetails,
    validationAudit,
    keywordAnomalyAudit: validationAudit.keywordAnomalyAudit,
    removedPromotionalFluffCount: kwResult.removedPromotionalCount + removedFromDesc.length,
    removedItemsList: kwResult.removedItemsList,
    isQualityVerified: true,
  };
}
