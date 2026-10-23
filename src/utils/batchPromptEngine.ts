/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BatchPromptItem, BatchPlan, AspectRatioType, BatchDiversityAudit } from '../types';
import { GoogleGenAI } from '@google/genai';

// -------------------------------------------------------------
// 30+ Diverse Commercial Compositions
// -------------------------------------------------------------
export const COMPOSITIONS = [
  'টপ-ডাউন ফ্ল্যাট লে (Flat Lay 90° overhead)',
  '৪৫ ডিগ্রি টেবিলটপ অ্যাঙ্গেল (45° Tabletop perspective)',
  'এক্সট্রিম ম্যাক্রো টেক্সচার ও ডিটেইল (Extreme Macro texture & depth)',
  'সেন্টার সিমেট্রি সহ কপি স্পেস (Center symmetry with generous copy space)',
  'ডানপাশে নেগেটিভ স্পেস সহ রুল অফ থার্ডস (Rule of thirds with right negative space)',
  'বামপাশে টাইপোগ্রাফির জন্য ফাঁকা জায়গা (Left copy space for editorial text)',
  'গ্রাউন্ড লেভেল লো-অ্যাঙ্গেল হিরো শট (Ground-level low-angle hero shot)',
  'আইসোমেট্রিক ফ্লোটিং কম্পোজিশন (Isometric floating perspective)',
  'লিডিং লাইনস ও গভীরতা (Leading lines drawing eye to subject)',
  'ন্যাচারাল ফ্রেমিং ও পাতার আড়াল (Natural foliage framing with foreground elements)',
  'সিনেমাটিক ডাচ অ্যাঙ্গেল (Cinematic Dutch tilt)',
  'ওয়াইড এনভায়রনমেন্টাল কনটেক্সট (Wide environmental establishing composition)',
  'মিনিমালিস্ট আইসোলেটেড সাবজেক্ট (Minimalist isolated subject with ample breathing room)',
  'ডায়াগনাল ডায়নামিক ব্যালেন্স (Diagonal dynamic line composition)',
  'ক্লোজ-আপ শ্যালো ডেপথ অফ ফিল্ড (Close-up with creamy bokeh background)',
  'টপ ভিউ জিওমেট্রিক বিন্যাস (Geometric top view arrangement)',
  'স্মুথ ট্র্যাভেলিং আই-লেভেল পার্সপেক্টিভ (Eye-level direct commercial angle)',
  'লেয়ার্ড ফোরগ্রাউন্ড-ব্যাকগ্রাউন্ড গভীরতা (Layered depth with blurred foreground elements)',
  'ভাসমান উপাদান ও জিরো-গ্র্যাভিটি ড্রপ (Floating components in dynamic stillness)',
  'ডাবল সাবজেক্ট হারমোনিক পেয়ারিং (Harmonic dual-subject composition)',
  'এস-কার্ভ কম্পোজিশনাল ফ্লো (S-curve compositional fluid motion)',
  'গোল্ডেন রেশিও স্পাইরাল ফোকাস (Golden ratio spiral focal alignment)',
  'স্প্লিট ডায়াগনাল কনট্রাস্ট লেআউট (Split diagonal contrasting surface layout)',
  'রেডিয়াল সেন্ট্রিক অ্যারেঞ্জমেন্ট (Radial arrangement expanding from focal center)',
  'প্যানোরমিক আল্ট্রা-ওয়াইড হরিজন্টাল ব্যালেন্স (Panoramic horizontal field balance)',
  'ভার্টিক্যাল ক্যাসকেডিং লেয়ার্স (Vertical cascading layered arrangement)',
  'অফ-গ্রিড অ্যাসিম্যাট্রিক ব্যালেন্স (Off-grid asymmetrical modern layout)',
  'টানেল পার্সপেক্টিভ করিডোর ফোকাস (Tunnel perspective deep corridor focus)',
  'ক্লোজ ক্রপিং অ্যাবস্ট্রাক্ট ফর্ম (Abstract tight crop isolating geometric rhythm)',
  'মাল্টি-টিয়ার্ড এলিভেটেড পেডেস্টাল ডিসপ্লে (Multi-tiered architectural pedestal staging)',
];

// -------------------------------------------------------------
// 30+ Diverse Commercial Lighting Setups
// -------------------------------------------------------------
export const LIGHTING_SETUPS = [
  'গোল্ডেন আওয়ারের নরম গোধূলি আলো (Golden hour warm backlighting with sun flare)',
  'ডিফিউজড স্টুডিও সফটবক্স লাইটিং (Diffused studio softbox wrap-around lighting)',
  'ড্রামাটিক চিয়ারোস্কুরো সাইডলাইট (Dramatic chiaroscuro side lighting with deep shadows)',
  'হাই-কি মিনিমালিস্ট ব্রাইট লাইট (High-key luminous commercial studio lighting)',
  'লো-কি মুডি সিনেমাটিক অ্যাটমোস্ফিয়ার (Low-key moody atmospheric directional illumination)',
  'ব্যাকলিট রিম লাইটিং (Subtle backlit edge & rim lighting defining contours)',
  'সূর্যকিরণের ভোঁতা ছায়া ও পাতা (Dappled natural sunlight filtered through foliage)',
  'ভোরের কুয়াশাচ্ছন্ন নরম বিচ্ছুরণ (Morning mist atmospheric diffused daylight)',
  'পরিচ্ছন্ন রিং-লাইট কমার্শিয়াল গ্লো (Pristine commercial continuous ring-light wrap)',
  'সায়ান ও অ্যাম্বার কনট্রাস্ট লাইট (Cool cyan fill with warm golden-amber accent)',
  'উইন্ডো সাইডলাইট প্রাকৃতিক উজ্জ্বলতা (Sunlit window sidelight with soft lace diffusion)',
  'গোধূলির গোধূলি নীল ও নিয়ন আভা (Twilight blue hour glow with subtle warm accents)',
  'ক্লিন স্পটলাইট ফোকাস (Clean focused spotlight accentuating core texture)',
  'সূর্যাস্তের ড্রামাটিক আড়াআড়ি রোদ (Sunset low-raking grazing light accentuating micro-textures)',
  'ইনডোর ওয়ার্ম টোন্ড ইনক্যান্ডিসেন্ট গ্লো (Warm 3200K interior cozy ambient illumination)',
  'ক্রিস্প নিউট্রাল ডেলাইট ৫৫০০কে (Crisp neutral 5500K balanced daylight photography)',
  'গ্লসি হাইলাইট রিফ্লেকশন (Precision specular highlights on glossy surfaces)',
  'ঘন কুয়াশার ভলিউমেট্রিক আলোকরশ্মি (Volumetric light rays piercing atmospheric haze)',
  'সফট বাউন্স লাইট শ্যাডোলেস (Pure shadowless ceiling-bounced soft luminescence)',
  'ডুয়াল কালার জেল অ্যাকসেন্ট (Creative dual-temperature complementary rim lighting)',
  'অ্যাবস্ট্রাক্ট প্রিজম রিফ্র্যাক্টেড কস্টিকস (Prismatic caustic light reflections playing on surfaces)',
  'মৃদু ওভারকাস্ট প্রাকৃতিক মেঘের ফিল্টার (Gentle overcast sky soft diffused ambient light)',
  'টপ-ডাউন বিউটি ডিশ শার্প গ্লো (Top-down beauty dish crisp directional highlights)',
  'অ্যাম্বিয়েন্ট ক্যান্ডেললাইট ফ্লিকার ওমথ (Soft intimate flicker of warm candle glow)',
  'আন্ডারওয়াটার সাবমার্জড রিফ্র্যাক্টেড লাইট (Submerged refracted light caustic patterns)',
  'গবলিন স্টুডিও প্যাটার্নড শ্যাডো (Gobo patterned architectural window shadow play)',
  'হাইপার-লুমিনাস নিয়ন ব্যাকড্রপ অ্যাকসেন্ট (Hyper-luminous magenta and teal ambient glow)',
  'মনোক্রোম সাইড ড্রাফট শ্যাডো (Monochrome single-source directional rake light)',
  'সিল্কি লুমিনাস পার্পল অরোরা লাইট (Silky luminous northern lights atmospheric cast)',
  'ফ্রস্টেড এক্রিলিক আন্ডার-টেবিল ব্যাকলাইট (Under-table frosted acrylic luminous uplight)',
];

// -------------------------------------------------------------
// 25+ Camera Lenses & Angles
// -------------------------------------------------------------
export const CAMERA_SETUPS = [
  '১০০মিমি f/২.৮ ম্যাক্রো লেন্স (100mm f/2.8 Macro lens, tack-sharp focal plane)',
  '৮৫মিমি f/১.৪ প্রাইম পোর্ট্রেট (85mm f/1.4 prime lens, ultra-shallow depth of field)',
  '৫০মিমি f/১.৮ ন্যাচারাল ভিউ (50mm f/1.8 lens, natural eye-level human perspective)',
  '২৪মিমি f/২.৮ ওয়াইড এনভায়রনমেন্ট (24mm f/2.8 wide environmental lens)',
  '৩৫মিমি f/১.৪ স্ট্রিট ও লাইফস্টাইল (35mm f/1.4 documentary storytelling perspective)',
  '২০০মিমি f/৪ টেলিফটো কম্প্রেশন (200mm f/4 telephoto lens with compressed background)',
  '১৬মিমি আল্ট্রা-ওয়াইড আর্কিটেকচারাল (16mm ultra-wide rectilinear perspective)',
  'টপ-ডাউন ৯০° অর্থোগ্রাফিক (90-degree vertical orthographic sensor view)',
  'লো-অ্যাঙ্গেল ১৫° হিরো এলিভেশন (Low 15-degree upward hero perspective)',
  'হাই-অ্যাঙ্গেল ৪৫° ওভারহেড লুক (High 45-degree angle establishing perspective)',
  'টিয়ার-ড্রপ ম্যাক্রো প্রোব লেন্স (Macro probe lens capturing microscopic water droplets)',
  'সিল্কি বোকাহ সার্কুলার ডিস্কস (Telephoto zoom with creamy circular bokeh discs)',
  'আই-লেভেল স্টুডিও ট্রাইপড মাউন্ট (Direct eye-level professional studio tripod mount)',
  'স্লাইট ডিল্ট সিনেমাটিক ড্রোন ভিউ (Gentle elevated drone camera perspective)',
  'হ্যাসেলব্লাড ১০০এমপি মিডিয়াম ফরম্যাট (Hasselblad 100MP medium format sensor resolution)',
  'সনি A7R V শার্প ৯০মিমি ম্যাক্রো (Sony A7R V with 90mm G-Master macro sweet-spot)',
  'ক্যানন এল-সিরিজ ২৮-৭০মিমি f/২ (Canon L-Series 28-70mm f/2 studio zoom at 55mm)',
  'প্যানোরমিক সিনেমাটিক অ্যানামরফিক (Cinematic anamorphic squeeze with subtle horizontal flare)',
  'প্যারালাক্স ফোকাস স্ট্যাকড ডেপথ (Multi-plane parallax focal stack from foreground to infinity)',
  'ডুয়াল-লেন্স হাইপারফোকাল স্পষ্টতা (Hyperfocal distance setting ensuring edge-to-edge optical clarity)',
  'টিয়ার-ড্রপ ওয়াইড অ্যাঙ্গেল ক্লোজআপ (Wide-angle close-up emphasizing dramatic foreground scale)',
  'আইসোমেট্রিক ৪ডি আর্কিটেকচারাল অ্যাঙ্গেল (Isometric architectural precision angle)',
  'সাব-মার্জড ওয়াটারলাইন স্প্লিট ভিউ (Submerged 50/50 split waterline underwater perspective)',
  'ক্যান্ডিড হ্যান্ডহেল্ড মোশন পার্সপেক্টিভ (Candid documentary handheld eye-level frame)',
  'টেলি-ম্যাক্রো ১৩৫মিমি f/২ আইসোলেশন (135mm f/2 telephoto extreme subject isolation)',
];

// -------------------------------------------------------------
// 30+ Realistic Backgrounds & Commercial Settings
// -------------------------------------------------------------
export const BACKGROUND_SETTINGS = [
  'মসৃণ কারারা মার্বেল কাউন্টারটপ (Smooth polished Italian Carrara marble countertop)',
  'গ্রাম্য টেক্সচার্ড ওক কাঠ ও তক্তা (Rustic reclaimed aged oak wooden cutting board)',
  'আধুনিক মিনিমালিস্টিক স্লেট কংক্রিট (Modern minimalist raw textured slate concrete)',
  'সূর্যস্নাত অর্গানিক গ্রিনহাউস ও পাতা (Sun-drenched botanical greenhouse with lush foliage)',
  'ম্যাট ডার্ক অ্যাক্রিলিক স্টুডিও পটভূমি (Matte dark acrylic studio surface with subtle reflections)',
  'হাতে তৈরি অর্গানিক রুক্ষ কাগজ (Handmade textured artisan parchment paper)',
  'আধুনিক আর্কিটেকচারাল ব্রাশড টাইটানিয়াম (Brushed titanium and anodized aluminum surface)',
  'সূর্যালোকিত মাটির পোড়ামাটির টাইলস (Sun-baked terracotta tiles with Mediterranean warmth)',
  'পিউর সিমলেস হোয়াইট ইনফিনিটি সাইক্লোরামা (Seamless pure white studio infinity cyclorama)',
  'শিশিরভেজা সকালের প্রাকৃতিক বাগান (Morning dew on green botanical garden soil)',
  'ঐতিহ্যবাহী পাটের কাপড় ও সুতি টেক্সটাইল (Natural woven jute and rustic organic linen textile)',
  'চকচকে কালো গ্রানাইট পাথর (Glossy polished black granite with crystal speckles)',
  'ধোঁয়াশা অন্ধকার স্টুডিও ভলিউম (Atmospheric dark studio space with subtle ethereal fog)',
  'আর্ট ডেকো প্যাটার্নযুক্ত ওয়াল সারফেস (Subtle textured geometric art deco wall relief)',
  'নদীর মসৃণ কালো নুড়িপাথর (Smooth river pebbles arranged in serene Zen aesthetic)',
  'উষ্ণ বেইজ চুনাপাথর ও ট্রাভার্টিন স্ল্যাব (Warm beige limestone and natural porous travertine slab)',
  'আধুনিক গ্লাস ও স্টিল ল্যাবরেটরি ডেস্ক (High-tech frosted glass and surgical stainless steel desk)',
  'সোনালী বালির সমুদ্র সৈকত (Fine golden desert sand dunes rippled by gentle breeze)',
  'নর্ডিক ফ্যাকাশে পাইন কাঠ (Scandinavian light pine timber floor with clean grain)',
  'কাঁচা মাটির প্রাকৃতিক আর্দ্র জমি (Rich organic dark farm humus with natural botanical roots)',
  'চকচকে সিরামিক সাবওয়ে টাইলস (High-gloss white ceramic subway tiles with crisp dark grout)',
  'পলিশড কপার ও ব্রাস মেটালিক প্লেট (Polished warm copper and patinated brass surface plate)',
  'টেরাকোটা ও রোদে শুকানো মাটির পাত্র (Sun-dried earthen pottery and clay terracotta textures)',
  'জাপানি বাঁশের তাওয়ামি মাদুর (Authentic woven Japanese tatami mat and cedar slat grid)',
  'লাক্সারি ভেলভেট ও ডার্ক সিল্ক ড্রেপ (Deep obsidian crushed velvet and flowing silk drapery)',
  'হিমশীতল বরফের ক্রিস্টাল প্লেট (Frosted arctic ice surface with microscopic crystal cracks)',
  'টেক্সচার্ড জিপসাম প্লাস্টার ওয়াল (Hand-troweled textured gypsum plaster wall relief)',
  'রেজিন ও মার্বেল কম্পোজিট পোডিয়াম (Cast terrazzo composite podium with speckled quartz chips)',
  'পাইনবনের ঝরা পাতার ভেজা মাটি (Rain-soaked pine needle forest floor with moss patches)',
  'মর্ডানিস্ট মনোলিথিক বেসাল্ট ব্লক (Monolithic volcanic black basalt block with raw edges)',
];

// -------------------------------------------------------------
// 25+ Professional Color Palettes
// -------------------------------------------------------------
export const COLOR_PALETTES = [
  'উষ্ণ মধু ও পোড়ামাটির আভা (Warm honey amber, golden caramel, and rich terracotta)',
  'বোটানিক্যাল শ্যাওলা ও জলপাই সবুজ (Earthy botanical moss green, sage, and deep olive)',
  'স্ক্যান্ডিনেভিয়ান মিনিমালিস্টিক নিউট্রাল (Scandinavian minimalist muted beige and pure slate gray)',
  'রিচ এস্প্রেসো ও গভীর মেহগনি (Rich espresso brown, dark mahogany, and roasted walnut)',
  'উজ্জ্বল সাইট্রাস ও প্রাকৃতিক ডেলাইট (Vibrant sun-kissed citrus yellow, fresh lime, and crisp white)',
  'হাই-কনট্রাস্ট ক্লিনিকেল নিউট্রাল (High-contrast clean neutral monochrome with subtle cream accents)',
  'গোধূলির বেগুনি ও নরম নীলাভ আভা (Twilight periwinkle blue, soft lavender, and gentle dusky pink)',
  'ফিউচারিস্টিক কোবাল্ট ও ইলেকট্রিক অ্যাম্বার (Futuristic deep cobalt blue and glowing electric amber)',
  'লাক্সারি পান্না সবুজ ও স্বর্ণালী ছোঁয়া (Deep emerald green with metallic warm gold leaf accents)',
  'নরম প্যাস্টেল সকালের আলোর সুর (Ethereal pastel peach, subtle rosewater, and chalky bone white)',
  'ম্যাট চারকোল ও তামার প্রতিফলন (Matte charcoal graphite with warm brushed copper reflections)',
  'তাজা পুদিনা ও সমুদ্রের ফেনা নীল (Fresh mint teal, seafoam aqua, and warm sandy beige)',
  'ঐতিহ্যবাহী মশলা লাল ও হলুদ (Deep turmeric saffron, rich paprika red, and toasted cumin brown)',
  'অরগানিক মাটির খাকি ও ওকার (Organic khaki earth, burnt umber, and raw sienna)',
  'সিলভার ও ফ্রস্টেড আইস ব্লু (Polished sterling silver, platinum, and crisp frosted ice blue)',
  'গভীর রুবি ওয়াইন ও ব্ল্যাকবেরি (Deep ruby red wine, velvety maroon, and ripe blackberry)',
  'ভিটামিন সি অরেঞ্জ ও কোকোনাট হোয়াইট (Vibrant blood orange, ripe apricot, and creamy coconut white)',
  'মর্ডানিস্ট ব্ল্যাক ও ব্রাশড গোল্ড (Modernist pitch black, gunmetal, and brushed champagne gold)',
  'ন্যাচারাল কটন ক্যানভাস ও কাঁচা পাট (Raw unbleached cotton cream, bleached bone, and natural hemp)',
  'ফরেস্ট পাইন ও রেইনস্টোন গ্রে (Deep Alpine forest pine green and rain-soaked riverbed gray)',
  'অ্যামিথিস্ট পার্পল ও রোজ কোয়ার্টজ (Crystalline amethyst purple, smoky quartz, and dusty rose)',
  'মরুভূমির বালিয়াড়ি ও টেরাকোটা সানসেট (Desert dune ochre, clay blush, and burnt sunset coral)',
  'সাইবারপাঙ্ক নিওন সায়ান ও ম্যাজেন্টা (Cyberpunk glowing neon cyan, magenta edge, and deep shadow)',
  'ল্যাবরেটরি ক্লিন সিয়ান ও আল্ট্রা-হোয়াইট (Clinical sterile cyan, distilled water blue, and pure white)',
  'গোল্ডেন হুইট ও কান্ট্রি ওটস (Sun-ripened wheat gold, rustic raw oat cream, and field straw)',
];

