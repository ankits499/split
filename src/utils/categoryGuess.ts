// Guess an expense category from its description — keyword match, Indian
// context (brands, apps, everyday terms). Deliberately a flat keyword table
// rather than anything ML: it's instant, offline, and easy to extend.
//
// Matching: the description is lowercased and stripped to words; each keyword
// is tested as a whole-word/phrase substring. All keywords are sorted by
// length (desc) once at load, so a more specific phrase ("amazon prime")
// always wins over a shorter one ("amazon") regardless of table order.

type CatId =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'rent'
  | 'entertainment'
  | 'household'
  | 'travel'
  | 'shopping'
  | 'medical'
  | 'fitness'
  | 'selfcare'

const KEYWORDS: Record<CatId, string[]> = {
  food: [
    'swiggy', 'zomato', 'eatsure', 'faasos', 'behrouz', 'ovenstory', 'box8', 'freshmenu',
    'dominos', 'domino', 'pizza hut', 'pizza', 'mcdonalds', 'mcd', 'burger king', 'kfc',
    'subway', 'starbucks', 'cafe coffee day', 'ccd', 'chaayos', 'chai point', 'blue tokai',
    'third wave', 'theobroma', 'wow momo', 'haldiram', 'haldirams', 'bikanervala', 'saravana',
    'a2b', 'sagar ratna', 'barbeque nation', 'bbq nation', 'social', 'smoke house', 'mainland china',
    'restaurant', 'dhaba', 'cafe', 'coffee', 'chai', 'tea', 'biryani', 'thali', 'lunch', 'dinner',
    'breakfast', 'brunch', 'snacks', 'chaat', 'samosa', 'dosa', 'idli', 'vada', 'paratha', 'momos',
    'rolls', 'tiffin', 'mess', 'canteen', 'food', 'meal', 'buffet', 'bakery', 'sweets', 'mithai',
    'ice cream', 'baskin robbins', 'naturals ice', 'pastry', 'cake', 'donut', 'dunkin',
    'kebab', 'tandoori', 'curry', 'paneer', 'juice', 'shake', 'smoothie', 'lassi', 'faluda',
    'thums up', 'cold drink', 'soft drink', 'eat out', 'dining', 'takeaway', 'street food',
  ],
  groceries: [
    'bigbasket', 'big basket', 'blinkit', 'grofers', 'zepto', 'jiomart', 'jio mart', 'dmart',
    'd mart', 'reliance fresh', 'reliance smart', 'more supermarket', 'spencers', 'nature basket',
    'star bazaar', 'spar', 'otipy', 'country delight', 'milk', 'bread', 'eggs', 'vegetables',
    'veggies', 'sabzi', 'fruits', 'atta', 'rice', 'cooking oil', 'sugar', 'spices', 'masala',
    'grocery', 'groceries', 'kirana', 'supermarket', 'ration', 'provisions', 'amul', 'mother dairy',
    'nandini', 'id fresh', 'ghee', 'curd', 'dahi', 'onion', 'potato', 'tomato', 'pulses', 'flour',
  ],
  transport: [
    'uber', 'ola', 'rapido', 'autorickshaw', 'auto rickshaw', 'rickshaw', 'meru', 'blusmart',
    'blu smart', 'namma yatri', 'bike taxi', 'yulu', 'bounce', 'vogo', 'petrol', 'diesel', 'fuel',
    'cng', 'gas station', 'hp petrol', 'indian oil', 'bharat petroleum', 'shell', 'metro card',
    'metro ride', 'bmtc', 'best bus', 'dtc bus', 'local train', 'suburban', 'parking', 'fastag',
    'toll', 'challan', 'car wash', 'servicing', 'puncture', 'tyre', 'mechanic', 'garage', 'cab',
    'taxi', 'auto fare', 'ola auto', 'uber auto', 'ola cab', 'uber ride',
  ],
  rent: [
    'house rent', 'flat rent', 'room rent', 'paying guest', 'pg rent', 'landlord', 'brokerage',
    'security deposit', 'house deposit', 'advance rent', 'society maintenance', 'flat maintenance',
    'lease', 'tenant', 'rent',
  ],
  entertainment: [
    'bookmyshow', 'book my show', 'pvr', 'inox', 'cinepolis', 'movie', 'cinema', 'multiplex',
    'netflix', 'prime video', 'amazon prime', 'hotstar', 'disney', 'jiocinema', 'jio cinema',
    'sonyliv', 'sony liv', 'zee5', 'voot', 'sun nxt', 'spotify', 'gaana', 'wynk', 'jiosaavn',
    'saavn', 'youtube premium', 'apple music', 'concert', 'standup', 'comedy show', 'theatre',
    'amusement park', 'wonderla', 'imagica', 'essel world', 'gaming', 'steam', 'playstation',
    'xbox', 'ps5', 'arcade', 'bowling', 'snooker', 'nightclub', 'pub', 'lounge bar', 'liquor',
    'wine shop', 'beer', 'whisky', 'vodka', 'cocktail', 'drinks night', 'ticket', 'show tickets',
  ],
  household: [
    'electricity bill', 'power bill', 'water bill', 'gas bill', 'lpg', 'cylinder', 'indane',
    'hp gas', 'bharat gas', 'broadband', 'wifi', 'internet bill', 'act fibernet', 'hathway',
    'tata play', 'dish tv', 'dth', 'mobile recharge', 'phone recharge', 'postpaid bill', 'airtel',
    'jio recharge', 'bsnl', 'maid', 'cook salary', 'house help', 'domestic help', 'cleaning',
    'housekeeping', 'laundry', 'dhobi', 'ironing', 'pest control', 'plumber', 'electrician',
    'carpenter', 'ac service', 'ro service', 'gardener', 'watchman', 'detergent', 'toiletries',
    'tissue', 'harpic', 'lizol', 'phenyl', 'surf excel', 'utensils', 'bartan',
  ],
  travel: [
    'indigo', 'spicejet', 'air india', 'vistara', 'akasa', 'goair', 'airasia', 'flight', 'airfare',
    'airport', 'hotel', 'oyo', 'treebo', 'fabhotel', 'taj', 'oberoi', 'marriott', 'lemon tree',
    'ginger hotel', 'airbnb', 'resort', 'homestay', 'guest house', 'hostel', 'zostel',
    'makemytrip', 'make my trip', 'goibibo', 'cleartrip', 'yatra', 'ixigo', 'easemytrip',
    'redbus', 'red bus', 'abhibus', 'irctc', 'train ticket', 'railway', 'tatkal', 'vacation',
    'holiday trip', 'road trip', 'sightseeing', 'visa fee', 'passport', 'forex', 'zoomcar',
    'revv', 'self drive', 'trip', 'tour package', 'travel',
  ],
  shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'tatacliq', 'tata cliq', 'snapdeal',
    'reliance digital', 'croma', 'vijay sales', 'decathlon', 'ikea', 'pepperfry', 'urban ladder',
    'lifestyle store', 'shoppers stop', 'pantaloons', 'westside', 'zudio', 'h&m', 'zara', 'uniqlo',
    'levis', 'jack & jones', 'us polo', 'allen solly', 'van heusen', 'peter england', 'fabindia',
    'biba', 'manyavar', 'clothes', 'clothing', 'apparel', 'tshirt', 't shirt', 'jeans', 'kurta',
    'saree', 'shoes', 'sneakers', 'footwear', 'bata', 'nike', 'adidas', 'puma', 'watch',
    'sunglasses', 'backpack', 'wallet', 'jewellery', 'jewelry', 'tanishq', 'kalyan jewellers',
    'laptop', 'headphones', 'earphones', 'earbuds', 'charger', 'gadget', 'electronics',
    'refrigerator', 'washing machine', 'furniture', 'mattress', 'wakefit', 'home decor', 'gift',
  ],
  medical: [
    'pharmeasy', 'pharm easy', '1mg', 'tata 1mg', 'netmeds', 'apollo pharmacy', 'apollo',
    'medplus', 'wellness forever', 'medicine', 'medicines', 'pharmacy', 'chemist', 'tablet',
    'syrup', 'doctor', 'clinic', 'hospital', 'consultation', 'health checkup', 'diagnostic',
    'lab test', 'blood test', 'thyrocare', 'lal pathlabs', 'metropolis', 'x ray', 'mri', 'ct scan',
    'ultrasound', 'dentist', 'dental', 'physiotherapy', 'physio', 'vaccine', 'vaccination',
    'ambulance', 'surgery', 'lenskart', 'titan eye', 'spectacles', 'contact lens', 'prescription',
    'first aid', 'sanitizer', 'mask',
  ],
  fitness: [
    'cultfit', 'curefit', 'cure fit', 'fitness first', 'golds gym', 'gold gym',
    'anytime fitness', 'cult fit', 'talwalkars', 'snap fitness', 'gym membership', 'gym fees', 'gym',
    'workout', 'personal trainer', 'zumba class', 'yoga class', 'pilates', 'crossfit',
    'whey protein', 'protein powder', 'supplement', 'creatine', 'muscleblaze', 'badminton court',
    'turf booking', 'box cricket', 'swimming', 'marathon', 'cycling club', 'dumbbell', 'treadmill',
    'fitbit', 'sports club',
  ],
  selfcare: [
    'spa', 'massage', 'salon', 'parlour', 'parlor', 'lakme salon', 'jawed habib', 'looks salon',
    'enrich salon', 'bblunt', 'toni & guy', 'naturals salon', 'haircut', 'hair cut', 'hair spa',
    'facial', 'manicure', 'pedicure', 'waxing', 'threading', 'makeup', 'cosmetics', 'skincare',
    'skin care', 'nykaa', 'mamaearth', 'plum goodness', 'minimalist', 'derma co', 'wow skin',
    'forest essentials', 'kama ayurveda', 'biotique', 'perfume', 'deodorant', 'moisturizer',
    'sunscreen', 'shampoo', 'conditioner', 'face wash', 'serum', 'lipstick', 'kajal', 'grooming',
    'beard trim', 'body spa', 'foot massage', 'wellness spa', 'ayurveda', 'therapy session',
  ],
}

// Longest keyword first, so "amazon prime" (entertainment) beats "amazon"
// (shopping), "gym membership" beats "gym", etc.
const TABLE: [string, string][] = Object.entries(KEYWORDS)
  .flatMap(([cat, words]) => words.map((w) => [w.trim(), cat] as [string, string]))
  .sort((a, b) => b[0].length - a[0].length)

/** Best-guess category id for a description, or null if nothing matches. */
export function guessCategory(description: string): string | null {
  const text = ` ${description.toLowerCase().replace(/[^a-z0-9&+]+/g, ' ').trim()} `
  if (text.length <= 2) return null
  for (const [kw, cat] of TABLE) {
    if (text.includes(` ${kw} `)) return cat
  }
  return null
}