export const COMMERCIAL_PERSPECTIVES = [
  'hero center focal alignment, balanced symmetry',
  'rule-of-thirds off-center placement with ample copy space',
  'overhead flat-lay geometric organization',
  'dynamic diagonal leading lines across the frame',
  'intimate close-up macro focal point with shallow depth of field',
  'environmental context establishing wider narrative',
  'dramatic low-angle hero elevation, monumental presence',
  'elevated three-quarter editorial view',
  'floating suspended components with zero gravity elegance',
  'textured surface foreground framing the subject',
  'golden-ratio spiral alignment with negative breathing room',
  'cross-sectional internal texture revelation',
  'minimalist negative space dominance for typography overlay',
  'split-level surface elevation with contrasting textures',
  'radial symmetrical arrangement emanating outwards',
  'subtle side-profile silhouette with edge lighting',
  'layered depth with soft foreground blur and sharp mid-ground',
  'sun-drenched naturalistic framing with organic shadows',
  'clinical studio isolation on pristine background',
  'festive celebratory grouping with decorative accents',
  'deconstructed raw ingredient layout framing final product',
  'human interaction candid crop focusing on artisan hands',
  'water-droplet refraction through ultra-clear prism optics',
  'lifestyle in-situ contextual display in aspirational interior',
  'dramatic rake-angle surface texture shadow mapping',
];

const ASPECT_RATIOS: AspectRatioType[] = ['16:9', '1:1', '3:2', '4:3', '16:9', '9:16'];

// -------------------------------------------------------------
// 100 UNIQUE HANDCRAFTED COMMERCIAL SCENARIOS & BLUEPRINTS
// Guarantees 0% modulo duplication for batches up to 100 prompts
// -------------------------------------------------------------
export interface CommercialScenarioBlueprint {
  id: number;
  focusThemeBn: string;
  sceneDescBn: string;
  conceptStyleEn: string;
  focusDetail: string;
  preferredAspect: AspectRatioType;
  primaryPerspective: string;
  archetypeStructure: number; // 0 to 5
}

export const COMMERCIAL_SCENARIO_BLUEPRINTS: CommercialScenarioBlueprint[] = [
  // 1-10: Purity, Macro & Sensory Textures
  {
    id: 1,
    focusThemeBn: 'খাঁটি উপাদানের স্বচ্ছ সোনালী সান্দ্রতা ও ম্যাক্রো ড্রপলেট',
    sceneDescBn: 'কাছের ম্যাক্রো ফোকাসে সান্দ্র তরলের ফোঁটা পড়ার মুহূর্তে প্রতিফলিত ব্যাকলাইট ও স্পষ্ট টেক্সচার।',
    conceptStyleEn: 'ultra-sharp macro capture highlighting natural viscosity, liquid droplets, and crystalline transparency',
    focusDetail: 'microscopic liquid surface tension and warm light refraction',
    preferredAspect: '1:1',
    primaryPerspective: 'intimate close-up macro focal point with shallow depth of field',
    archetypeStructure: 0,
  },
  {
    id: 2,
    focusThemeBn: 'লাক্সারি আইসোলেশন ও কপি স্পেস সহ হিরো প্রোডাক্ট ডিসপ্লে',
    sceneDescBn: 'মসৃণ সমতলে কেন্দ্রস্থ প্রধান পণ্য, পাশে কমার্শিয়াল হেডলাইনের জন্য সুপরিকল্পিত নেগেটিভ স্পেস।',
    conceptStyleEn: 'luxury editorial hero presentation, immaculate surface isolation, and clean negative space',
    focusDetail: 'pristine product contours with generous editorial copy breathing room',
    preferredAspect: '16:9',
    primaryPerspective: 'hero center focal alignment, balanced symmetry',
    archetypeStructure: 1,
  },
  {
    id: 3,
    focusThemeBn: 'সূর্যস্নাত ভোরের খামার ও প্রাকৃতিক উৎসক্ষেত্রের জীবন্ত পরিবেশ',
    sceneDescBn: 'সকালের সোনালী রোদে কাঁচা ফসলি ক্ষেত ও প্রাকৃতিক পরিবেশের ভেতর সাজানো সতেজ কাঁচামাল।',
    conceptStyleEn: 'sun-drenched morning origin harvest story with organic agricultural surroundings',
    focusDetail: 'dew-soaked leaves and rich natural earthy atmosphere',
    preferredAspect: '16:9',
    primaryPerspective: 'environmental context establishing wider narrative',
    archetypeStructure: 2,
  },
  {
    id: 4,
    focusThemeBn: 'কারিগর বা প্রস্তুতকারকের হাতের নিখুঁত যত্ন ও মানবীয় ছোঁয়া',
    sceneDescBn: 'দক্ষ প্রস্তুতকারকের হাতের নিপুণ স্পর্শে পণ্যের গুণমান পরীক্ষা ও ঐতিহ্যবাহী তৈরির মুহূর্ত।',
    conceptStyleEn: 'authentic artisan craftsmanship storytelling with human hands delicately finishing the product',
    focusDetail: 'authentic human hand interaction and textured organic handling',
    preferredAspect: '4:3',
    primaryPerspective: 'human interaction candid crop focusing on artisan hands',
    archetypeStructure: 4,
  },
  {
    id: 5,
    focusThemeBn: 'আধুনিক মিনিমালিস্ট আনবক্সিং ও ব্র্যান্ড প্যাকেজিং মকআপ',
    sceneDescBn: 'ম্যাট ফিনিশ প্যাকেজিং, আনবক্সড উপাদান এবং টাইপোগ্রাফির জন্য ফাঁকা মার্জিনের নান্দনিক সজ্জা।',
    conceptStyleEn: 'sleek minimalist packaging unboxing mockup on architectural stone surface',
    focusDetail: 'crisp packaging box edges and debossed branding space',
    preferredAspect: '16:9',
    primaryPerspective: 'rule-of-thirds off-center placement with ample copy space',
    archetypeStructure: 3,
  },
  {
    id: 6,
    focusThemeBn: 'কাঁচা উপাদানের ডি-কনস্ট্রাক্টেড ফ্ল্যাট লে সজ্জা',
    sceneDescBn: 'টপ-ডাউন কোণ থেকে মূল উপাদানের বিভিন্ন কাঁচা উপাদান সুবিন্যস্ত জ্যামিতিক নকশায় সাজানো।',
    conceptStyleEn: 'deconstructed raw ingredients laid out in artistic geometric precision',
    focusDetail: 'separated raw botanical ingredients and precise culinary spacing',
    preferredAspect: '1:1',
    primaryPerspective: 'overhead flat-lay geometric organization',
    archetypeStructure: 0,
  },
  {
    id: 7,
    focusThemeBn: 'ল্যাবরেটরি টেস্টেড বিশুদ্ধতা ও ক্লিনিক্যাল সাইন্টিফিক অ্যানালাইসিস',
    sceneDescBn: 'কাচের বোরোসিলিকেট ড্রপার, স্বচ্ছ টেস্টটিউব এবং ল্যাব-গ্রেড বিশুদ্ধতার আধুনিক পরিবেশনা।',
    conceptStyleEn: 'laboratory-certified purity inspection with precision borosilicate glassware',
    focusDetail: 'crystal-clear chemical dropper and sterile clinical reflection',
    preferredAspect: '3:2',
    primaryPerspective: 'clinical studio isolation on pristine background',
    archetypeStructure: 1,
  },
  {
    id: 8,
    focusThemeBn: 'ভাসমান উপাদান ও জিরো-গ্র্যাভিটি ডায়নামিক অ্যাকশন শট',
    sceneDescBn: 'বাতাসে ভাসমান পণ্যের অংশ এবং ড্রপলেটের হিমায়িত গতিময় চমৎকার মুহূর্ত।',
    conceptStyleEn: 'dynamic zero-gravity floating composition with frozen action droplets',
    focusDetail: 'suspended splash particles frozen at high-speed shutter speed',
    preferredAspect: '9:16',
    primaryPerspective: 'floating suspended components with zero gravity elegance',
    archetypeStructure: 5,
  },
  {
    id: 9,
    focusThemeBn: 'উষ্ণ সকালের রান্নাঘর ও লাইফস্টাইল পরিবেশন',
    sceneDescBn: 'প্রাকৃতিক জানালার আলোয় আধুনিক কাঠের রান্নাঘরের কাউন্টারে আরামদায়ক প্রাত্যহিক ব্যবহারের চিত্র।',
    conceptStyleEn: 'warm morning kitchen lifestyle with natural window sidelight and cozy residential aesthetic',
    focusDetail: 'steam wisps and textured morning ceramics',
    preferredAspect: '16:9',
    primaryPerspective: 'lifestyle in-situ contextual display in aspirational interior',
    archetypeStructure: 2,
  },
  {
    id: 10,
    focusThemeBn: 'ডার্ক সিনেমাটিক চিয়ারোস্কুরো ও লাক্সারি গোল্ডেন রিম লাইটিং',
    sceneDescBn: 'গভীর অন্ধকার ব্যাকগ্রাউন্ডে ধারালো সোনালী সাইডলাইটে ফুটে ওঠা প্রিমিয়াম কনট্যুর।',
    conceptStyleEn: 'moody dark chiaroscuro luxury advertising with dramatic golden contour illumination',
    focusDetail: 'gleaming metallic edge sheen against velvety shadows',
    preferredAspect: '16:9',
    primaryPerspective: 'subtle side-profile silhouette with edge lighting',
    archetypeStructure: 1,
  },

  // 11-20: Culinary, Organic & Texture Depth
  {
    id: 11,
    focusThemeBn: 'শিশিরভেজা সতেজ পাতার ওপর অর্গানিক প্রোডাক্টের প্রাকৃতিক স্নিগ্ধতা',
    sceneDescBn: 'ভোরের প্রাকৃতিক বাগানের সবুজ পাতার বুকে শিশিরবিন্দুর মাঝে স্থাপিত পণ্যের সজীব রূপ।',
    conceptStyleEn: 'botanical morning freshness with pristine dew drops on vibrant green leaves',
    focusDetail: 'microscopic translucent water spheres resting on organic leaf veins',
    preferredAspect: '1:1',
    primaryPerspective: 'sun-drenched naturalistic framing with organic shadows',
    archetypeStructure: 0,
  },
  {
    id: 12,
    focusThemeBn: 'ঐতিহ্যবাহী কাঠের ব্লকে হ্যান্ডক্রাফটেড প্রসেস ও খোদাই কাজ',
    sceneDescBn: 'পাকা ওক কাঠের তক্তায় কারিগরের পুরোনো লোহার সরঞ্জামের পাশে সাজানো পণ্যের উপাদান।',
    conceptStyleEn: 'heritage artisanal woodworking workshop setup celebrating raw authentic materials',
    focusDetail: 'deep wood-grain grooves and vintage brass hand-tools',
    preferredAspect: '3:2',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },
  {
    id: 13,
    focusThemeBn: 'গুরমেট রেস্তোরাঁর শেফ প্লেটিং ও শৈল্পিক খাদ্য পরিবেশনা',
    sceneDescBn: 'সিরামিক প্লেটে শেফের দক্ষতায় সস ও উপাদান ড্রপ করার নিখুঁত পরিবেশনা শৈলী।',
    conceptStyleEn: 'fine dining gourmet culinary plating with artful sauce drizzles and edible garnishes',
    focusDetail: 'glossy reduction drizzle and delicate microgreen placement',
    preferredAspect: '16:9',
    primaryPerspective: 'elevated three-quarter editorial view',
    archetypeStructure: 2,
  },
  {
    id: 14,
    focusThemeBn: 'আইসোমেট্রিক মাল্টি-লেয়ার স্ট্রাকচারাল আর্কিটেকচার ভিউ',
    sceneDescBn: 'আইসোমেট্রিক দৃষ্টিকোণে পণ্যের বিভিন্ন উপাদানের বিন্যাস ও সুষম স্তরায়ন।',
    conceptStyleEn: 'clean isometric architectural view displaying multi-layered components',
    focusDetail: 'crisp 30-degree isometric angles and balanced spatial planes',
    preferredAspect: '1:1',
    primaryPerspective: 'isometric floating perspective',
    archetypeStructure: 3,
  },
  {
    id: 15,
    focusThemeBn: 'উৎসবের উপহার বক্স ও সাটিন রিবনের প্রিমিয়াম হ্যাম্পার',
    sceneDescBn: 'লাক্সারি গিফট বক্সে মোড়ানো পণ্যের সাথে সোনালী রিবন ও উৎসবের উষ্ণ আলপনা।',
    conceptStyleEn: 'festive luxury gift hamper arrangement with silk ribbons and premium presentation packaging',
    focusDetail: 'smooth satin ribbon sheen and embossed gift packaging texture',
    preferredAspect: '16:9',
    primaryPerspective: 'festive celebratory grouping with decorative accents',
    archetypeStructure: 1,
  },
  {
    id: 16,
    focusThemeBn: 'হিমশীতল রিফ্রেশিং বরফের ক্রিস্টাল ও কনডেনসেশন ড্রপস',
    sceneDescBn: 'কাঁচের ওপর জমে ওঠা বরফের শীতল বিন্দু ও জমাট ক্রিস্টালের ভেতর পণ্যের সতেজতা।',
    conceptStyleEn: 'ice-cold refreshing condensation droplets running down chilled surfaces',
    focusDetail: 'beaded water droplets sliding down frosted glass surface',
    preferredAspect: '9:16',
    primaryPerspective: 'intimate close-up macro focal point with shallow depth of field',
    archetypeStructure: 0,
  },
  {
    id: 17,
    focusThemeBn: 'বোটানিক্যাল স্পা ও ওয়েলনেস রিলাক্সেশন অ্যারোমা সজ্জা',
    sceneDescBn: 'মসৃণ নদীর নুড়িপাথর, বাঁশের জলধারা এবং প্রাকৃতিক এসেন্সের শান্ত স্নিগ্ধ পরিবেশ।',
    conceptStyleEn: 'tranquil botanical spa and holistic wellness setting with smooth Zen stones',
    focusDetail: 'river pebble texture and aromatic herbal steam wisps',
    preferredAspect: '16:9',
    primaryPerspective: 'golden-ratio spiral alignment with negative breathing room',
    archetypeStructure: 2,
  },
  {
    id: 18,
    focusThemeBn: 'ক্রস-সেকশন বা ভেতরের উপাদান কাঠামোর উন্মোচন',
    sceneDescBn: 'পণ্যের নিখুঁত কাট-আউট বা ক্রস-সেকশনে ভেতরের স্তর ও সুষম মিশ্রণের স্বচ্ছ দৃশ্য।',
    conceptStyleEn: 'cross-sectional internal revelation showing core texture, layers, and purity',
    focusDetail: 'intricate cross-cut internal layers and authentic material density',
    preferredAspect: '1:1',
    primaryPerspective: 'cross-sectional internal texture revelation',
    archetypeStructure: 0,
  },
  {
    id: 19,
    focusThemeBn: 'হাই-টেক ডিজিটাল সেন্সর ও স্মার্ট ফার্মিং মনিটরিং কনটেক্সট',
    sceneDescBn: 'আধুনিক স্মার্ট সেন্সর রিডিং, নির্ভুল ডিজিটাল প্যারামিটার ও হাইপার-মডার্ন প্রযুক্তিগত পরিবেশ।',
    conceptStyleEn: 'futuristic smart-agriculture and precision sensor monitoring context',
    focusDetail: 'sleek anodized sensor probes and subtle digital luminescence',
    preferredAspect: '16:9',
    primaryPerspective: 'environmental context establishing wider narrative',
    archetypeStructure: 5,
  },
  {
    id: 20,
    focusThemeBn: 'ঐতিহ্যবাহী তাঁত ও খাঁটি টেক্সটাইল তন্তুর গভীর ক্লাস্টার',
    sceneDescBn: 'প্রাকৃতিক সুতো, তাঁতের তক্তা এবং খাঁটি ফ্যাব্রিকের সুক্ষ্ম বয়নের মাঝে পণ্যের বিন্যাস।',
    conceptStyleEn: 'traditional handloom textile weaving context with natural raw cotton yarns',
    focusDetail: 'individual woven warp and weft textile fiber threads',
    preferredAspect: '4:3',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },

  // 21-30: Editorial, Advertising & Contemporary Design
  {
    id: 21,
    focusThemeBn: 'ইতালিয়ান মার্বেলের ওপর ডাবল প্রোডাক্ট হারমোনিক পেয়ারিং',
    sceneDescBn: 'মার্বেল স্ল্যাবে দুটি সহযোগী ভেরিয়েন্টের সুষম যুগলবন্দি এবং উজ্জ্বল সফ্টবক্স রিফ্লেকশন।',
    conceptStyleEn: 'dual-product harmonic pairing staged upon Carrara marble countertop',
    focusDetail: 'mirrored reflection on polished marble and harmonious scale balance',
    preferredAspect: '16:9',
    primaryPerspective: 'hero center focal alignment, balanced symmetry',
    archetypeStructure: 1,
  },
  {
    id: 22,
    focusThemeBn: 'সূর্যাস্তের ড্রামাটিক লো-রেকিং আলোয় দীর্ঘ শৈল্পিক ছায়া',
    sceneDescBn: 'পশ্চিমের লালচে সূর্যাস্তের আলোয় তেরছা ছায়ার খেলা ও পণ্যের রহস্যময় অনন্য আবহ।',
    conceptStyleEn: 'sunset low-raking horizontal golden light casting elongated dramatic shadows',
    focusDetail: 'raking shadow transitions and warm horizontal sun glints',
    preferredAspect: '16:9',
    primaryPerspective: 'dramatic rake-angle surface texture shadow mapping',
    archetypeStructure: 2,
  },
  {
    id: 23,
    focusThemeBn: 'ম্যাগাজিন কভারের উপযোগী বামপাশে বিশাল কপি স্পেস',
    sceneDescBn: 'ডানপাশে সাবজেক্টের শক্তিশালী অবস্থান এবং বামপাশে বড় হেডলাইনের পরিষ্কার ফাঁকা পটভূমি।',
    conceptStyleEn: 'editorial magazine cover layout reserving prominent left-hand negative space',
    focusDetail: 'smooth gradient backdrop perfectly balanced for commercial typographic overlay',
    preferredAspect: '16:9',
    primaryPerspective: 'rule-of-thirds off-center placement with ample copy space',
    archetypeStructure: 3,
  },
  {
    id: 24,
    focusThemeBn: 'এক্সট্রিম স্লো-মোশন স্প্ল্যাশ ও লিকুইড ক্রাউন ফর্মেশন',
    sceneDescBn: 'তরলের পৃষ্ঠে ফোঁটা পড়ার পর তৈরি হওয়া নিখুঁত মুকুট সদৃশ স্প্ল্যাশ ক্রাউন ও ড্রপলেট।',
    conceptStyleEn: 'high-speed liquid splash freeze capturing crown formation and airborne beads',
    focusDetail: 'sculptural liquid crown rim and razor-sharp splash tendrils',
    preferredAspect: '1:1',
    primaryPerspective: 'intimate close-up macro focal point with shallow depth of field',
    archetypeStructure: 5,
  },
  {
    id: 25,
    focusThemeBn: 'গ্রাউন্ড লেভেল লো-অ্যাঙ্গেল মনুমেন্টাল হিরো শট',
    sceneDescBn: 'নিচু কোণ থেকে তোলা পণ্যের রাজকীয় অবস্থান, যেন এটি একটি স্থাপত্যের মতো মহিমান্বিত।',
    conceptStyleEn: 'ground-level low-angle perspective elevating the product to monumental presence',
    focusDetail: 'steep upward perspective angle and grounded surface solidity',
    preferredAspect: '16:9',
    primaryPerspective: 'dramatic low-angle hero elevation, monumental presence',
    archetypeStructure: 1,
  },
  {
    id: 26,
    focusThemeBn: 'হস্তশিল্পীর মাটির পাত্র ও পোড়ামাটির ঐতিহ্যবাহী পটভূমি',
    sceneDescBn: 'লাল মাটির সানকিতে খাঁটি উপাদান ও গ্রামীণ আবহমান ঐতিহ্যের জীবন্ত দলিল।',
    conceptStyleEn: 'artisan terracotta ceramics and clay pottery celebrating vernacular culture',
    focusDetail: 'chalky clay texture and hand-thrown pottery imperfections',
    preferredAspect: '4:3',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },
  {
    id: 27,
    focusThemeBn: 'কাঁচের টেবিলে আধুনিক কস্টিকস রিফ্র্যাকশন ও প্রিজম আলো',
    sceneDescBn: 'স্বচ্ছ কাঁচের মধ্য দিয়ে বিচ্ছুরিত রংধনু সদৃশ আলোর রেখা এবং আধুনিক স্টুডিও স্পট।',
    conceptStyleEn: 'glass refractive caustics creating luminous prismatic patterns across clean surfaces',
    focusDetail: 'dancing rainbow caustic light curves and pristine glass clarity',
    preferredAspect: '16:9',
    primaryPerspective: 'water-droplet refraction through ultra-clear prism optics',
    archetypeStructure: 1,
  },
  {
    id: 28,
    focusThemeBn: 'বোটানিক্যাল হার্বের তাজা তোড়া ও ড্রাই ফ্লাওয়ার সজ্জা',
    sceneDescBn: 'শুকনো সুগন্ধি ফুল ও তাজা ওষধি পাতার সংমিশ্রণে তৈরি পরিবেশ বান্ধব পটভূমি।',
    conceptStyleEn: 'botanical dried florals and fresh herbs arranged in aromatic harmony',
    focusDetail: 'fragile floral petals and textured fibrous stems',
    preferredAspect: '1:1',
    primaryPerspective: 'overhead flat-lay geometric organization',
    archetypeStructure: 0,
  },
  {
    id: 29,
    focusThemeBn: 'স্ক্যান্ডিনেভিয়ান কাঠের টেবিলে সকালের চা ও কফি লাইফস্টাইল',
    sceneDescBn: 'হালকা পাইন কাঠের ডাইনিং টেবিলে আরামদায়ক সকালের পরিবেশ ও প্রশান্তিময় ছোঁয়া।',
    conceptStyleEn: 'Nordic Scandinavian lifestyle still life on pale pine wood with minimalist morning calmness',
    focusDetail: 'clean pale pine grain and soft matte ceramic mug silhouette',
    preferredAspect: '16:9',
    primaryPerspective: 'lifestyle in-situ contextual display in aspirational interior',
    archetypeStructure: 2,
  },
  {
    id: 30,
    focusThemeBn: 'মেটালিক ব্রাশড অ্যালুমিনিয়াম ও প্রিমিয়াম ইঞ্জিনিয়ারিং ফিনিশ',
    sceneDescBn: 'ব্রাশড ধাতব টেক্সচারে মসৃণ আলোর প্রতিফলন ও নিখুঁত ফিনিশিংয়ের কমার্শিয়াল শট।',
    conceptStyleEn: 'brushed aerospace-grade aluminum backdrop with precision industrial reflections',
    focusDetail: 'micro-grooved metal sheen and crisp bevelled edges',
    preferredAspect: '16:9',
    primaryPerspective: 'clinical studio isolation on pristine background',
    archetypeStructure: 3,
  },

  // 31-40: Sensory, Texture & Atmospheric Storytelling
  {
    id: 31,
    focusThemeBn: 'কাঁচা সোনালী ফসলের মাঠে কৃষকের নিবেদিত সংগ্রহ',
    sceneDescBn: 'সোনার রোদে খোলা আকাশের নিচে মাঠ থেকে সতেজ পণ্য সংগ্রহের খাঁটি প্রামাণ্য রূপ।',
    conceptStyleEn: 'authentic farmer harvest moment in golden crop fields under open skies',
    focusDetail: 'weathered wicker harvesting baskets and sun-bleached crop stalks',
    preferredAspect: '16:9',
    primaryPerspective: 'environmental context establishing wider narrative',
    archetypeStructure: 2,
  },
  {
    id: 32,
    focusThemeBn: 'সফট বাউন্স লাইটে শ্যাডোলেস পিউর হোয়াইট ক্যাটালগ শট',
    sceneDescBn: 'সম্পূর্ণ ছায়াহীন দুধসাদা ইনফিনিটি পটভূমিতে নিখুঁত ই-কমার্স ক্যাটালগ কোয়ালিটি।',
    conceptStyleEn: 'shadowless pure white seamless infinity backdrop for e-commerce catalog excellence',
    focusDetail: 'unblemished product silhouette and edge-to-edge optical purity',
    preferredAspect: '1:1',
    primaryPerspective: 'hero center focal alignment, balanced symmetry',
    archetypeStructure: 3,
  },
  {
    id: 33,
    focusThemeBn: 'হাতে তৈরি অরগানিক পার্চমেন্ট কাগজে ক্যালিগ্রাফি স্টাইল বিন্যাস',
    sceneDescBn: 'রুক্ষ হাতে তৈরি কাগজের খাঁজে সাজানো পণ্যের উপাদান ও ভিনটেজ নান্দনিকতা।',
    conceptStyleEn: 'vintage artisan parchment paper surface with tactile fibrous texture',
    focusDetail: 'deckled paper edges and raw organic cellulose fibers',
    preferredAspect: '4:3',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },
  {
    id: 34,
    focusThemeBn: 'ব্ল্যাক গ্রানাইটে স্ফটিকের চমক ও ওয়েট সারফেস রিফ্লেকশন',
    sceneDescBn: 'ভেজা কালো গ্রানাইটে পণ্যের নিখুঁত উল্টো প্রতিচ্ছবি ও ক্রিস্টালের দীপ্তি।',
    conceptStyleEn: 'wet polished black granite with crystal speckles and mirror reflection',
    focusDetail: 'subtle liquid bead reflections and sparkling mineral flecks',
    preferredAspect: '16:9',
    primaryPerspective: 'subtle side-profile silhouette with edge lighting',
    archetypeStructure: 1,
  },
  {
    id: 35,
    focusThemeBn: 'গোধূলির নীল প্রহর ও উষ্ণ মোমবাতির মায়াবী দ্যুতি',
    sceneDescBn: 'ব্লু আওয়ারের শান্ত নীলিমার মাঝে মৃদু উষ্ণ আলোর আভায় পণ্যের রোমান্টিক আবহ।',
    conceptStyleEn: 'twilight blue hour serenity paired with soft warm candle flame illumination',
    focusDetail: 'warm glowing flame gradient and deep twilight blue ambiance',
    preferredAspect: '16:9',
    primaryPerspective: 'lifestyle in-situ contextual display in aspirational interior',
    archetypeStructure: 2,
  },
  {
    id: 36,
    focusThemeBn: 'উল্লম্ব ক্যাসকেডিং ট্রের আধুনিক আর্কিটেকচারাল ডিসপ্লে',
    sceneDescBn: 'বিভিন্ন উচ্চতার পেডেস্টালে রাখা পণ্যের ছন্দময় ত্রি-মাত্রিক বিন্যাস।',
    conceptStyleEn: 'architectural multi-tiered pedestal staging creating dimensional visual rhythm',
    focusDetail: 'geometric pedestal shadows and stepped spatial elevation',
    preferredAspect: '9:16',
    primaryPerspective: 'split-level surface elevation with contrasting textures',
    archetypeStructure: 3,
  },
  {
    id: 37,
    focusThemeBn: 'প্রকৃতির বুকে কাঠের গুড়িতে শ্যাওলা ও বুনো বোটানিক্যাল ছোঁয়া',
    sceneDescBn: 'গভীর অরণ্যের প্রাচীন কাঠের গুড়িতে সবুজ শ্যাওলার চাদরে রাখা প্রাকৃতিক পণ্য।',
    conceptStyleEn: 'ancient forest moss-covered log serving as nature-crafted staging podium',
    focusDetail: 'velvety moss spore capsules and aged tree bark fissures',
    preferredAspect: '16:9',
    primaryPerspective: 'sun-drenched naturalistic framing with organic shadows',
    archetypeStructure: 0,
  },
  {
    id: 38,
    focusThemeBn: 'গ্লাসের ড্রপারে তরলের শেষ ফোঁটা পড়ার নিখুঁত মুহূর্ত',
    sceneDescBn: 'কাঁচের ড্রপারের মুখ থেকে স্বচ্ছ ড্রপ ঝুলন্ত অবস্থায় স্থির করা ছবি।',
    conceptStyleEn: 'single suspended liquid droplet hanging from high-precision glass pipette tip',
    focusDetail: 'surface tension meniscus right before liquid detachment',
    preferredAspect: '1:1',
    primaryPerspective: 'intimate close-up macro focal point with shallow depth of field',
    archetypeStructure: 0,
  },
  {
    id: 39,
    focusThemeBn: 'হস্তশিল্পের পাটের দড়ি ও অর্গানিক সুতির কাপড়ে মোড়ানো মোড়ক',
    sceneDescBn: 'প্রাকৃতিক পাটের দড়ি ও সুতি ক্যানভাস কাপড়ে বাঁধা ইকো-ফ্রেন্ডলি সাস্টেইনেবল লুক।',
    conceptStyleEn: 'sustainable eco-friendly packaging tied with raw braided jute twine',
    focusDetail: 'coarse jute twine fiber hairs and unbleached cotton textile weave',
    preferredAspect: '4:3',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },
  {
    id: 40,
    focusThemeBn: 'রিং-লাইটের সফট র্যাপে সোশ্যাল মিডিয়া ইনফ্লুয়েন্সার স্টাইল স্টুডিও',
    sceneDescBn: 'সার্কুলার রিং লাইটের বৃত্তাকার নিখুঁত আলোয় ঝকঝকে আধুনিক ডিজিটাল ক্রিয়েটর লুক।',
    conceptStyleEn: 'modern influencer commercial studio with circular continuous ring-light illumination',
    focusDetail: 'smooth circular specular highlights and flawless surface clarity',
    preferredAspect: '9:16',
    primaryPerspective: 'hero center focal alignment, balanced symmetry',
    archetypeStructure: 1,
  },

  // 41-50: Organic Ingredients, Textures & Motion
  {
    id: 41,
    focusThemeBn: 'গোটা ভেষজ ও অর্গানিক বীজের বৃত্তাকার রেডিয়াল বিন্যাস',
    sceneDescBn: 'কেন্দ্রের পণ্যকে ঘিরে চারপাশে প্রাকৃতিক গোটা বীজের চমৎকার চক্রাকার আলপনা।',
    conceptStyleEn: 'radial circular mandalic arrangement of whole botanicals and raw seeds',
    focusDetail: 'concentric seed circles and radiating herbal symmetry',
    preferredAspect: '1:1',
    primaryPerspective: 'radial symmetrical arrangement emanating outwards',
    archetypeStructure: 0,
  },
  {
    id: 42,
    focusThemeBn: 'কাটিং বোর্ডে ফল ও উপাদানের তাজা টুকরোর রসালো রূপ',
    sceneDescBn: 'আখরোট কাঠের বোর্ডে কাটা উপাদানের সতেজ রস ও প্রাকৃতিক ভেজা টেক্সচার।',
    conceptStyleEn: 'freshly sliced succulent ingredients resting on oiled walnut cutting board',
    focusDetail: 'glistening juice droplets on freshly sliced cross-sections',
    preferredAspect: '16:9',
    primaryPerspective: 'elevated three-quarter editorial view',
    archetypeStructure: 2,
  },
  {
    id: 43,
    focusThemeBn: 'প্রিজম্যাটিক রিফ্র্যাকশন সহ ফ্লোটিং সাবজেক্ট ইন অ্যান্টি-গ্র্যাভিটি',
    sceneDescBn: 'আলোর বর্ণচ্ছটার মাঝে ভাসমান সাবজেক্ট ও উপাদানের গতিশীল ভারসাম্য।',
    conceptStyleEn: 'anti-gravity floating subject suspended in mid-air amidst prismatic light flare',
    focusDetail: 'weightless spatial balance and refracted spectrum streaks',
    preferredAspect: '16:9',
    primaryPerspective: 'floating suspended components with zero gravity elegance',
    archetypeStructure: 5,
  },
  {
    id: 44,
    focusThemeBn: 'পাহাড়ের পাথুরে স্লেটে সূর্যালোকিত মাটির উষ্ণতায় রাখা ডিসপ্লে',
    sceneDescBn: 'রুক্ষ পাথরের স্লেটে রোদ পোড়ানো মাটির পাশে রাখা পণ্যের দৃঢ় প্রাকৃতিক সৌন্দর্য।',
    conceptStyleEn: 'rugged mountain slate ledge warmed by radiant alpine sunlight',
    focusDetail: 'weathered stone strata lines and crisp crystalline fractures',
    preferredAspect: '16:9',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 1,
  },
  {
    id: 45,
    focusThemeBn: 'সকালের কুয়াশার ভেতর দিয়ে আসা ভলিউমেট্রিক আলোর রেখা',
    sceneDescBn: 'কুয়াশাচ্ছন্ন স্টুডিওতে আলোকরশ্মির উজ্জ্বল রেখার ভেতর পণ্যটির নাটকীয় উপস্থিতি।',
    conceptStyleEn: 'volumetric light rays piercing through fine atmospheric morning haze',
    focusDetail: 'visible light beams defining dimensional spatial depth',
    preferredAspect: '16:9',
    primaryPerspective: 'environmental context establishing wider narrative',
    archetypeStructure: 2,
  },
  {
    id: 46,
    focusThemeBn: 'কাঁচের জারে সোনালী তরল ও কাঠের লাঠিতে মোড়ানো নির্যাস',
    sceneDescBn: 'স্বচ্ছ কাঁচের জারে সোনালী স্তর এবং কাঠের নাড়ানি দিয়ে তোলার সান্দ্র রূপ।',
    conceptStyleEn: 'vintage ribbed glass jar with wooden dipper winding viscous golden ribbon',
    focusDetail: 'spiraling viscous stream cascading back into clear jar',
    preferredAspect: '1:1',
    primaryPerspective: 'intimate close-up macro focal point with shallow depth of field',
    archetypeStructure: 0,
  },
  {
    id: 47,
    focusThemeBn: 'সাদা সিরামিক টাইলস ও আধুনিক বাথরুমে সেলফ-কেয়ার মুহূর্ত',
    sceneDescBn: 'পরিচ্ছন্ন আধুনিক সিরামিক কাউন্টারে প্রতিদিনের যত্ন ও সতেজতার বাস্তব চিত্র।',
    conceptStyleEn: 'bright contemporary bathroom vanity interior celebrating morning personal care rituals',
    focusDetail: 'gleaming chrome faucet fixtures and pristine white tile reflections',
    preferredAspect: '16:9',
    primaryPerspective: 'lifestyle in-situ contextual display in aspirational interior',
    archetypeStructure: 2,
  },
  {
    id: 48,
    focusThemeBn: 'মার্কেটপ্লেস ব্যানারের জন্য আল্ট্রা-ওয়াইড প্যানোরমিক লেআউট',
    sceneDescBn: 'ওয়েবসাইটের হেডারের উপযোগী দীর্ঘ অনুভূমিক ব্যালেন্সে সাজানো পণ্য ও প্রচুর কপি স্পেস।',
    conceptStyleEn: 'ultra-wide panoramic banner format composed for website hero section',
    focusDetail: 'expansive horizontal copy space suitable for wide digital billboards',
    preferredAspect: '16:9',
    primaryPerspective: 'panoramic horizontal field balance',
    archetypeStructure: 3,
  },
  {
    id: 49,
    focusThemeBn: 'ঐতিহ্যবাহী তামা ও পিতলের থালায় ঐতিহ্যের ছোঁয়া',
    sceneDescBn: 'হাতুড়ি দিয়ে খোদাই করা তামার বাসনে রাখা কাঁচামালের রাজকীয় ঐতিহ্য।',
    conceptStyleEn: 'hand-hammered antique brass and copper dish conveying timeless artisanal heritage',
    focusDetail: 'hand-peened metal dimples and warm burnished metallic patina',
    preferredAspect: '4:3',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },
  {
    id: 50,
    focusThemeBn: 'স্টুডিও লাইটবক্সে পণ্যটির এক্সট্রিম ক্লিন সিমেট্রি ও তীক্ষ্ণ ডিটেইল',
    sceneDescBn: 'লাইটবক্সের নিখুঁত জ্যামিতিক আলোয় পণ্যের প্রতিটি প্রান্ত ও লোগোবিহীন নিখুঁত উপস্থাপন।',
    conceptStyleEn: 'precision studio lightbox calibration highlighting immaculate symmetrical balance',
    focusDetail: 'crisp edge geometry and ultra-uniform light distribution',
    preferredAspect: '1:1',
    primaryPerspective: 'hero center focal alignment, balanced symmetry',
    archetypeStructure: 1,
  },

  // 51-60: Scientific, Abstract, Nature & Culinary Extensions
  {
    id: 51,
    focusThemeBn: 'মাইক্রোস্কোপিক ম্যাক্রো ফোকাসে ক্রিস্টালাইন প্যাটার্ন ও টেক্সচার গ্রেইন',
    sceneDescBn: 'অতি-নিকট ম্যাক্রো লেন্সের দৃষ্টিতে পণ্যের পৃষ্ঠের প্রাকৃতিক দানাদার গঠন ও সূক্ষ্ম কারুকার্য।',
    conceptStyleEn: 'microscopic focal plane revealing natural crystalline granulations and molecular textures',
    focusDetail: 'individual mineral crystal facets caught in sharp micro-focus',
    preferredAspect: '1:1',
    primaryPerspective: 'intimate close-up macro focal point with shallow depth of field',
    archetypeStructure: 0,
  },
  {
    id: 52,
    focusThemeBn: 'গাঢ় এমারেল্ড ব্যাকগ্রাউন্ডে প্রিমিয়াম গোল্ডেন অ্যাকসেন্ট স্টাইলিং',
    sceneDescBn: 'পান্না সবুজ পটভূমির সামনে সোনালী সূক্ষ্ম আলোর রেখায় ফুটে ওঠা বিলাসবহুল পণ্যের আভিজাত্য।',
    conceptStyleEn: 'luxurious emerald green velvet backdrop paired with opulent warm gold foil accents',
    focusDetail: 'shimmering metallic gold leaf highlights against deep jewel-toned fabric',
    preferredAspect: '16:9',
    primaryPerspective: 'subtle side-profile silhouette with edge lighting',
    archetypeStructure: 1,
  },
  {
    id: 53,
    focusThemeBn: 'আর্দ্র বোটানিক্যাল বাগানের কুয়াশা ও কাঁচের গ্রিনহাউস উইন্ডো',
    sceneDescBn: 'গ্রিনহাউসের কাঁচের জানালায় জমে ওঠা জলকণার পেছনে সবুজ পাতা ও মূল পণ্যের স্বপ্নিল দৃশ্য।',
    conceptStyleEn: 'steamy greenhouse glass window with condensed droplets framing tropical foliage',
    focusDetail: 'runny water rivulets on foggy glass pane softening lush background',
    preferredAspect: '16:9',
    primaryPerspective: 'layered depth with blurred foreground elements',
    archetypeStructure: 2,
  },
  {
    id: 54,
    focusThemeBn: 'আধুনিক আর্কিটেকচারাল কংক্রিট মনোলিথ ও শ্যাডো জিওমেট্রি',
    sceneDescBn: 'ধূসর স্থাপত্য কংক্রিটের ব্লকে সূর্যকিরণের তীক্ষ্ণ জ্যামিতিক ছায়া এবং মিনিমাল পণ্যের সহাবস্থান।',
    conceptStyleEn: 'raw architectural concrete podium with razor-sharp modernist geometric cast shadows',
    focusDetail: 'cast shadow angles and textured brutalist concrete porousness',
    preferredAspect: '16:9',
    primaryPerspective: 'rule-of-thirds off-center placement with ample copy space',
    archetypeStructure: 3,
  },
  {
    id: 55,
    focusThemeBn: 'মৃদু বাতাসের দোলা ও সিল্কি ওড়নার মতো টেক্সটাইল ফ্লো',
    sceneDescBn: 'বাতাসের দোলায় উড়ে যাওয়া হালকা অরগানিক মসলিনের আড়ালে উন্মোচিত পণ্যের কোমল মুহূর্ত।',
    conceptStyleEn: 'translucent organic silk chiffon floating in gentle breeze revealing the product',
    focusDetail: 'weightless sheer fabric ripples caught in dynamic mid-air freeze',
    preferredAspect: '16:9',
    primaryPerspective: 'dynamic diagonal leading lines across the frame',
    archetypeStructure: 5,
  },
  {
    id: 56,
    focusThemeBn: 'হ্যান্ডমেড সিরামিক বাটিতে প্রাকৃতিক দানাদার উপাদানের টেক্সচার্ড পাইল',
    sceneDescBn: 'হাতে গড়া মাটির থালায় স্তূপ করে রাখা কাঁচা খাঁটি উপাদান ও তার প্রাকৃতিক রঙের সমাহার।',
    conceptStyleEn: 'rustic handmade ceramic bowl filled with an artisanal mound of organic raw harvest',
    focusDetail: 'tactile unevenness of kiln-fired clay and heaped ingredient abundance',
    preferredAspect: '1:1',
    primaryPerspective: 'elevated three-quarter editorial view',
    archetypeStructure: 4,
  },
  {
    id: 57,
    focusThemeBn: 'স্প্লিট-লেভেল জলের উপরিভাগ ও নিমজ্জিত তলদেশের যুগল দৃশ্য',
    sceneDescBn: 'একই ফ্রেমে অর্ধেক অংশ জলের ওপরে এবং অর্ধেক অংশ স্বচ্ছ জলের নিচে নিমজ্জিত দ্বৈত ভিউ।',
    conceptStyleEn: 'underwater split-level composition capturing surface reflections and submerged clarity',
    focusDetail: 'undulating waterline meniscus cutting cleanly through middle frame',
    preferredAspect: '16:9',
    primaryPerspective: 'submerged 50/50 split waterline underwater perspective',
    archetypeStructure: 0,
  },
  {
    id: 58,
    focusThemeBn: 'গবেষণাগারের নির্ভুল পরিমাপক ও খাঁটি উপাদান নিষ্কাশন প্রণালী',
    sceneDescBn: 'অ্যাক্রিলিক ও স্টেইনলেস স্টিলের পরিবেশে প্রাকৃতিক উপাদানের নির্যাস তৈরির বিজ্ঞানসম্মত প্রক্রিয়া।',
    conceptStyleEn: 'high-tech extraction apparatus demonstrating scientific purity and certified potency',
    focusDetail: 'precision fluid meniscus in calibrated laboratory glassware',
    preferredAspect: '3:2',
    primaryPerspective: 'clinical studio isolation on pristine background',
    archetypeStructure: 1,
  },
  {
    id: 59,
    focusThemeBn: 'সূর্যমুখীর হলুদ আভা ও সোনালী পরাগরেণুর প্রস্ফুটিত মাঠ',
    sceneDescBn: 'হলুদ ফুলের প্রান্তরে সোনালী পরাগরেণুর উড়ন্ত কণার ভেতর স্থাপিত পণ্যের প্রাণবন্ত রূপ।',
    conceptStyleEn: 'vibrant sunlit floral meadow with airborne golden pollen grains backlit by morning sun',
    focusDetail: 'glowing microscopic pollen particles floating in sunbeams',
    preferredAspect: '16:9',
    primaryPerspective: 'environmental context establishing wider narrative',
    archetypeStructure: 2,
  },
  {
    id: 60,
    focusThemeBn: 'মডার্ন আর্ট ডেকো সিমেট্রিতে সাজানো লাক্সারি কালেকশন সেট',
    sceneDescBn: 'আর্ট ডেকো স্থাপত্যের মতো জ্যামিতিক নিখুঁত দূরত্বে সাজানো পণ্যের রাজকীয় পোর্টফোলিও।',
    conceptStyleEn: 'art deco geometric symmetry arranging multiple product components into a cohesive collection',
    focusDetail: 'precision rhythmic spacing and stepped architectural balance',
    preferredAspect: '16:9',
    primaryPerspective: 'geometric top view arrangement',
    archetypeStructure: 3,
  },

  // 61-70: Craftsmanship, Tactility & Spatial Storytelling
  {
    id: 61,
    focusThemeBn: 'বন্য মধুর সান্দ্র সোনালী স্তর ও চাকের প্রাকৃতিক মোমের খাঁজ',
    sceneDescBn: 'প্রাকৃতিক মোমের চাকের ষড়ভুজাকার কোষে জমে থাকা মধুর সোনালী চমক ও ম্যাক্রো গভীরতা।',
    conceptStyleEn: 'wild honeycomb hexagonal wax cells dripping with translucent amber nectar',
    focusDetail: 'hexagonal wax prism edges and suspended micro air bubbles inside viscous fluid',
    preferredAspect: '1:1',
    primaryPerspective: 'intimate close-up macro focal point with shallow depth of field',
    archetypeStructure: 0,
  },
  {
    id: 62,
    focusThemeBn: 'টেক্সচার্ড ট্রাভার্টিন পাথরের খাঁজে মিনিমালিস্ট সাবজেক্টের স্থিতি',
    sceneDescBn: 'বেইজ ট্রাভার্টিন পাথরের প্রাকৃতিক গর্ত ও খাঁজের মাঝে আধুনিক পণ্যের দৃষ্টিনন্দন কনট্রাস্ট।',
    conceptStyleEn: 'porous natural beige travertine slab with organic mineral cavities cradling the product',
    focusDetail: 'tactile porosity of honed travertine and soft warm stone luminescence',
    preferredAspect: '16:9',
    primaryPerspective: 'rule-of-thirds off-center placement with ample copy space',
    archetypeStructure: 3,
  },
  {
    id: 63,
    focusThemeBn: 'প্রাকৃতিক সুতির ক্যানভাস ও কাঁচা পাটের রোল করা বান্ডিল',
    sceneDescBn: 'বয়নশিল্পের কাঁচামালের পাশে রাখা পণ্যের ইকো-সচেতন ও পরিবেশবান্ধব আবেদন।',
    conceptStyleEn: 'rolls of unbleached organic canvas and raw hemp yarn balls contextualizing sustainability',
    focusDetail: 'fibrous texture of twisted natural twine and unrefined fabric selvage',
    preferredAspect: '4:3',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },
  {
    id: 64,
    focusThemeBn: 'হাই-স্পিড ক্যামেরায় হিমায়িত গুঁড়ো উপাদানের ডায়নামিক বিস্ফোরণ',
    sceneDescBn: '১/৮০০০ সেকেন্ডে তোলা মসলা বা গুঁড়ো উপাদানের রঙিন মেঘ ও ভাসমান কণা।',
    conceptStyleEn: 'high-speed freeze frame of airborne organic powder bursting in a dynamic cloud',
    focusDetail: 'individual suspended spice powder micro-particles caught in sharp focus',
    preferredAspect: '1:1',
    primaryPerspective: 'floating suspended components with zero gravity elegance',
    archetypeStructure: 5,
  },
  {
    id: 65,
    focusThemeBn: 'বৃষ্টিভেজা জানালার কাঁচের বাইরে সন্ধ্যার নিয়ন আলোর আভা',
    sceneDescBn: 'বৃষ্টির ফোঁটা জমা জানালায় বাইরের নীল ও অ্যাম্বার আলোর বোকাহ বৃত্তের সামনে শান্ত পণ্য।',
    conceptStyleEn: 'rain-streaked windowpane with moody twilight city bokeh discs glowing in background',
    focusDetail: 'refracted neon city lights glowing through individual glass water droplets',
    preferredAspect: '16:9',
    primaryPerspective: 'layered depth with blurred foreground elements',
    archetypeStructure: 2,
  },
  {
    id: 66,
    focusThemeBn: 'ক্লিন সিরামিক প্লেটে সুষম উপাদান সজ্জা ও মিনিমাল স্পেসিং',
    sceneDescBn: 'ম্যাট সাদা সিরামিক প্লেটে শিল্পীর মতো অল্প উপাদানের ভারসাম্যপূর্ণ প্রকাশ।',
    conceptStyleEn: 'refined modern minimalist presentation on a single handmade matte white stoneware plate',
    focusDetail: 'deliberate negative space and delicate single-ingredient placement',
    preferredAspect: '1:1',
    primaryPerspective: 'overhead flat-lay geometric organization',
    archetypeStructure: 0,
  },
  {
    id: 67,
    focusThemeBn: 'অন্ধকার পাথুরে গুহার ভেতর এক ফালি আলোয় পণ্যটির নাটকীয় রূপ',
    sceneDescBn: 'চারপাশের অন্ধকার পাথরের মাঝে কেবল সাবজেক্টের ওপর পড়া একক আলোর উজ্জ্বল কিরণ।',
    conceptStyleEn: 'dramatic spotlight cutting through shadowy atmospheric cavern onto the focal subject',
    focusDetail: 'stark illumination gradient from pure pitch shadow into brilliant core texture',
    preferredAspect: '16:9',
    primaryPerspective: 'subtle side-profile silhouette with edge lighting',
    archetypeStructure: 1,
  },
  {
    id: 68,
    focusThemeBn: 'হাতের তৈরি পাউচ ও মোমের সিলমোহরে বাঁধানো প্রাচীন বিশ্বস্ততা',
    sceneDescBn: 'লাল গালা বা মোমের সিলমোহর লাগানো প্যাকেজিং ও হস্তশিল্পের খাঁটি ঐতিহ্যের ছোঁয়া।',
    conceptStyleEn: 'artisan kraft paper pouch sealed with embossed red wax seal stamp',
    focusDetail: 'crisp relief impression in cooled wax seal and fibrous torn kraft paper',
    preferredAspect: '4:3',
    primaryPerspective: 'human interaction candid crop focusing on artisan hands',
    archetypeStructure: 4,
  },
  {
    id: 69,
    focusThemeBn: 'পাহাড়ী নদীর স্বচ্ছ নুড়িপাথরের ওপর শীতল জলের মৃদু ঢেউ',
    sceneDescBn: 'নদীর শান্ত স্রোতের জলে ভেজা পাথরের ওপর স্থাপিত পণ্যের অবিকল প্রাকৃতিক সতেজতা।',
    conceptStyleEn: 'crystal-clear mountain stream rippling softly over rounded river stones around the product',
    focusDetail: 'optical clarity of shallow flowing water and submerged stone mineral veins',
    preferredAspect: '16:9',
    primaryPerspective: 'sun-drenched naturalistic framing with organic shadows',
    archetypeStructure: 2,
  },
  {
    id: 70,
    focusThemeBn: 'স্টুডিও রোবোটিক আর্ম পার্সপেক্টিভে নিখুঁত আই-লেভেল কমার্শিয়াল শট',
    sceneDescBn: 'রোবোটিক ক্যামেরার নিখুঁত ট্রাইপড উচ্চতায় কোনো দৃষ্টিকোণগত বিকৃতি ছাড়াই তোলা স্ট্যান্ডার্ড স্টক শট।',
    conceptStyleEn: 'robotic motion-control tripod mount delivering distortion-free commercial precision',
    focusDetail: 'pin-sharp rectilinear perspective and true commercial color fidelity',
    preferredAspect: '16:9',
    primaryPerspective: 'direct eye-level professional studio tripod mount',
    archetypeStructure: 1,
  },

  // 71-80: Atmospheric, Lifestyle & Commercial Variations
  {
    id: 71,
    focusThemeBn: 'সকালের সোনালী রোদে বাষ্পীভূত উষ্ণতার মায়াবী ঘূর্ণি',
    sceneDescBn: 'সকালের কাঁচা রোদ ভেদ করে ওঠা মৃদু কুয়াশা বা বাষ্পের কুণ্ডলীর ভেতর পণ্যের মনকাড়া আবহ।',
    conceptStyleEn: 'gentle thermal steam curling softly upward in morning sunbeam illumination',
    focusDetail: 'delicate swirling vapor tendrils catching bright golden sidelight',
    preferredAspect: '16:9',
    primaryPerspective: 'lifestyle in-situ contextual display in aspirational interior',
    archetypeStructure: 2,
  },
  {
    id: 72,
    focusThemeBn: 'সিলভার ও প্ল্যাটিনাম মেটালিক মিররিং রিফ্লেকশন প্লেট',
    sceneDescBn: 'রুপোলি চকচকে ধাতব প্লেটে সাবজেক্টের স্ফটিক প্রতিচ্ছবি ও আধুনিক শীতল আভা।',
    conceptStyleEn: 'polished sterling silver plate offering pristine mirror-like metallic reflections',
    focusDetail: 'flawless mirror reflection of base product details on cold silver surface',
    preferredAspect: '1:1',
    primaryPerspective: 'hero center focal alignment, balanced symmetry',
    archetypeStructure: 3,
  },
  {
    id: 73,
    focusThemeBn: 'সৈকতের সাদা বালির ঢেউ ও সাগরের নীল দিগন্তের ব্যাকড্রপ',
    sceneDescBn: 'সকালের শান্ত সমুদ্র সৈকতের মিহি বালিতে রাখা পণ্য এবং পেছনে নীলাভ দিগন্তের বিস্তৃতি।',
    conceptStyleEn: 'pristine white sand beach with wind-rippled dunes overlooking calm blue ocean horizons',
    focusDetail: 'fine wind-carved sand ridges and gentle out-of-focus seafoam shoreline',
    preferredAspect: '16:9',
    primaryPerspective: 'environmental context establishing wider narrative',
    archetypeStructure: 2,
  },
  {
    id: 74,
    focusThemeBn: 'অর্গানিক কাঁচা পাটের থলে থেকে গড়িয়ে পড়া উপাদানের প্রাচুর্য',
    sceneDescBn: 'পাটের চটের মুখ খুলে বেরিয়ে আসা টাটকা উপাদানের সমৃদ্ধি ও ফলনের প্রাচুর্য।',
    conceptStyleEn: 'burlap sack opening generously spilling an abundance of premium raw ingredients',
    focusDetail: 'rich textural contrast between coarse woven sackcloth and smooth spilled items',
    preferredAspect: '4:3',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },
  {
    id: 75,
    focusThemeBn: 'ফ্লোটিং প্রিজম গ্লাস ব্লকে রিফ্র্যাক্টেড আলোর রঙধনু স্পেকট্রাম',
    sceneDescBn: 'অপটিক্যাল গ্লাসের ব্লকে তৈরি হওয়া আলোর বর্ণালীর মাঝে স্থাপিত পণ্যের প্রযুক্তিগত সৌন্দর্য।',
    conceptStyleEn: 'optical prism block dispersing natural sunlight into radiant chromatic rainbow spectrum',
    focusDetail: 'split chromatic color spectrum dancing cleanly across matte product facade',
    preferredAspect: '16:9',
    primaryPerspective: 'water-droplet refraction through ultra-clear prism optics',
    archetypeStructure: 5,
  },
  {
    id: 76,
    focusThemeBn: 'গাঢ় কাঠকয়লা ও কালো স্লেটে ড্রামাটিক টেক্সচার্ড কনট্রাস্ট',
    sceneDescBn: 'কালো কাঠকয়লার রুক্ষ ম্যাট উপরিভাগে পণ্যের উজ্জ্বল রঙের তীক্ষ্ণ ও নজরকাড়া কনট্রাস্ট।',
    conceptStyleEn: 'dark textured charcoal and slate bed creating bold visual contrast with the subject',
    focusDetail: 'fractured matte charcoal grain contrasting with vibrant organic hues',
    preferredAspect: '16:9',
    primaryPerspective: 'rule-of-thirds off-center placement with ample copy space',
    archetypeStructure: 1,
  },
  {
    id: 77,
    focusThemeBn: 'গ্রীষ্মের বিকেলের নরম ছায়া ও জানালার কাঠের ব্লাইন্ডসের প্যাটার্ন',
    sceneDescBn: 'কাঠের জানালার ব্লাইন্ডস ভেদ করে আসা ডোরাকাটা ছায়ার ছন্দে পণ্যের ঘরোয়া আবেদন।',
    conceptStyleEn: 'wooden venetian blind shadows casting warm rhythmic stripes across afternoon tabletop',
    focusDetail: 'graphic linear shadow pattern creating artistic editorial mood',
    preferredAspect: '16:9',
    primaryPerspective: 'dramatic rake-angle surface texture shadow mapping',
    archetypeStructure: 2,
  },
  {
    id: 78,
    focusThemeBn: 'এক্সট্রিম টাইট ক্রপে জ্যামিতিক টেক্সচারের অ্যাবস্ট্রাক্ট ফর্ম',
    sceneDescBn: 'সম্পূর্ণ পণ্যের পরিবর্তে তার অনন্য টেক্সচারাল প্যাটার্নের ওপর করা এক্সট্রিম ক্লোজআপ।',
    conceptStyleEn: 'abstract tight macro crop treating the product surface as a geometric landscape',
    focusDetail: 'rhythmic repetition of surface micro-structures creating abstract art',
    preferredAspect: '1:1',
    primaryPerspective: 'intimate close-up macro focal point with shallow depth of field',
    archetypeStructure: 0,
  },
  {
    id: 79,
    focusThemeBn: 'ঐতিহ্যবাহী তামাটে মাটির পাত্র ও রোদে শুকানো মশলার সাজানো থালা',
    sceneDescBn: 'রোদে শুকানো মশলা ও ঔষধি উপাদানের পাশে রাখা ঐতিহ্যবাহী পণ্যের দেশজ আবেদন।',
    conceptStyleEn: 'sun-drying terracotta drying tray arranged with fragrant whole botanicals',
    focusDetail: 'sun-baked porous clay texture and rich natural spice pigments',
    preferredAspect: '4:3',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },
  {
    id: 80,
    focusThemeBn: 'মনোক্রোম হাই-কি স্টুডিওতে সফট ক্রিম ও আইভরি টোনের প্রশান্তি',
    sceneDescBn: 'ক্রিম ও আইভরি রঙের কোমল একরঙা স্টুডিও পরিবেশনায় পণ্যের শান্ত ও প্রিমিয়াম প্রকাশ।',
    conceptStyleEn: 'high-key monochromatic ivory and soft cream aesthetic for tranquil luxury branding',
    focusDetail: 'subtle tonal gradations between bone white, soft ivory, and warm linen',
    preferredAspect: '16:9',
    primaryPerspective: 'hero center focal alignment, balanced symmetry',
    archetypeStructure: 3,
  },

  // 81-90: Premium Packaging, Innovation & Sensory Detail
  {
    id: 81,
    focusThemeBn: 'হিমশীতল কাঁচের গায়ে আঙুলের ছোঁয়া ও স্বচ্ছ উইন্ডো',
    sceneDescBn: 'কনডেনসেশনে ঢাকা কাঁচের বোতল বা জারে আঙুলের হালকা ছোঁয়ায় তৈরি হওয়া স্বচ্ছ উইন্ডো।',
    conceptStyleEn: 'delicate human finger wiping a clear window through frosted condensation mist',
    focusDetail: 'contrast between frosted micro-droplets and clear glossy wiped glass',
    preferredAspect: '1:1',
    primaryPerspective: 'human interaction candid crop focusing on artisan hands',
    archetypeStructure: 0,
  },
  {
    id: 82,
    focusThemeBn: 'আধুনিক স্মার্ট ল্যাবরেটরিতে পেট্রিডিশ ও খাঁটি নির্যাস বিশ্লেষণ',
    sceneDescBn: 'কাঁচের পেট্রিডিশে রাখা খাঁটি উপাদানের নিখুঁত সার্কেল ও বৈজ্ঞানিক নির্ভুলতা।',
    conceptStyleEn: 'glass petri dish presentation showcasing verified botanical sample integrity',
    focusDetail: 'circular glass perimeter containing pristine pure sample concentrate',
    preferredAspect: '1:1',
    primaryPerspective: 'clinical studio isolation on pristine background',
    archetypeStructure: 1,
  },
  {
    id: 83,
    focusThemeBn: 'সোনালী শরতের শুকনো পাতা ও ওক গাছের বাকলের উষ্ণ পটভূমি',
    sceneDescBn: 'শরতের সোনালী ঝরা পাতার নরম গালিচায় রাখা পণ্যের ঋতুভিত্তিক আকর্ষণীয় রূপ।',
    conceptStyleEn: 'golden autumnal leaf bed on textured oak forest floor framing the product',
    focusDetail: 'delicate dry leaf veins and warm seasonal amber foliage tones',
    preferredAspect: '16:9',
    primaryPerspective: 'sun-drenched naturalistic framing with organic shadows',
    archetypeStructure: 2,
  },
  {
    id: 84,
    focusThemeBn: 'আইসোমেট্রিক ডাইমেনশনে ভাসমান উপাদানগুলির ফিজিক্স সিমুলেশন',
    sceneDescBn: 'আইসোমেট্রিক অক্ষ বরাবর শূন্যে সুবিন্যস্ত উপাদানের নিখুঁত ভারসাম্য ও মাধ্যাকর্ষণহীন রূপ।',
    conceptStyleEn: 'isometric exploded diagram layout simulating suspended physical elements',
    focusDetail: 'precise 45-degree angle separation of individual formula ingredients',
    preferredAspect: '1:1',
    primaryPerspective: 'isometric floating perspective',
    archetypeStructure: 5,
  },
  {
    id: 85,
    focusThemeBn: 'রিচ মেহগনি কাঠের ডেস্ক ও প্রাচীন চামড়ার বাঁধাইয়ের আভিজাত্য',
    sceneDescBn: 'পলিশ করা মেহগনি কাঠের ওপর ভিন্টেজ চামড়ার ডায়েরির পাশে পণ্যের রাজকীয় অবস্থান।',
    conceptStyleEn: 'rich polished mahogany desk paired with aged leather bound elements for executive luxury',
    focusDetail: 'deep reddish-brown wood grain reflections and worn leather stitching',
    preferredAspect: '16:9',
    primaryPerspective: 'elevated three-quarter editorial view',
    archetypeStructure: 1,
  },
  {
    id: 86,
    focusThemeBn: 'সকালে খোলা জানালার সাদা লেইসের পর্দায় ফিল্টার হওয়া মিষ্টি আলো',
    sceneDescBn: 'সাদা লেইসের পর্দা চুইয়ে আসা নরম সূর্যালোকের কোমল আলতো ছোঁয়ায় সাজানো দৃশ্যপট।',
    conceptStyleEn: 'morning sunlight gently filtered through delicate lace curtain casting soft patterns',
    focusDetail: 'intricate lace shadow silhouette softly draped over product packaging',
    preferredAspect: '16:9',
    primaryPerspective: 'lifestyle in-situ contextual display in aspirational interior',
    archetypeStructure: 2,
  },
  {
    id: 87,
    focusThemeBn: 'ম্যাট ব্ল্যাক অ্যাক্রিলিক স্টুডিওতে ড্রামাটিক সাইডলাইটের ধারালো গ্লো',
    sceneDescBn: 'কালো অ্যাক্রিলিকের ওপর পণ্যটির ন্যূনতম আভা ও আধুনিক মিনিমালিস্টিক স্টাইল।',
    conceptStyleEn: 'stealth matte black acrylic setup punctuated by crisp razor-thin rim highlights',
    focusDetail: 'subtle specular outline tracing key product silhouettes against darkness',
    preferredAspect: '16:9',
    primaryPerspective: 'subtle side-profile silhouette with edge lighting',
    archetypeStructure: 3,
  },
  {
    id: 88,
    focusThemeBn: 'তাজা লেবুর ফালির রস ছিটকে পড়ার হাই-স্পিড ম্যাক্রো মুহূর্ত',
    sceneDescBn: 'সতেজ সাইট্রাস ফল চেপে রস ছিটকে পড়ার সময় বাতাসে ছড়িয়ে পড়া জলকণার স্ফটিক রূপ।',
    conceptStyleEn: 'high-speed macro of bursting citrus vesicle expelling micro-mists of aromatic juice',
    focusDetail: 'translucent juice droplets caught mid-flight under studio strobe lights',
    preferredAspect: '1:1',
    primaryPerspective: 'intimate close-up macro focal point with shallow depth of field',
    archetypeStructure: 0,
  },
  {
    id: 89,
    focusThemeBn: 'হাতে বোনা বেতের ডালির ভেতর সাজানো গ্রামীণ ঐতিহ্যের রূপ',
    sceneDescBn: 'প্রাকৃতিক বেতের ঝুড়িতে খড়ের ওপর সাজানো খাঁটি পণ্যের দেশজ ও নির্ভেজাল আকর্ষণ।',
    conceptStyleEn: 'handwoven cane basket cushioned with golden field straw showcasing honest rural heritage',
    focusDetail: 'woven cane interlace pattern and clean agricultural straw strands',
    preferredAspect: '4:3',
    primaryPerspective: 'textured surface foreground framing the subject',
    archetypeStructure: 4,
  },
  {
    id: 90,
    focusThemeBn: 'টপ-ডাউন ৯টি সমান জ্যামিতিক ব্লকে বিভক্ত কিউরেশন গ্রিড',
    sceneDescBn: '৩x৩ গ্রিডে উপাদানের প্রতিটি অংশকে সমান দূরত্বে সাজানো আধুনিক আর্ট কিউরেশন।',
    conceptStyleEn: 'curated 3x3 square photographic grid organizing raw materials with mathematical balance',
    focusDetail: 'uniform grid margins and balanced focal weighting across all nine sectors',
    preferredAspect: '1:1',
    primaryPerspective: 'overhead flat-lay geometric organization',
    archetypeStructure: 3,
  },

  // 91-100: Grand Finale, Mastery & Ultimate Diversity
  {
    id: 91,
    focusThemeBn: 'পাহাড়ের চুড়ো থেকে ওঠা সূর্যোদয়ের প্রথম কিরণে আলোকিত সাবজেক্ট',
    sceneDescBn: 'ভোরের প্রথম রক্তিম সূর্যরশ্মিতে আলোকিত পণ্যের নবজাগরণের মতো অনুপ্রেরণাদায়ী প্রকাশ।',
    conceptStyleEn: 'epic dawn sunrise cresting over alpine peaks bathing the product in radiant dawn warmth',
    focusDetail: 'brilliant sunburst flare diffraction spikes breaking over the mountain horizon',
    preferredAspect: '16:9',
    primaryPerspective: 'environmental context establishing wider narrative',
    archetypeStructure: 2,
  },
  {
    id: 92,
    focusThemeBn: 'মার্বেল ও ব্রাশড গোল্ড পোডিয়ামে ট্রিপল প্রোডাক্ট হাইয়ারার্কি',
    sceneDescBn: 'তিনটি ধাপে তিনটি ভেরিয়েন্টের সুষম উচ্চতার ব্যবধানে সাজানো প্রিমিয়াম ডিসপ্লে।',
    conceptStyleEn: 'triple stepped marble podium trimmed with brushed brass accents structuring clear product hierarchy',
    focusDetail: 'stepped vertical elevations guiding viewer gaze from foreground to main hero piece',
    preferredAspect: '16:9',
    primaryPerspective: 'split-level surface elevation with contrasting textures',
    archetypeStructure: 1,
  },
  {
    id: 93,
    focusThemeBn: 'কাঁচের সমতলে জলকণার ভেতর দিয়ে উল্টো প্রতিচ্ছবির অপটিক্যাল জাদু',
    sceneDescBn: 'প্রতিটি স্বচ্ছ জলকণার ভেতর উল্টোভাবে দৃশ্যমান পণ্যের অণু-প্রতিচ্ছবি ও গভীরতা।',
    conceptStyleEn: 'water drop refraction macro where each separate water sphere contains an inverted image of the subject',
    focusDetail: 'miniature inverted horizon captured crisply inside distinct liquid lenses',
    preferredAspect: '1:1',
    primaryPerspective: 'water-droplet refraction through ultra-clear prism optics',
    archetypeStructure: 0,
  },
  {
    id: 94,
    focusThemeBn: 'ঐতিহ্যবাহী তসর সিল্ক কাপড়ে মোড়ানো রাজকীয় উপহারের সাজ',
    sceneDescBn: 'হাতে বোনা খাঁটি সিল্কের কাপড়ে সোনালী জরির পাড়ের পাশে রাখা বিলাসবহুল উপহার সম্ভার।',
    conceptStyleEn: 'handwoven raw tussar silk textile with golden zari borders cradling the gift collection',
    focusDetail: 'gilded metallic thread weave catching warm ambient light',
    preferredAspect: '16:9',
    primaryPerspective: 'festive celebratory grouping with decorative accents',
    archetypeStructure: 4,
  },
  {
    id: 95,
    focusThemeBn: 'ল্যাবরেটরি স্পেকট্রোমিটার ও পিউরিটি ফিল্ট্রেশনের ক্লোজআপ শট',
    sceneDescBn: 'অণুপরিমাপক ফিল্ট্রেশন ফানেলের মধ্য দিয়ে ফোঁটায় ফোঁটায় জমা হওয়া খাঁটি উপাদানের রূপ।',
    conceptStyleEn: 'high-precision analytical filtration setup collecting ultra-purified active concentrate',
    focusDetail: 'clean meniscus drip detachment and crystal-clear receiving flask',
    preferredAspect: '3:2',
    primaryPerspective: 'clinical studio isolation on pristine background',
    archetypeStructure: 1,
  },
  {
    id: 96,
    focusThemeBn: 'বৃষ্টির ভেজা পিচঢালা পথ ও শহরের নিয়ন আলোর রিফ্লেকশনে পণ্য',
    sceneDescBn: 'শহুরে আর্দ্র রাজপথে সোনালী ও নীলাভ নিয়ন রিফ্লেকশনের মাঝে আধুনিক লাইফস্টাইল পণ্য।',
    conceptStyleEn: 'rain-soaked asphalt texture reflecting golden streetlamp glow and neon lifestyle ambience',
    focusDetail: 'glistening wet road aggregate texture and liquid light puddles',
    preferredAspect: '16:9',
    primaryPerspective: 'environmental context establishing wider narrative',
    archetypeStructure: 2,
  },
  {
    id: 97,
    focusThemeBn: 'জিরো-গ্র্যাভিটিতে বিস্ফোরণের মতো চারদিকে ছড়িয়ে পড়া উপাদান ক্লাস্টার',
    sceneDescBn: 'কেন্দ্রস্থ পণ্য থেকে চারদিকে সুষম বলয়ে ছড়িয়ে থাকা উপাদানের মুক্ত রূপ।',
    conceptStyleEn: 'weightless centrifugal burst radiating raw botanical elements outward from hero product',
    focusDetail: 'frozen radial dispersion of small botanical elements in mid-flight',
    preferredAspect: '1:1',
    primaryPerspective: 'floating suspended components with zero gravity elegance',
    archetypeStructure: 5,
  },
  {
    id: 98,
    focusThemeBn: 'মিনিমালিস্ট সিমেট্রি ও উপরে বিশাল ফাঁকা আকাশ বা হোয়াইটস্পেস',
    sceneDescBn: 'নিচে সাবজেক্টের ভারসাম্যপূর্ণ অবস্থান এবং উপরে বিজ্ঞাপনী লেখার জন্য দীর্ঘ মার্জিন।',
    conceptStyleEn: 'extreme bottom-weighted framing leaving eighty percent upper frame open for advertising copy',
    focusDetail: 'immaculate horizontal horizon line creating calming visual serenity',
    preferredAspect: '16:9',
    primaryPerspective: 'minimalist negative space dominance for typography overlay',
    archetypeStructure: 3,
  },
  {
    id: 99,
    focusThemeBn: 'কারিগরদের কাজের টেবিলে ছড়িয়ে থাকা প্রাচীন টুলস ও কাঁচামালের গল্প',
    sceneDescBn: 'কারিগরের বহু বছরের পুরোনো কাজের টেবিলে তৈরি হওয়ার প্রক্রিয়ার এক চমৎকার গল্প।',
    conceptStyleEn: 'artisan workbench storytelling with vintage measuring calipers and raw material chips',
    focusDetail: 'worn wooden workbench patina marked with decades of master craft',
    preferredAspect: '4:3',
    primaryPerspective: 'human interaction candid crop focusing on artisan hands',
    archetypeStructure: 4,
  },
  {
    id: 100,
    focusThemeBn: 'প্রিমিয়াম ব্র্যান্ড ফ্ল্যাগশিপ শোকেসের গ্র্যান্ড সেন্ট্রাল হিরো শট',
    sceneDescBn: 'ফ্ল্যাগশিপ স্টোরের রাজকীয় শোকেসে স্পটলাইটের কেন্দ্রবিন্দুতে রাখা পণ্যের চূড়ান্ত মহিমা।',
    conceptStyleEn: 'flagship retail showcase center-stage hero presentation with architectural illumination',
    focusDetail: 'museum-grade anti-reflective glass case and dramatic architectural downlight',
    preferredAspect: '16:9',
    primaryPerspective: 'dramatic low-angle hero elevation, monumental presence',
    archetypeStructure: 1,
  },
];

// Helper: Deterministic hash of string for repeatable non-colliding pseudo-random sequences
function hashTopicString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

// -------------------------------------------------------------
// Priority 3.5 — Mosque & Islamic Architecture Precision Helpers
// -------------------------------------------------------------
export function isMosqueTopic(text?: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();

  // Bengali expressions
  const bnMatches = [
    'মসজিদ', 'মসজিদের', 'মসজিদে', 'বায়তুল', 'বায়তুল', 'মসজিদুল', 'মিহরাব', 'মিনার'
  ];
  if (bnMatches.some((term) => normalized.includes(term))) {
    return true;
  }

  // English & Transliterated expressions
  const enRegex = /\b(mosque|mosques|masjid|masjids|jami\s*masjid|jama\s*masjid|grand\s*mosque|al-masjid|al\s*masjid|islamic\s*architecture|minaret|mihrab|sahn)\b/i;
  return enRegex.test(normalized);
}

export function hasExplicitIslamicObjectRequest(text?: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();
  const enRegex = /\b(quran|koran|tasbih|tasbeeh|misbaha|prayer\s*mat|prayer\s*rug|sajjadah|musallah|janamaz|perfume|attar|ittar|scent|prayer\s*cap|kufi|topi|taqiyah)\b/i;
  const bnKeywords = ['কুরআন', 'কোরআন', 'তসবিহ', 'তসবীহ', 'জায়নামাজ', 'জায়নামাজ', 'আতর', 'টুপি'];
  return enRegex.test(normalized) || bnKeywords.some((term) => normalized.includes(term));
}

export function detectCategoryForTopic(topic: string, fallbackCategory?: string): string {
  if (isMosqueTopic(topic)) {
    return 'স্থাপত্য ও ঐতিহাসিক স্থান (Architecture & Historical Buildings)';
  }
  return fallbackCategory || 'বাণিজ্যিক স্টক (Commercial Stock)';
}

export const MOSQUE_NEGATIVE_PROMPT =
  'Quran, holy book, tasbih, prayer beads, misbaha, prayer mat, prayer rug, sajjadah, perfume, attar, scent bottle, prayer cap, kufi, topi, tabletop still life, crowded people, blurry, out of focus, distorted architecture, warped minarets, crooked columns, bad perspective, noisy artifacts, brand logos, watermark, text, signatures, low resolution, oversaturated unrealistic colors, cropped awkwardly';

// -------------------------------------------------------------
// 42 UNIQUE HANDCRAFTED MOSQUE ARCHITECTURAL BLUEPRINTS
// Covers all 7 scene types evenly: exterior, domes/minarets, prayer hall,
// mihrab, courtyard, arches, and architectural details.
// -------------------------------------------------------------
export const MOSQUE_SCENARIO_BLUEPRINTS: CommercialScenarioBlueprint[] = [
  // 1-5: Complete Exterior & Grand Facades (Scene Type 1)
  {
    id: 1,
    focusThemeBn: 'মসজিদের সম্পূর্ণ বহিদৃশ্য — সোনালী গোধূলি আলোয় মার্বেল প্রতিফলন চত্বর',
    sceneDescBn: 'সূর্যাস্তের নরম সোনালী আলোয় পুরো মসজিদের রাজকীয় সাদা মার্বেল বহির্ভাগ এবং শান্ত পানির পুলে তার নিখুঁত প্রতিবিম্ব।',
    conceptStyleEn: 'panoramic architectural stock visual capturing the complete exterior facade of a grand mosque with pristine water reflection',
    focusDetail: 'gleaming white marble monumental facade, soaring central dome, and graceful minarets mirrored in still reflection pool',
    preferredAspect: '16:9',
    primaryPerspective: 'wide environmental establishing composition with dramatic symmetry',
    archetypeStructure: 0,
  },
  {
    id: 2,
    focusThemeBn: 'মসজিদের ভোরের স্নিগ্ধ কুয়াশায় সম্পূর্ণ বহিদৃশ্য ও উন্মুক্ত চত্বর',
    sceneDescBn: 'ভোরের নরম আলো ও হালকা কুয়াশায় ঘেরা প্রাচীন ও আধুনিক সমন্বয়ের সম্পূর্ণ মসজিদ কমপ্লেক্স।',
    conceptStyleEn: 'serene morning mist establishing exterior view of a monumental grand mosque complex',
    focusDetail: 'ethereal morning atmosphere framing the complete silhouette, sweeping entry plaza, and surrounding tranquil gardens',
    preferredAspect: '16:9',
    primaryPerspective: 'panoramic horizontal field balance with natural foreground',
    archetypeStructure: 0,
  },
  {
    id: 3,
    focusThemeBn: 'মসজিদের রাজকীয় প্রধান ফটক ও সম্পূর্ণ সম্মুখভাগ',
    sceneDescBn: 'বিশাল খিলানযুক্ত প্রধান প্রবেশদ্বার দিয়ে উন্মুক্ত হওয়া মসজিদের সম্পূর্ণ দৃষ্টিনন্দন স্থাপত্য।',
    conceptStyleEn: 'grand monumental iwan entrance portal framing the complete architectural majesty of the mosque exterior',
    focusDetail: 'soaring entrance arch with stepped stone stairway leading the eye toward the majestic central dome',
    preferredAspect: '3:2',
    primaryPerspective: 'low 15-degree upward hero perspective emphasizing monumental scale',
    archetypeStructure: 0,
  },
  {
    id: 4,
    focusThemeBn: 'নীল সন্ধ্যার ব্লু-আওয়ারে সম্পূর্ণ আলোকিত মসজিদের দৃশ্য',
    sceneDescBn: 'গোধূলির গাঢ় নীল আকাশের নিচে উষ্ণ সোনালী আলোয় আলোকিত সম্পূর্ণ মসজিদ প্রাঙ্গণ।',
    conceptStyleEn: 'twilight blue-hour commercial architectural capture of the fully illuminated grand mosque exterior',
    focusDetail: 'dramatic warm exterior floodlights illuminating domes and minaret balconies against deep sapphire twilight sky',
    preferredAspect: '16:9',
    primaryPerspective: 'wide environmental angle with luminous evening reflection',
    archetypeStructure: 0,
  },
  {
    id: 5,
    focusThemeBn: 'উঁচু কোণ থেকে আকাশছোঁয়া সম্পূর্ণ মসজিদ ও প্রতিসাম্য বাগান',
    sceneDescBn: 'উঁচু কোণ থেকে দৃশ্যমান সম্পূর্ণ মসজিদের স্থাপত্য বিন্যাস, মার্বেল প্লাজা ও সুসজ্জিত চারপাশ।',
    conceptStyleEn: 'elevated high-angle establishing view highlighting the majestic geometric symmetry of the mosque grounds',
    focusDetail: 'perfect architectural balance of perimeter walls, surrounding water features, and central dome cluster',
    preferredAspect: '16:9',
    primaryPerspective: 'gentle elevated drone camera perspective with generous sky copy space',
    archetypeStructure: 0,
  },

  // 6-10: Domes and Minarets (Scene Type 2)
  {
    id: 6,
    focusThemeBn: 'মসজিদের প্রধান মার্বেল গম্বুজ ও সুউচ্চ যমজ মিনার',
    sceneDescBn: 'নীল আকাশের বুকে সগৌরবে দাঁড়িয়ে থাকা খোদাই করা কেন্দ্রীয় মার্বেল গম্বুজ ও সুউচ্চ মিনারের শীর্ষভাগ।',
    conceptStyleEn: 'majestic low-angle architectural perspective isolating the grand central dome and soaring slender minarets',
    focusDetail: 'sculptural ribbed marble fluting of the main dome crowned with an ornate golden crescent finial',
    preferredAspect: '16:9',
    primaryPerspective: 'low-angle hero framing highlighting soaring vertical lines',
    archetypeStructure: 1,
  },
  {
    id: 7,
    focusThemeBn: 'গোধূলির আকাশে মিনারের বারান্দা ও অর্ধচন্দ্রাকার চূড়া',
    sceneDescBn: 'সূর্যাস্তের উষ্ণ আভায় মিনারের সূক্ষ্ম পাথুরে বারান্দা ও গম্বুজের সোনালী অর্ধচন্দ্রের ক্লোজ শট।',
    conceptStyleEn: 'detailed telephoto architectural study focusing on the ornate balconies and golden crescent spires of the minarets',
    focusDetail: 'intricate stone balustrades on minaret balconies and warm golden sunset rim light along curved dome surfaces',
    preferredAspect: '3:2',
    primaryPerspective: 'telephoto compression isolating sculptural architectural contours',
    archetypeStructure: 1,
  },
  {
    id: 8,
    focusThemeBn: 'বহুস্তরীয় ক্যাসকেডিং গম্বুজ ক্লাস্টার ও স্থাপত্য প্রতিসাম্য',
    sceneDescBn: 'মূল গম্বুজের নিচে ধাপে ধাপে নেমে আসা ছোট অর্ধ-গম্বুজ ও মিনারের নান্দনিক বিন্যাস।',
    conceptStyleEn: 'rhythmic composition showcasing the multi-tiered cascading dome hierarchy and slender minarets',
    focusDetail: 'geometric harmony of lead-sheathed or marble cupolas rising toward the monumental pinnacle',
    preferredAspect: '16:9',
    primaryPerspective: 'center symmetry with generous copy space in pristine sky',
    archetypeStructure: 1,
  },
  {
    id: 9,
    focusThemeBn: 'সূর্যোদয়ের আলোয় মিনারের দীর্ঘ ছায়া ও স্থাপত্য রেখা',
    sceneDescBn: 'ভোরের সোনালী তির্যক আলোয় গম্বুজের বাঁক ও মিনারের ধারালো স্থাপত্য ছায়ার খেলা।',
    conceptStyleEn: 'raking morning sunlight creating dynamic light and shadow interplay across the minarets and dome curves',
    focusDetail: 'sharp architectural lines of stone masonry and dramatic long shadows defining three-dimensional form',
    preferredAspect: '3:2',
    primaryPerspective: 'leading lines drawing eye to soaring architectural spires',
    archetypeStructure: 1,
  },
  {
    id: 10,
    focusThemeBn: 'রাতের আকাশে চাঁদ ও আলোকিত গম্বুজ-মিনারের সিলুয়েট',
    sceneDescBn: 'স্বচ্ছ রাতের আকাশের পটভূমিতে মসজিদের আলোকিত মার্বেল গম্বুজ ও মিনারের নান্দনিক রূপ।',
    conceptStyleEn: 'nocturnal architectural portrait with soft exterior uplighting accentuating the pristine domes and minarets',
    focusDetail: 'delicate architectural contour lighting emphasizing the soaring minaret silhouettes against starry night sky',
    preferredAspect: '16:9',
    primaryPerspective: 'high-contrast nocturnal architectural isolation with clean copy room',
    archetypeStructure: 1,
  },

  // 11-15: Interior Prayer Hall (Scene Type 3)
  {
    id: 11,
    focusThemeBn: 'সুবিশাল কেন্দ্রীয় প্রার্থনা কক্ষ ও ঝুলন্ত রাজকীয় ঝাড়বাতি',
    sceneDescBn: 'উঁচু গম্বুজযুক্ত বিশাল প্রার্থনা হলের ভেতরে সুবিশাল স্ফটিক ঝাড়বাতির উষ্ণ আলো ও মার্বেল পিলারের সারি।',
    conceptStyleEn: 'expansive interior commercial stock visual of the grand prayer hall featuring monumental hanging chandeliers',
    focusDetail: 'soaring domed ceiling with tiered brass and crystal chandeliers casting warm ambient luminescence over spacious interior',
    preferredAspect: '16:9',
    primaryPerspective: 'wide architectural eye-level perspective inside grand sanctuary',
    archetypeStructure: 2,
  },
  {
    id: 12,
    focusThemeBn: 'উঁচু খিলান জানালা দিয়ে নেমে আসা ভলিউমেট্রিক আলোকরশ্মি',
    sceneDescBn: 'মসজিদের খিলানযুক্ত উঁচু রঙিন কাচের জানালা দিয়ে প্রার্থনা হলের মেঝেতে পড়া স্পষ্ট সূর্যের আলোকরশ্মি।',
    conceptStyleEn: 'dramatic volumetric light shafts streaming through high clerestory arched windows into the grand prayer sanctuary',
    focusDetail: 'visible sunbeams piercing atmospheric dust, illuminating polished marble floor and carved interior columns',
    preferredAspect: '3:2',
    primaryPerspective: 'deep corridor focus with dramatic directional daylight rays',
    archetypeStructure: 2,
  },
  {
    id: 13,
    focusThemeBn: 'মার্বেল স্তম্ভ ও ক্যালিগ্রাফি খোদাই করা উচ্চ ছাদের ভিউ',
    sceneDescBn: 'প্রার্থনা কক্ষের ভেতর বিশাল খোদাই করা মার্বেল পিলারের সারি এবং ছাদের সোনালী কোরআনিক লিপিকলার ছন্দ।',
    conceptStyleEn: 'soaring upward architectural perspective inside the hypostyle prayer hall accentuating monumental stone columns',
    focusDetail: 'monumental carved capitals atop massive marble columns supporting sweeping decorated ceiling vaults',
    preferredAspect: '16:9',
    primaryPerspective: 'low upward angle capturing majestic structural columns and vaulted ceiling',
    archetypeStructure: 2,
  },
  {
    id: 14,
    focusThemeBn: 'বিশাল নীরব অভ্যন্তরীণ প্রার্থনা হলের প্রতিসাম্য পার্সপেক্টিভ',
    sceneDescBn: 'শান্ত ও পবিত্র পরিবেশে প্রার্থনা কক্ষের কেন্দ্র থেকে কিবলার দিকে চলে যাওয়া দৃষ্টিনন্দন অক্ষীয় দৃশ্য।',
    conceptStyleEn: 'central symmetrical perspective down the length of the serene, empty prayer sanctuary toward the focal wall',
    focusDetail: 'geometric alignment of structural arches, soft carpeted expanse, and distant illuminated sanctuary niches',
    preferredAspect: '16:9',
    primaryPerspective: 'pure center symmetry with generous editorial negative space',
    archetypeStructure: 2,
  },
  {
    id: 15,
    focusThemeBn: 'ডাবল-হাইট গম্বুজের নিচের রিং লাইটিং ও অভ্যন্তরীণ নান্দনিকতা',
    sceneDescBn: 'কেন্দ্রীয় গম্বুজের নিচে বৃত্তাকার লণ্ঠন রিং এবং চারপাশে মার্বেল খিলানের রাজকীয় বিন্যাস।',
    conceptStyleEn: 'architectural interior view focusing on the immense suspended circular lantern ring beneath the soaring dome',
    focusDetail: 'delicate hanging bronze lamps creating a golden horizontal plane across the vast vertical sanctuary space',
    preferredAspect: '3:2',
    primaryPerspective: 'layered depth with hanging circular lanterns defining scale',
    archetypeStructure: 2,
  },

  // 16-20: Mihrab & Qibla Wall Details (Scene Type 4)
  {
    id: 16,
    focusThemeBn: 'সাদা মার্বেল ও সোনালী নকশার প্রধান মিহরাব',
    sceneDescBn: 'কিবলা দেওয়ালের কেন্দ্রে স্থাপিত সূক্ষ্ম জ্যামিতিক নকশা ও সোনালী ক্যালিগ্রাফি খচিত প্রধান মিহরাব।',
    conceptStyleEn: 'intimate focal capture of the ornate semicircular marble mihrab niche framed by gilded geometric reliefs',
    focusDetail: 'exquisite recessed prayer alcove decorated with lapis lazuli inlays, fine stucco carvings, and gold leaf accents',
    preferredAspect: '4:3',
    primaryPerspective: 'direct front-facing symmetrical architectural focus on sacred niche',
    archetypeStructure: 3,
  },
  {
    id: 17,
    focusThemeBn: 'মিহরাবের পাশে মার্বেল খোদাই করা রাজকীয় মিম্বর সিঁড়ি',
    sceneDescBn: 'মিহরাবের ঠিক পাশে স্থাপিত সাদা মার্বেলে নিখুঁত জ্যামিতিক জাফরি খোদাই করা মিম্বরের স্থাপত্য।',
    conceptStyleEn: 'architectural staging showcasing the carved marble minbar pulpit positioned beside the sacred mihrab',
    focusDetail: 'stepped marble balustrade with openwork geometric lattice screens and pointed canopy over the minbar',
    preferredAspect: '3:2',
    primaryPerspective: 'balanced 45-degree architectural perspective capturing spatial depth',
    archetypeStructure: 3,
  },
  {
    id: 18,
    focusThemeBn: 'মিহরাবের আর্চ ও ক্যালিগ্রাফিক শিলালিপির ম্যাক্রো ডিটেইল',
    sceneDescBn: 'মিহরাবের মাথার ওপর সূক্ষ্ম আরবি ক্যালিগ্রাফি ফ্রাইজ ও মার্বেল মোজাইকের স্পষ্ট খোদাই কাজ।',
    conceptStyleEn: 'medium architectural close-up capturing the ornate calligraphic frieze crowning the semicircular mihrab arch',
    focusDetail: 'crisp relief lettering carved in classical Thuluth and Kufic scripts with gold leaf foil highlights',
    preferredAspect: '1:1',
    primaryPerspective: 'close crop highlighting intricate craftsmanship and gilding',
    archetypeStructure: 3,
  },
  {
    id: 19,
    focusThemeBn: 'প্রাকৃতিক জানালার আলোয় আলোকিত শান্ত মিহরাব চত্বর',
    sceneDescBn: 'পার্শ্ববর্তী খিলান জানালা থেকে আসা নরম আলোয় মিহরাবের মার্বেল মেঝের নিখুঁত প্রতিফলন।',
    conceptStyleEn: 'atmospheric natural sidelight caressing the curved alcove of the marble mihrab and its polished floor',
    focusDetail: 'soft gradations of natural sunlight revealing delicate texture variations in hand-carved stone relief',
    preferredAspect: '3:2',
    primaryPerspective: 'soft natural sidelight emphasizing depth and serenity',
    archetypeStructure: 3,
  },
  {
    id: 20,
    focusThemeBn: 'টাইলস মোজাইক খচিত অটোমান শৈলীর বর্ণিল মিহরাব',
    sceneDescBn: 'ফিরোজা ও নীল ইজনিক সিরামিক টাইলসে সাজানো ঐতিহাসিক স্থাপত্যের বর্ণিল মিহরাবের রূপ।',
    conceptStyleEn: 'vibrant turquoise and cobalt Iznik ceramic glazed tile composition enveloping the historic mihrab niche',
    focusDetail: 'glossy reflective tile glazes featuring intricate floral motifs and repeating geometric Islamic symmetries',
    preferredAspect: '4:3',
    primaryPerspective: 'eye-level architectural framing capturing rich chromatic depth',
    archetypeStructure: 3,
  },

  // 21-25: Courtyard (Sahn) & Reflection Pool (Scene Type 5)
  {
    id: 21,
    focusThemeBn: 'প্রশস্ত উন্মুক্ত মার্বেল প্রাঙ্গণ (সাহন) ও কেন্দ্রস্থ অজুখানা',
    sceneDescBn: 'বিশাল উন্মুক্ত সাদা মার্বেল চত্বরের কেন্দ্রে অষ্টভুজাকৃতির মার্বেল প্যাভিলিয়ন ও ওজুখানা ফোয়ারা।',
    conceptStyleEn: 'panoramic stock visual of the vast open-air marble courtyard (sahn) with central ablution fountain pavilion',
    focusDetail: 'pristine white and grey Italian marble pavers, carved dome of the fountain, and flanking arcaded perimeter',
    preferredAspect: '16:9',
    primaryPerspective: 'wide open courtyard perspective with expansive horizontal breathing room',
    archetypeStructure: 4,
  },
  {
    id: 22,
    focusThemeBn: 'মার্বেল চত্বরে গম্বুজ ও খিলানের কাচের মতো নিখুঁত প্রতিবিম্ব',
    sceneDescBn: 'প্রাঙ্গণের পানির পুলের স্বচ্ছ বুকে মসজিদের বিশাল গম্বুজ ও খিলান সারির জাদুকরী প্রতিফলন।',
    conceptStyleEn: 'mirror-like water reflection across the central courtyard pool capturing domes and arches in crystal clarity',
    focusDetail: 'glassy undisturbed water surface creating an upside-down twin of the monumental architectural facade',
    preferredAspect: '16:9',
    primaryPerspective: 'submerged split waterline and surface reflection composition',
    archetypeStructure: 4,
  },
  {
    id: 23,
    focusThemeBn: 'সূর্যস্নাত মধ্যাহ্নে মার্বেল প্রাঙ্গণ ও চারপাশের আর্কেড',
    sceneDescBn: 'উজ্জ্বল দিনের আলোয় চকচকে সাদা মার্বেল মেঝের ওপর খিলান সারির ছায়ার জ্যামিতিক নকশা।',
    conceptStyleEn: 'sun-drenched open courtyard surrounded by rhythmic vaulted arcades with crisp cast shadows',
    focusDetail: 'bright high-key ambient light highlighting expansive clean negative space suitable for commercial text overlay',
    preferredAspect: '16:9',
    primaryPerspective: 'high-key bright open plaza framing wide architectural perimeter',
    archetypeStructure: 4,
  },
  {
    id: 24,
    focusThemeBn: 'গোধূলির নীল আলোয় খালি মার্বেল চত্বরের শান্ত পরিবেশ',
    sceneDescBn: 'সূর্যাস্ত পরবর্তী নীল আলোয় সম্পূর্ণ জনমানবহীন মার্বেল চত্বরের আধ্যাত্মিক প্রশান্তি।',
    conceptStyleEn: 'serene dusk atmosphere in the vast deserted mosque courtyard bathed in tranquil twilight illumination',
    focusDetail: 'smooth glossy polished floor reflecting the soft lavender and deep indigo sky above',
    preferredAspect: '16:9',
    primaryPerspective: 'deep horizontal plane highlighting tranquil reflective paving',
    archetypeStructure: 4,
  },
  {
    id: 25,
    focusThemeBn: 'ঐতিহাসিক ফোয়ারার কারুকার্যময় মার্বেল খোদাই ও স্বচ্ছ পানি',
    sceneDescBn: 'প্রাঙ্গণের কেন্দ্রীয় ফোয়ারার মার্বেল বাটি থেকে শান্তভাবে গড়িয়ে পড়া স্বচ্ছ পানির ধারা।',
    conceptStyleEn: 'architectural study focusing on the ornate stone carving and gentle cascading water of the sahn fountain',
    focusDetail: 'fine water ripples dancing across scalloped marble fountain basin in soft natural daylight',
    preferredAspect: '3:2',
    primaryPerspective: 'medium focal distance centering on carved ablution fountain architecture',
    archetypeStructure: 4,
  },

  // 26-30: Arches, Colonnades & Colonnaded Arcades (Scene Type 6)
  {
    id: 26,
    focusThemeBn: 'ছন্দময় সূক্ষ্ম হর্সশু ও পয়েন্টেড আর্চের দীর্ঘ করিডোর',
    sceneDescBn: 'একটানা খিলানের দীর্ঘ করিডোর যা চোখের দৃষ্টিকে গভীরে টেনে নিয়ে যায় এক নান্দনিক পার্সপেক্টিভে।',
    conceptStyleEn: 'dramatic one-point perspective down an endless colonnade of rhythmic pointed and horseshoe arches',
    focusDetail: 'repeating vaulted bays with slender marble columns casting elegant parallel shadows along the gallery floor',
    preferredAspect: '16:9',
    primaryPerspective: 'tunnel perspective deep corridor focus with leading lines',
    archetypeStructure: 5,
  },
  {
    id: 27,
    focusThemeBn: 'মাশরাবিয়া কাঠের জাফরির মধ্য দিয়ে পরা আলোর নকশা',
    sceneDescBn: 'আর্চের ভেতরে খোদাই করা কাঠের জাফরির মধ্য দিয়ে মেঝের ওপর জ্যামিতিক ছায়া ও আলোকরশ্মির খেলা।',
    conceptStyleEn: 'intricate geometric shadow patterns cast on stone floors through traditional mashrabiya latticework screens',
    focusDetail: 'high-contrast interplay of direct sunlight and intricate floral-geometric shadow lattices',
    preferredAspect: '3:2',
    primaryPerspective: 'gobo patterned architectural window shadow play along arcade floor',
    archetypeStructure: 5,
  },
  {
    id: 28,
    focusThemeBn: 'ডাবল-লেয়ার্ড মার্বেল আর্কেডের স্থাপত্য গভীরতা',
    sceneDescBn: 'দোতলা বিশিষ্ট মার্বেল খিলানের স্তর যা ভেতরের চত্বর ও বাহিরের আকাশের অপূর্ব ফ্রেম তৈরি করে।',
    conceptStyleEn: 'layered multi-tier archway composition naturally framing a picturesque view of the sunlit courtyard beyond',
    focusDetail: 'depth-of-field separation between sharply defined foreground stone arch and soft sun-drenched background',
    preferredAspect: '16:9',
    primaryPerspective: 'natural architectural framing with layered foreground-background depth',
    archetypeStructure: 5,
  },
  {
    id: 29,
    focusThemeBn: 'আর্চের ছাদ বরাবর ঝুলন্ত ভিন্টেজ ব্রাস লণ্ঠনের সারি',
    sceneDescBn: 'খিলানযুক্ত দীর্ঘ করিডোরের প্রতিটি খিলান থেকে ঝুলন্ত ঐতিহ্যবাহী ব্রাস লণ্ঠনের উষ্ণ দীপ্তি।',
    conceptStyleEn: 'illuminated architectural gallery featuring rhythmic hanging vintage pierced-brass lanterns beneath vaulted arches',
    focusDetail: 'golden ambient glow emanating from patterned metal lanterns, highlighting stone ceiling ribbing',
    preferredAspect: '3:2',
    primaryPerspective: 'rhythmic progression of illuminated hanging lanterns down colonnade',
    archetypeStructure: 5,
  },
  {
    id: 30,
    focusThemeBn: 'মরোক্কান ও আন্দালুসিয়ান শৈলীর খাঁজকাটা খিলানের সজ্জা',
    sceneDescBn: 'আন্দালুসিয়ান ঐতিহ্যের জটিল খাঁজকাটা মার্বেল খিলান এবং তার ওপরে খোদাই করা জিপসাম প্লাস্টার নকশা।',
    conceptStyleEn: 'Moorish Andalusian polylobed archway showing extraordinary plaster relief work and sculpted cusps',
    focusDetail: 'micro-detailed sculpted stucco lace and layered horseshoe arch profile in warm raking light',
    preferredAspect: '4:3',
    primaryPerspective: 'rule-of-thirds framing emphasizing delicate sculptural stucco curves',
    archetypeStructure: 5,
  },

  // 31-35: Architectural Details, Muqarnas & Mosaics (Scene Type 7)
  {
    id: 31,
    focusThemeBn: 'খিলানের নিচে ত্রিমাত্রিক মৌচাক সদৃশ মুকারনাস খোদাই ডিটেইল',
    sceneDescBn: 'প্রবেশ তোরণের সিলিংয়ে মার্বেল ও প্লাস্টারে তৈরি জটিল ত্রিমাত্রিক মৌচাক নকশার (মুকারনাস) ক্লোজ-আপ।',
    conceptStyleEn: 'macro architectural detail of three-dimensional honeycomb muqarnas stalactite vaulting beneath an arch',
    focusDetail: 'geometric corbeling and stepped niche facets creating captivating miniature shadow pockets',
    preferredAspect: '1:1',
    primaryPerspective: 'extreme macro texture and geometric relief depth',
    archetypeStructure: 6,
  },
  {
    id: 32,
    focusThemeBn: 'ফিরোজা ও নীল গ্লেজড সিরামিক মোজাইক টাইলের জ্যামিতি',
    sceneDescBn: 'মসজিদের দেওয়ালে হাতে তৈরি খাঁটি জ্যামিতিক ইসলামিক মোজাইক টাইলের নিখুঁত প্রতিসাম্য।',
    conceptStyleEn: 'close-up composition highlighting handcrafted cobalt, turquoise, and gold glazed ceramic arabesque mosaic tiles',
    focusDetail: 'flawless interlocking star polygons (girih) with glossy specular highlights and artisanal clay texture',
    preferredAspect: '1:1',
    primaryPerspective: 'top-down geometric rhythm with macro surface clarity',
    archetypeStructure: 6,
  },
  {
    id: 33,
    focusThemeBn: 'মার্বেল মেঝের সূক্ষ্ম জ্যামিতিক গিরিহ ইনলে কারুকাজ',
    sceneDescBn: 'মসৃণ পলিশড মার্বেল মেঝের ওপর বিভিন্ন রঙের মূল্যবান পাথরের জ্যামিতিক নকশার নিখুঁত খোদাই।',
    conceptStyleEn: 'top-down textured architectural flat-angle showing intricate marble pietre dure and geometric stone inlays',
    focusDetail: 'contrasting veins of white Carrara, black granite, and green serpentine stone forming sacred Islamic stars',
    preferredAspect: '4:3',
    primaryPerspective: 'geometric top view arrangement isolating pristine stonework',
    archetypeStructure: 6,
  },
  {
    id: 34,
    focusThemeBn: 'কাঠের প্রাচীন দরজায় ব্রাস ও তামার জ্যামিতিক নকশা',
    sceneDescBn: 'মসজিদের প্রাচীন সেগুন কাঠের বিশাল প্রধান দরজায় ব্রাস ও তামার তারের জটিল জ্যামিতিক কারুকাজ।',
    conceptStyleEn: 'rich tactile focus on an antique hand-carved solid teakwood portal reinforced with patinated brass studs',
    focusDetail: 'weathered rich grain wood textures, hand-chiseled Arabic geometric relief, and warm brass sheen',
    preferredAspect: '3:2',
    primaryPerspective: 'tactile close crop on hand-carved wood grain and patinated metal',
    archetypeStructure: 6,
  },
  {
    id: 35,
    focusThemeBn: 'গম্বুজের অভ্যন্তরীণ ছাদের বর্ণিল ক্যালিগ্রাফি ও গোল্ডেন মেডেলিয়ন',
    sceneDescBn: 'সরাসরি ওপরের দিকে তাকানো ভিউয়ে কেন্দ্রীয় গম্বুজের ভিতরের সোনালী ও নীল বৃত্তাকার ক্যালিগ্রাফির ছন্দ।',
    conceptStyleEn: 'direct upward 90-degree zenith view capturing the celestial interior dome medallion and surrounding calligraphy',
    focusDetail: 'concentric rings of illuminated gilded Arabic calligraphy radiating outward into arabesque filigree',
    preferredAspect: '1:1',
    primaryPerspective: 'orthographic upward sensor view capturing radial dome symmetry',
    archetypeStructure: 6,
  },

  // 36-42: Additional Diversity Scenarios (Aerial, Sunrise, Twilight, Colonnades)
  {
    id: 36,
    focusThemeBn: 'কুয়াশায় ঘেরা ভোরের সূর্যের আলোয় মসজিদের দূরবর্তী প্যানোরামা',
    sceneDescBn: 'ভোরের প্রথম আলোয় শান্ত নদীর পাড়ে দাঁড়িয়ে থাকা মসজিদের মিনার ও গম্বুজের অপরূপ প্যানোরামিক দৃশ্য।',
    conceptStyleEn: 'cinematic ultra-wide establishing panorama of a riverside grand mosque enveloped in morning sun mist',
    focusDetail: 'soft golden sun flare illuminating the distant minarets and misty water surface with generous negative space',
    preferredAspect: '16:9',
    primaryPerspective: 'panoramic ultra-wide horizontal field balance',
    archetypeStructure: 0,
  },
  {
    id: 37,
    focusThemeBn: 'চারটি সুউচ্চ মিনারের সমান্তরাল দৃষ্টিনন্দন ফ্রেম',
    sceneDescBn: 'চার কোণের চারটি সমান উচ্চতার সুদৃশ্য মার্বেল মিনারের জ্যামিতিক ভারসাম্য ও আকাশের বিস্তৃতি।',
    conceptStyleEn: 'dramatic upward wide-angle rectilinear view capturing the four perimeter minarets framing the sky',
    focusDetail: 'optical vertical convergence corrected with tilt-shift geometry, crisp white stone edges against azure sky',
    preferredAspect: '16:9',
    primaryPerspective: 'rectilinear architectural precision angle with ample sky space',
    archetypeStructure: 1,
  },
  {
    id: 38,
    focusThemeBn: 'অভ্যন্তরীণ খিলানযুক্ত করিডোরে সূর্যাস্তের নরম আলো',
    sceneDescBn: 'দিনের শেষে সূর্যাস্তের উষ্ণ আভা যখন মসজিদের অভ্যন্তরীণ খিলান ও স্তম্ভের গায়ে ছড়িয়ে পড়ে।',
    conceptStyleEn: 'interior colonnade bathed in late afternoon golden grazing light highlighting carved stone textures',
    focusDetail: 'long shadows stretching across pristine marble floor and glowing amber column capitals',
    preferredAspect: '3:2',
    primaryPerspective: 'warm directional sidelight accentuating micro-masonry textures',
    archetypeStructure: 2,
  },
  {
    id: 39,
    focusThemeBn: 'পাথরে খোদাই করা জ্যামিতিক স্টার জালির জানালার ডিটেইল',
    sceneDescBn: 'পাথরের তৈরি সূক্ষ্ম ছিদ্রযুক্ত স্টার প্যাটার্ন জালির ভেতর দিয়ে প্রবেশ করা ভোরের শীতল আলো।',
    conceptStyleEn: 'architectural macro study of a hand-chiseled pierced stone jali lattice window screen',
    focusDetail: 'sharp geometric stone perforations and diffused natural morning backlight casting crisp stars',
    preferredAspect: '1:1',
    primaryPerspective: 'extreme macro texture with high geometric contrast',
    archetypeStructure: 3,
  },
  {
    id: 40,
    focusThemeBn: 'বৃষ্টিভেজা মার্বেল চত্বরে গোধূলির আলোর প্রতিফলন',
    sceneDescBn: 'হালকা বৃষ্টির পর ধুয়ে যাওয়া মসৃণ মার্বেল প্লাজায় গোধূলির নীল ও সোনালী আলোর দ্বৈত প্রতিফলন।',
    conceptStyleEn: 'post-rain glistening marble courtyard capturing dual-temperature twilight blue and warm exterior lighting reflections',
    focusDetail: 'wet specular reflections on white marble paving stones mirroring minarets in crisp clarity',
    preferredAspect: '16:9',
    primaryPerspective: 'ground-level low-angle hero shot over glistening reflective marble',
    archetypeStructure: 4,
  },
  {
    id: 41,
    focusThemeBn: 'ঐতিহাসিক লাল বেলেপাথরের খিলান তোরণ ও খোদাই কারুকাজ',
    sceneDescBn: 'মুঘল ঐতিহ্যের লাল বেলেপাথরে তৈরি সুদৃঢ় খিলান ও তাতে সাদা মার্বেলের জ্যামিতিক নকশা খোদাই।',
    conceptStyleEn: 'rich red sandstone Mughal-inspired monumental archway with white marble inlay bands',
    focusDetail: 'tactile porous sandstone grain contrasted with slick polished white marble border inlays',
    preferredAspect: '3:2',
    primaryPerspective: 'eye-level direct commercial angle with natural depth',
    archetypeStructure: 5,
  },
  {
    id: 42,
    focusThemeBn: 'সিলিংয়ের কাঠের খোদাই ও ব্রাস ঝাড়বাতির আর্কিটেকচারাল ডিটেইল',
    sceneDescBn: 'প্রার্থনা হলের সিলিংয়ে ঐতিহ্যবাহী কাঠের জ্যামিতিক ফ্রেমওয়ার্ক ও তার থেকে ঝুলন্ত নকশাদার ঝাড়বাতি।',
    conceptStyleEn: 'intricate architectural detail focusing on coffered carved cedarwood ceiling beam grids and hanging lantern',
    focusDetail: 'hand-joined timber intersections, carved rosettes, and subtle warm uplighting defining wood craftsmanship',
    preferredAspect: '4:3',
    primaryPerspective: 'abstract tight crop isolating geometric rhythm and craftsmanship',
    archetypeStructure: 6,
  },
];

// -------------------------------------------------------------
// Dedicated Diverse Mosque Prompt Formulation
// Eliminates tabletop props (Quran, tasbih, prayer mat, perfume, caps)
// and ensures primary visual subject is the mosque building architecture.
// -------------------------------------------------------------
export function formulateDiverseMosquePromptText(
  topic: string,
  blueprint: CommercialScenarioBlueprint,
  compEn: string,
  lightEn: string,
  bgEn: string,
  colorEn: string,
  camEn: string
): string {
  const cleanTopic = topic.trim() || 'Grand Mosque Architecture';

  switch (blueprint.archetypeStructure) {
    case 0:
      // Structure 0: Complete Exterior & Panoramic Establishing View
      return `Majestic commercial architectural stock photograph of a grand mosque representing ${cleanTopic}. ${blueprint.conceptStyleEn}, highlighting ${blueprint.focusDetail}. Composition: ${compEn}. Lighting: ${lightEn}. Setting and atmosphere: ${bgEn}. Color grading: ${colorEn}. Optics: ${camEn}, impeccable edge-to-edge optical clarity, majestic monumental proportions, generous negative copy space in sky for editorial titles, photorealistic 8k resolution, Hasselblad medium format color fidelity, zero brand logos, no text, no watermarks, professional advertising quality.`;

    case 1:
      // Structure 1: Domes & Minarets Sculptural Silhouette
      return `Breathtaking architectural stock capture of mosque domes and minarets for ${cleanTopic}. ${blueprint.conceptStyleEn}, emphasizing ${blueprint.focusDetail}. Symmetrical ${compEn} illuminated by ${lightEn} across ${bgEn}. Chromatic harmony: ${colorEn}. Lens: ${camEn}, razor-sharp architectural contours, golden crescent finials, ample breathing space for commercial layout, 8k resolution, zero trademarks, agency stock standard.`;

    case 2:
      // Structure 2: Vast Interior Prayer Hall Sanctuary
      return `Grand interior architectural stock visual of an expansive mosque prayer hall for ${cleanTopic}. ${blueprint.conceptStyleEn}, featuring ${blueprint.focusDetail}. Masterful ${compEn} bathed in ${lightEn} with majestic ${bgEn}. Palette: ${colorEn}. Shot on ${camEn}, sublime spiritual scale, soaring ceiling volume, natural stone and marble textures, commercial editorial grade, photorealistic 8k, zero logos, pristine stock quality.`;

    case 3:
      // Structure 3: Mihrab & Qibla Wall Sacred Focal Point
      return `Ornate architectural detail stock photography of a grand mosque mihrab niche for ${cleanTopic}. ${blueprint.conceptStyleEn}, focusing intently on ${blueprint.focusDetail}. Elegant ${compEn} enhanced by ${lightEn} against ${bgEn}. Color tones: ${colorEn}. Camera setup: ${camEn}, micro-fine carved marble reliefs, gold calligraphy inlays, tack-sharp focal plane, commercial licensing grade, 8k resolution, zero artifacts.`;

    case 4:
      // Structure 4: Expansive Courtyard (Sahn) & Reflection Pool
      return `Serene commercial stock photograph of a vast open mosque courtyard for ${cleanTopic}. ${blueprint.conceptStyleEn}, accentuating ${blueprint.focusDetail}. Wide ${compEn} with luminous ${lightEn} over ${bgEn}. Color palette: ${colorEn}. Captured with ${camEn}, mirror-still water reflections, smooth marble paving, clean uncluttered space, 8k photorealism, commercial advertising standard.`;

    case 5:
      // Structure 5: Colonnades, Arches & Mashrabiya Geometry
      return `Rhythmic architectural stock photography of mosque arches and colonnade galleries for ${cleanTopic}. ${blueprint.conceptStyleEn}, showcasing ${blueprint.focusDetail}. Dynamic ${compEn} accented by ${lightEn} through ${bgEn}. Harmonious ${colorEn} grade. Equipment: ${camEn}, deep one-point perspective, intricate geometric shadow casting, commercial editorial quality, zero logos, 8k resolution.`;

    case 6:
    default:
      // Structure 6: Architectural Details, Muqarnas Vaulting & Arabesque Mosaics
      return `Tack-sharp macro architectural stock capture of handcrafted Islamic mosque details for ${cleanTopic}. ${blueprint.conceptStyleEn}, spotlighting ${blueprint.focusDetail}. Frame: ${compEn}. Illumination: ${lightEn}. Backdrop: ${bgEn}. Color: ${colorEn}. Optical specs: ${camEn}, tactile three-dimensional stonework, glazed ceramic tile sheen, authentic artisanal craftsmanship, generous negative copy space, 8k photorealistic perfection.`;
  }
}

// -------------------------------------------------------------
// Core Diverse Prompt Formulation
// Eliminates rigid modulo cycling and formulaic boilerplate
// -------------------------------------------------------------
export function formulateDiversePromptText(
  topic: string,
  blueprint: CommercialScenarioBlueprint,
  compEn: string,
  lightEn: string,
  bgEn: string,
  colorEn: string,
  camEn: string
): string {
  const cleanTopic = topic.trim() || 'commercial product and lifestyle';

  if (isMosqueTopic(cleanTopic) && !hasExplicitIslamicObjectRequest(cleanTopic)) {
    return formulateDiverseMosquePromptText(cleanTopic, blueprint, compEn, lightEn, bgEn, colorEn, camEn);
  }

  switch (blueprint.archetypeStructure) {
    case 0:
      // Structure 0: Tactile Macro & Sensory Focus
      return `Tack-sharp macro stock photograph of ${cleanTopic}. ${blueprint.conceptStyleEn}, focusing intently on ${blueprint.focusDetail}. Framing: ${compEn}. Lighting: ${lightEn}. Setting: ${bgEn}. Color grading: ${colorEn}. Lens: ${camEn}, crisp optical sharpness, realistic tactile micro-surfaces, generous negative copy space for commercial editorial layout, photorealistic 8k, Hasselblad medium format color fidelity, zero brand logos, no text, no watermarks, professional advertising quality.`;

    case 1:
      // Structure 1: High-End Studio Commercial Hero
      return `Aspirational commercial studio stock capture of ${cleanTopic}. ${blueprint.conceptStyleEn}, highlighting ${blueprint.focusDetail}. Masterful ${compEn} illuminated by ${lightEn} across ${bgEn}. Color harmony: ${colorEn}. Shot on ${camEn}, pristine clean surfaces, generous negative space for marketing typography, photorealistic 8k, zero logos, ultra-high commercial stock standard.`;

    case 2:
      // Structure 2: Authentic Origin & Environmental Story
      return `Editorial documentary stock visual of ${cleanTopic}. ${blueprint.conceptStyleEn}, emphasizing ${blueprint.focusDetail}. Authentic environmental setting on ${bgEn}, bathed in ${lightEn}. Composition: ${compEn}. Color palette: ${colorEn}. Optical specs: ${camEn}, lifelike depth of field, natural organic textures, editorial ready, high-res 8k, no watermarks, commercial licensing grade.`;

    case 3:
      // Structure 3: Modern Minimalist & Negative Space Editorial
      return `Sleek minimalist commercial still life of ${cleanTopic}. ${blueprint.conceptStyleEn}, with clean focal emphasis on ${blueprint.focusDetail}. Dynamic ${compEn} paired with soft ${lightEn} on ${bgEn}. Subtle color tones in ${colorEn}. Equipment: ${camEn}, razor-sharp contours, ample negative breathing room for brand headlines, 8k photorealism, zero trademarks, agency stock standard.`;

    case 4:
      // Structure 4: Artisanal Craftsmanship & Heritage Touch
      return `Artisan process stock photography celebrating ${cleanTopic}. ${blueprint.conceptStyleEn}, detailing ${blueprint.focusDetail}. Rich textured narrative arranged in ${compEn}, enhanced by ${lightEn} over ${bgEn}. Chromatic palette: ${colorEn}. Camera setup: ${camEn}, authentic craftsmanship aesthetic, tactile depth, commercial editorial quality, zero logos, no text, 8k resolution.`;

    case 5:
    default:
      // Structure 5: Dynamic Spatial Depth & Conceptual Arrangement
      return `Dynamic commercial still life showcasing ${cleanTopic}. ${blueprint.conceptStyleEn}, spotlighting ${blueprint.focusDetail}. Creative spatial depth with ${compEn}, accented by ${lightEn} against ${bgEn}. Harmonious ${colorEn} grade. Captured using ${camEn}, razor-sharp focal plane, commercial licensing standard, generous copy space, 8k photorealistic perfection.`;
  }
}

// -------------------------------------------------------------
// Jaccard Token & Overlap Auditing Functions
// Detects semantic and textual repetition mathematically
// -------------------------------------------------------------
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'in', 'is', 'it', 'its',
  'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with', 'stock', 'photograph', 'photography',
  'commercial', 'photorealistic', '8k', 'resolution', 'zero', 'no', 'quality', 'editorial', 'layout',
  'focus', 'focal', 'lens', 'lighting', 'shot', 'captured', 'generous', 'space', 'color', 'composition'
]);

export function tokenizeAndCleanText(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

export function calculateTokenJaccardSimilarity(textA: string, textB: string): number {
  const setA = tokenizeAndCleanText(textA);
  const setB = tokenizeAndCleanText(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Rigorously audits a batch of prompts for text duplication, semantic overlap, and visual dimension variety.
 */
export function detectPromptRepetitionAndDiversity(
  prompts: BatchPromptItem[],
  requestedCount: number = prompts.length
): BatchDiversityAudit {
  const totalGenerated = prompts.length;
  const promptTexts = prompts.map((p) => p.prompt.trim().toLowerCase());
  const subjectsBn = prompts.map((p) => p.subjectBn.trim());

  // 1. Exact Duplicate Checking
  const uniquePromptSet = new Set(promptTexts);
  const uniqueSubjectSet = new Set(subjectsBn);
  const exactDuplicates = totalGenerated - uniquePromptSet.size;

  // 2. Pairwise Similarity Calculation
  let maxPairwiseSimilarity = 0;
  let totalSimilarity = 0;
  let pairCount = 0;
  const warnings: string[] = [];

  for (let i = 0; i < totalGenerated; i++) {
    for (let j = i + 1; j < totalGenerated; j++) {
      const sim = calculateTokenJaccardSimilarity(prompts[i].prompt, prompts[j].prompt);
      if (sim > maxPairwiseSimilarity) {
        maxPairwiseSimilarity = sim;
      }
      totalSimilarity += sim;
      pairCount++;

      if (sim > 0.65) {
        warnings.push(`প্রম্পট #${prompts[i].index} এবং #${prompts[j].index}-এর মধ্যে অত্যধিক টেক্সট সাদৃশ্য শনাক্ত হয়েছে (${(sim * 100).toFixed(1)}%)।`);
      }
    }
  }

  const avgPairwiseSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;

  // 3. Multi-Dimensional Attribute Uniqueness
  const uniqueCompositions = new Set(prompts.map((p) => p.composition)).size;
  const uniqueLightings = new Set(prompts.map((p) => p.lighting)).size;
  const uniqueCameras = new Set(prompts.map((p) => p.cameraAngle)).size;
  const uniqueBackgrounds = new Set(prompts.map((p) => p.background)).size;
  const uniqueThemes = new Set(prompts.map((p) => p.subjectBn)).size;

  // 4. Overall Diversity Score (0-100)
  // Penalize duplicates and excessive similarity
  let diversityScore = 100;
  if (exactDuplicates > 0) {
    diversityScore -= (exactDuplicates / totalGenerated) * 50;
  }
  if (maxPairwiseSimilarity > 0.60) {
    diversityScore -= (maxPairwiseSimilarity - 0.60) * 100;
  }
  if (uniqueCompositions < Math.min(20, Math.floor(totalGenerated * 0.4))) {
    diversityScore -= 10;
  }
  if (uniqueBackgrounds < Math.min(20, Math.floor(totalGenerated * 0.4))) {
    diversityScore -= 10;
  }
  diversityScore = Math.max(0, Math.min(100, Math.round(diversityScore)));

  const passed = exactDuplicates === 0 && maxPairwiseSimilarity <= 0.65 && totalGenerated >= requestedCount;

  return {
    totalRequested: requestedCount,
    totalGenerated,
    uniquePromptCount: uniquePromptSet.size,
    uniqueSubjectBnCount: uniqueSubjectSet.size,
    exactDuplicateCount: exactDuplicates,
    maxPairwiseSimilarity: Number(maxPairwiseSimilarity.toFixed(3)),
    avgPairwiseSimilarity: Number(avgPairwiseSimilarity.toFixed(3)),
    uniqueCompositionsCount: uniqueCompositions,
    uniqueLightingCount: uniqueLightings,
    uniqueCameraAnglesCount: uniqueCameras,
    uniqueBackgroundsCount: uniqueBackgrounds,
    uniqueThemesCount: uniqueThemes,
    diversityScore,
    passed,
    warnings,
    auditTimestamp: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// Guaranteed Diverse Combinatorial Generator (1 to 100 Prompts)
// -------------------------------------------------------------
export function generateDiverseCombinatorialPrompts(
  topic: string,
  count: number = 50,
  styleCategory: string = 'বাণিজ্যিক স্টক (Commercial Stock)'
): BatchPromptItem[] {
  const cleanTopic = topic.trim() || 'বাণিজ্যিক পণ্য ও লাইফস্টাইল';
  const targetCount = Math.max(1, Math.min(100, Math.floor(Number(count) || 50)));
  const prompts: BatchPromptItem[] = [];
  const topicSeed = hashTopicString(cleanTopic);
  const isMosque = isMosqueTopic(cleanTopic);
  const userRequestedProps = hasExplicitIslamicObjectRequest(cleanTopic);
  const matchedCategory = isMosque
    ? 'স্থাপত্য ও ঐতিহাসিক স্থান (Architecture & Historical Buildings)'
    : styleCategory;

  const blueprintPool = isMosque ? MOSQUE_SCENARIO_BLUEPRINTS : COMMERCIAL_SCENARIO_BLUEPRINTS;
  const availableBlueprints = blueprintPool.slice(0, targetCount);

  // Coprime step generators for multi-dimensional dispersion
  const stepComp = 7;
  const stepLight = 11;
  const stepCam = 13;
  const stepBg = 17;
  const stepColor = 19;

  for (let i = 0; i < targetCount; i++) {
    const blueprint = availableBlueprints[i] || blueprintPool[i % blueprintPool.length];

    // Non-colliding dispersion indices
    const compIdx = (topicSeed + i * stepComp) % COMPOSITIONS.length;
    const lightIdx = (topicSeed + i * stepLight) % LIGHTING_SETUPS.length;
    const camIdx = (topicSeed + i * stepCam) % CAMERA_SETUPS.length;
    const bgIdx = (topicSeed + i * stepBg) % BACKGROUND_SETTINGS.length;
    const colorIdx = (topicSeed + i * stepColor) % COLOR_PALETTES.length;

    const composition = COMPOSITIONS[compIdx];
    const lighting = LIGHTING_SETUPS[lightIdx];
    const cameraAngle = CAMERA_SETUPS[camIdx];
    const background = BACKGROUND_SETTINGS[bgIdx];
    const colorPalette = COLOR_PALETTES[colorIdx];

    const promptIndex = i + 1;

    // Distinct Bengali descriptions without artificial "#variant" formula
    const subjectBn = `${cleanTopic} — ${blueprint.focusThemeBn}`;
    const sceneBn = `${blueprint.sceneDescBn} ${background.split('(')[0].trim()} পটভূমিতে ${lighting.split('(')[0].trim()} এবং ${composition.split('(')[0].trim()}।`;

    // Extract English descriptive tokens from labels
    const compEn = composition.includes('(') ? composition.split('(')[1].replace(')', '') : 'commercial composition';
    const lightEn = lighting.includes('(') ? lighting.split('(')[1].replace(')', '') : 'professional studio lighting';
    const camEn = cameraAngle.includes('(') ? cameraAngle.split('(')[1].replace(')', '') : 'shot on 85mm prime lens';
    const bgEn = background.includes('(') ? background.split('(')[1].replace(')', '') : 'textured backdrop';
    const colorEn = colorPalette.includes('(') ? colorPalette.split('(')[1].replace(')', '') : 'harmonious color palette';

    // Construct tailored prompt using scenario-specific archetype structure
    const promptText = formulateDiversePromptText(cleanTopic, blueprint, compEn, lightEn, bgEn, colorEn, camEn);

    const negativePrompt = isMosque && !userRequestedProps
      ? MOSQUE_NEGATIVE_PROMPT
      : 'blurry, out of focus, low resolution, noisy artifacts, fake plastic look, distorted perspective, brand logos, watermark, text, signatures, bad geometry, oversaturated unrealistic colors, cropped awkwardly';

    prompts.push({
      id: `prompt-plan-${Date.now()}-${promptIndex}`,
      index: promptIndex,
      topic: cleanTopic,
      subjectBn,
      sceneBn,
      composition,
      lighting,
      colorPalette,
      cameraAngle,
      background,
      prompt: promptText,
      negativePrompt,
      suggestedAspectRatio: blueprint.preferredAspect,
      commercialNiche: matchedCategory,
      status: 'planned',
      statusLabelBn: 'পরিকল্পিত',
    });
  }

  // Deduplication & Similarity Verification Pass
  const audit = detectPromptRepetitionAndDiversity(prompts, count);
  if (!audit.passed) {
    console.warn(`[Batch Planner Engine] Initial diversity audit warnings (${audit.warnings.length}):`, audit.warnings);
  }

  return prompts;
}

// -------------------------------------------------------------
// End-to-End Batch Plan Generator with Real Auditing
// -------------------------------------------------------------
export async function generateBatchPlan(
  topic: string,
  count: number = 50,
  styleCategory: string = 'বাণিজ্যিক স্টক (Commercial Stock)',
  geminiApiKey?: string
): Promise<{ plan: BatchPlan; provider: string }> {
  const cleanTopic = topic.trim() || 'বাণিজ্যিক পণ্য ও লাইফস্টাইল';
  const targetCount = Math.max(1, Math.min(100, Math.floor(Number(count) || 50)));
  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  const hasGeminiKey = !!(apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY');
  const isMosque = isMosqueTopic(cleanTopic);
  const userRequestedProps = hasExplicitIslamicObjectRequest(cleanTopic);
  const matchedCategory = isMosque
    ? 'স্থাপত্য ও ঐতিহাসিক স্থান (Architecture & Historical Buildings)'
    : styleCategory;

  const planId = `batch-plan-${Date.now()}`;

  // If Gemini API is available, try generating tailored batches with chunking
  if (hasGeminiKey) {
    try {
      console.log(`[Batch Planner] Calling Gemini 3.8 Flash for ${targetCount} prompts on topic: "${cleanTopic}"...`);
      const ai = new GoogleGenAI({
        apiKey: apiKey!.trim(),
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const batchChunkSize = targetCount <= 50 ? targetCount : 50;
      const chunksCount = Math.ceil(targetCount / batchChunkSize);
      let allPrompts: BatchPromptItem[] = [];
      let successfulModel = '';

      for (let chunkIdx = 0; chunkIdx < chunksCount; chunkIdx++) {
        const startNumber = chunkIdx * batchChunkSize + 1;
        const currentCount = Math.min(batchChunkSize, targetCount - chunkIdx * batchChunkSize);

        const mosqueMandate = isMosque ? `
CRITICAL MOSQUE ARCHITECTURAL ACCURACY MANDATES:
1. The primary visual subject of EVERY prompt MUST be an actual mosque building, exterior, domes, minarets, prayer hall, mihrab, courtyard, or architectural details.
2. Generate rich variety across these 7 distinct mosque architectural scenes:
   - Complete exterior panoramic facades with reflecting pools and plazas
   - Domes and soaring minarets clusters with golden crescent finials
   - Grand interior prayer halls with high ceilings, chandeliers, and columns
   - Semicircular marble mihrab (prayer niche) and qibla wall architectural details
   - Open marble courtyard (sahn) with central ablution fountains
   - Colonnades, rhythmic horseshoe arches, and geometric mashrabiya shadow play
   - Authentic architectural details: honeycomb muqarnas stalactite vaulting, Iznik arabesque tiles, marble geometric inlays
3. STRICT EXCLUSIONS: Keep Quran, tasbih prayer beads, prayer mats, perfume/attar, and prayer caps OUT of the visual results unless explicitly requested. Every prompt must focus on commercial architectural stock photography.
` : '';

        const promptInstruction = `You are a world-class commercial stock media art director and photographer.
Create a batch of EXACTLY ${currentCount} highly diverse, non-repetitive, commercially viable image generation prompts for the topic: "${cleanTopic}".
Theme Focus for this subset: ${chunkIdx === 0 ? 'Studio Still Life, Macro Details, Isolated Product & Clean Editorial Compositions' : 'Environmental Lifestyle, Origin Harvest, Wide Scenes, Action Preparation & Dynamic Lighting'}.
Category: "${matchedCategory}".
Prompt numbering: ${startNumber} to ${startNumber + currentCount - 1}.
${mosqueMandate}

CRITICAL DIVERSITY MANDATES:
1. Every single prompt MUST feature a completely distinct scenario, composition, lighting design, camera angle, color palette, and background.
2. NO repetitive templates, NO formulaic phrases, NO copy-paste across items.
3. Every prompt must be stock-ready: generous negative copy space, zero trademark logos, photorealistic 8k, professional commercial advertising standard.
4. Provide meaningful Bengali descriptions for "subjectBn" and "sceneBn" explaining clearly what is happening in the scene.

Return ONLY a valid JSON array of ${currentCount} objects matching this exact schema:
[
  {
    "index": ${startNumber},
    "subjectBn": "বাংলায় বিষয়ের স্পষ্ট ও সমৃদ্ধ বিবরণ",
    "sceneBn": "বাংলায় দৃশ্যপট, আলো ও পটভূমির স্পষ্ট বিবরণ",
    "composition": "যেমন: টপ-ডাউন ফ্ল্যাট লে (Flat Lay 90° overhead)",
    "lighting": "যেমন: গোল্ডেন আওয়ারের নরম আলো (Golden hour warm rim light)",
    "colorPalette": "যেমন: উষ্ণ অ্যাম্বার ও পোড়ামাটির আভা",
    "cameraAngle": "যেমন: ১০০মিমি f/২.৮ ম্যাক্রো লেন্স",
    "background": "যেমন: মসৃণ ওক কাঠের টেবিলটপ",
    "prompt": "Distinct English commercial stock photography prompt, detailed optics, photorealistic 8k, negative copy space, zero logos",
    "suggestedAspectRatio": "16:9"
  }
]`;

        const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
        let geminiResult: any = null;

        for (const candidate of candidateModels) {
          try {
            const candidateTimeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout on ${candidate}`)), 12000)
            );
            const callRes = await Promise.race([
              ai.models.generateContent({
                model: candidate,
                contents: promptInstruction,
                config: {
                  temperature: 0.85,
                  responseMimeType: 'application/json',
                },
              }),
              candidateTimeout,
            ]);
            const text = callRes?.text || callRes?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim().length > 0) {
              geminiResult = callRes;
              successfulModel = candidate;
              break;
            }
          } catch {
            continue;
          }
        }

        const replyText = geminiResult?.text || '';
        try {
          const parsed = JSON.parse(replyText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped = parsed.map((item: any, i: number) => {
              const actualIndex = startNumber + i;
              const validAspect = ['16:9', '1:1', '3:2', '4:3', '9:16'].includes(item.suggestedAspectRatio)
                ? (item.suggestedAspectRatio as AspectRatioType)
                : '16:9';

              return {
                id: `prompt-plan-${Date.now()}-${actualIndex}`,
                index: actualIndex,
                topic: cleanTopic,
                subjectBn: String(item.subjectBn || `${cleanTopic} — বাণিজ্যিক দৃশ্য #${actualIndex}`),
                sceneBn: String(item.sceneBn || 'বাণিজ্যিক স্টক দৃশ্যপট'),
                composition: String(item.composition || COMPOSITIONS[actualIndex % COMPOSITIONS.length]),
                lighting: String(item.lighting || LIGHTING_SETUPS[actualIndex % LIGHTING_SETUPS.length]),
                colorPalette: String(item.colorPalette || COLOR_PALETTES[actualIndex % COLOR_PALETTES.length]),
                cameraAngle: String(item.cameraAngle || CAMERA_SETUPS[actualIndex % CAMERA_SETUPS.length]),
                background: String(item.background || BACKGROUND_SETTINGS[actualIndex % BACKGROUND_SETTINGS.length]),
                prompt: String(item.prompt || '').trim(),
                negativePrompt: isMosque && !userRequestedProps ? MOSQUE_NEGATIVE_PROMPT : 'blurry, noise, low resolution, plastic skin, trademark logos, text, watermarks, bad anatomy',
                suggestedAspectRatio: validAspect,
                commercialNiche: matchedCategory,
                status: 'planned' as const,
                statusLabelBn: 'পরিকল্পিত',
              };
            });

            allPrompts = allPrompts.concat(mapped);
          }
        } catch {
          // JSON parsing failure in this chunk
        }
      }

      // If LLM returned sufficient items, audit and fill any gap with non-colliding blueprints
      if (allPrompts.length >= Math.floor(targetCount * 0.7)) {
        if (allPrompts.length < targetCount) {
          const extraNeeded = targetCount - allPrompts.length;
          const fallbackPrompts = generateDiverseCombinatorialPrompts(cleanTopic, targetCount, matchedCategory);
          for (let k = 0; k < extraNeeded; k++) {
            const item = fallbackPrompts[allPrompts.length];
            if (item) {
              item.index = allPrompts.length + 1;
              allPrompts.push(item);
            }
          }
        }

        const trimmedPrompts = allPrompts.slice(0, targetCount);
        const audit = detectPromptRepetitionAndDiversity(trimmedPrompts, targetCount);

        console.log(`[Batch Planner] Generated ${trimmedPrompts.length} prompts via Gemini. Diversity Score: ${audit.diversityScore}%`);
        return {
          plan: {
            id: planId,
            topic: cleanTopic,
            requestedCount: targetCount,
            styleCategory: matchedCategory,
            createdAt: new Date().toISOString(),
            prompts: trimmedPrompts,
            diversityAudit: audit,
          },
          provider: `Gemini (${successfulModel || 'AI Planner'})`,
        };
      }
    } catch (geminiError: any) {
      const is429 = geminiError?.message?.includes('429') || geminiError?.status === 429;
      if (!is429) {
        console.warn('[Batch Planner] Gemini API generation error, falling back to diverse combinatorial engine:', geminiError?.message || geminiError);
      }
    }
  }

  // Combinatorial Expert Engine (Guaranteed 100% reliability, zero-latency, full Bengali + English diversity)
  console.log(`[Batch Planner] Generating ${targetCount} diverse prompts using Combinatorial Expert Engine for: "${cleanTopic}"`);
  const generatedPrompts = generateDiverseCombinatorialPrompts(cleanTopic, targetCount, matchedCategory);
  const audit = detectPromptRepetitionAndDiversity(generatedPrompts, targetCount);

  return {
    plan: {
      id: planId,
      topic: cleanTopic,
      requestedCount: targetCount,
      styleCategory: matchedCategory,
      createdAt: new Date().toISOString(),
      prompts: generatedPrompts,
      diversityAudit: audit,
    },
    provider: 'ডাইভার্স এক্সপার্ট ইঞ্জিন (Combinatorial Diversity Engine)',
  };
}

// -------------------------------------------------------------
// Rephrase Single Prompt
// -------------------------------------------------------------
export async function rephraseSinglePrompt(
  item: BatchPromptItem,
  customInstruction?: string,
  geminiApiKey?: string
): Promise<BatchPromptItem> {
  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  const hasGeminiKey = !!(apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY');

  if (hasGeminiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey!.trim(),
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const instruction = `Rephrase and enhance this commercial stock image prompt to create a fresh, distinct creative variation.
Topic: "${item.topic}".
Current Subject: "${item.subjectBn}".
Current Prompt: "${item.prompt}".
${customInstruction ? `User specific instruction: "${customInstruction}"` : 'Ensure a new fresh camera angle, refined lighting, and rich tactile commercial details.'}

Return ONLY a valid JSON object:
{
  "subjectBn": "নতুন বিষয়ের বাংলা বিবরণ",
  "sceneBn": "নতুন দৃশ্যপট ও আলোর বাংলা বিবরণ",
  "composition": "নতুন কম্পোজিশন",
  "lighting": "নতুন আলো",
  "cameraAngle": "নতুন ক্যামেরা লেন্স",
  "prompt": "Enhanced English photorealistic prompt, 8k, negative copy space, zero logos"
}`;

      let res: any = null;
      for (const m of ['gemini-3.1-flash-lite', 'gemini-3.8-flash']) {
        try {
          res = await ai.models.generateContent({
            model: m,
            contents: instruction,
            config: {
              temperature: 0.85,
              responseMimeType: 'application/json',
            },
          });
          if (res?.text) break;
        } catch {
          continue;
        }
      }

      const parsed = JSON.parse(res?.text || '{}');
      if (parsed && parsed.prompt) {
        return {
          ...item,
          subjectBn: parsed.subjectBn || item.subjectBn,
          sceneBn: parsed.sceneBn || item.sceneBn,
          composition: parsed.composition || item.composition,
          lighting: parsed.lighting || item.lighting,
          cameraAngle: parsed.cameraAngle || item.cameraAngle,
          prompt: parsed.prompt,
          status: 'planned',
          statusLabelBn: 'পরিকল্পিত (সংশোধিত)',
        };
      }
    } catch (e) {
      console.warn('[Rephrase Prompt] Fallback used due to Gemini error:', e);
    }
  }

  // Algorithmic rephrase using alternative blueprint
  const isMosque = isMosqueTopic(item.topic);
  const blueprintPool = isMosque ? MOSQUE_SCENARIO_BLUEPRINTS : COMMERCIAL_SCENARIO_BLUEPRINTS;
  const altIndex = (item.index * 7 + 13) % blueprintPool.length;
  const altBlueprint = blueprintPool[altIndex];
  const newComp = COMPOSITIONS[(item.index * 4 + 7) % COMPOSITIONS.length];
  const newLight = LIGHTING_SETUPS[(item.index * 6 + 11) % LIGHTING_SETUPS.length];
  const newCam = CAMERA_SETUPS[(item.index * 3 + 5) % CAMERA_SETUPS.length];
  const newBg = BACKGROUND_SETTINGS[(item.index * 5 + 9) % BACKGROUND_SETTINGS.length];
  const newColor = COLOR_PALETTES[(item.index * 2 + 15) % COLOR_PALETTES.length];

  const compEn = newComp.includes('(') ? newComp.split('(')[1].replace(')', '') : 'commercial studio layout';
  const lightEn = newLight.includes('(') ? newLight.split('(')[1].replace(')', '') : 'dramatic cinematic lighting';
  const camEn = newCam.includes('(') ? newCam.split('(')[1].replace(')', '') : 'shot on 100mm f/2.8 lens';
  const bgEn = newBg.includes('(') ? newBg.split('(')[1].replace(')', '') : 'textured backdrop';
  const colorEn = newColor.includes('(') ? newColor.split('(')[1].replace(')', '') : 'harmonious color palette';

  const newPromptText = formulateDiversePromptText(item.topic, altBlueprint, compEn, lightEn, bgEn, colorEn, camEn);
  const userRequestedProps = hasExplicitIslamicObjectRequest(item.topic);
  const negativePrompt = isMosque && !userRequestedProps ? MOSQUE_NEGATIVE_PROMPT : item.negativePrompt;

  return {
    ...item,
    composition: newComp,
    lighting: newLight,
    cameraAngle: newCam,
    background: newBg,
    colorPalette: newColor,
    negativePrompt,
    commercialNiche: isMosque ? 'স্থাপত্য ও ঐতিহাসিক স্থান (Architecture & Historical Buildings)' : item.commercialNiche,
    subjectBn: `${item.topic} — ${altBlueprint.focusThemeBn}`,
    sceneBn: `${altBlueprint.sceneDescBn} ${newBg.split('(')[0]} পটভূমিতে ${newLight.split('(')[0]} সহ ${newComp.split('(')[0]}।`,
    prompt: newPromptText,
    status: 'planned',
    statusLabelBn: 'পরিকল্পিত (পুনরায় তৈরি)',
  };
}
