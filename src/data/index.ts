import { existsSync, readFileSync } from "node:fs";

export type Shop = {
  slug: string;
  name: string;
  category: string;
  about: string;
  owner: string;
  phones: string[];
  whatsapp: boolean;
  lat: number;
  lng: number;
  hours: { open: string; close: string };
  googleMaps: string;
  verified: string; // YYYY-MM
};

// `keys` holds Hindi and Hinglish spellings people actually type.
// `color` marks the category on map pins and cards.
export const categories: Record<string, { en: string; hi: string; keys: string; color: string }> = {
  food: { en: "Food & chai", hi: "खाना और चाय", keys: "khana chai dhaba bakery cake restaurant nashta", color: "#b8322a" },
  grocery: { en: "Groceries", hi: "किराना", keys: "kirana ration atta dal sabzi", color: "#2e6b3a" },
  general: { en: "General store", hi: "जनरल स्टोर", keys: "general store cosmetics gift household bangles makeup", color: "#6f6a1c" },
  print: { en: "Stationery & print", hi: "स्टेशनरी", keys: "photocopy xerox print copy stationary", color: "#5b4a94" },
  salon: { en: "Salon & grooming", hi: "सैलून", keys: "nai barber parlour parlor haircut", color: "#a2366a" },
  medical: { en: "Medical & pharmacy", hi: "दवाई", keys: "dawai chemist doctor clinic hospital", color: "#0d7672" },
  mobile: { en: "Mobile & repairs", hi: "मोबाइल", keys: "phone recharge repair charger", color: "#4a4a4a" },
  clothing: { en: "Clothing & tailoring", hi: "कपड़े", keys: "kapde darzi tailor cloth", color: "#a86a12" },
  jewellery: { en: "Jewellers", hi: "ज्वेलर्स", keys: "jewellers jewelry sunar gold silver gehne", color: "#9a7b0a" },
  education: { en: "Schools & coaching", hi: "पढ़ाई", keys: "school college coaching tuition mmdu university padhai", color: "#2f5d8a" },
  hardware: { en: "Hardware", hi: "हार्डवेयर", keys: "hardware cement sariya paint pipe", color: "#5d5347" },
  auto: { en: "Auto & tyres", hi: "गाड़ी", keys: "tyre tire mechanic car bike garage puncture spare parts", color: "#3d3d5c" },
  fuel: { en: "Petrol pumps", hi: "पेट्रोल पंप", keys: "petrol diesel pump fuel cng", color: "#8a2f2f" },
  bank: { en: "Banks & ATMs", hi: "बैंक", keys: "atm paisa cash", color: "#34506e" },
  transport: { en: "Transport", hi: "सवारी", keys: "auto bus station taxi rickshaw", color: "#c79500" },
  sports: { en: "Gym & sports", hi: "जिम", keys: "gym khel sports", color: "#4d7a1e" },
  services: { en: "Services", hi: "सेवाएँ", keys: "laundry dhobi electrician plumber light tent decorator", color: "#1f5aa6" },
  places: { en: "Places", hi: "जगहें", keys: "mandir temple park gurudwara gate", color: "#7a5a3c" },
};

// "08:00" -> "8 am", "21:30" -> "9:30 pm"
export const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
};

// shops.json is git-ignored so phone numbers stay out of the public repo.
// Resolved from the project root: import.meta.url points into the build output.
const file = "src/data/shops.json";
const fallback = "src/data/shops.example.json";
export const shops: Shop[] = JSON.parse(readFileSync(existsSync(file) ? file : fallback, "utf8"));

// Places seeded from open map data. Name and location only, no phone, until the owner checks them.
export type Place = { slug: string; name: string; category: string; lat: number; lng: number; source: string };
export const places: Place[] = JSON.parse(readFileSync("src/data/places.json", "utf8")).filter(
  (p: Place) => !shops.some((s) => s.name.toLowerCase() === p.name.toLowerCase()),
);

export const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export const searchText = (s: Shop | Place) => {
  const c = categories[s.category];
  return [s.name, "about" in s ? s.about : "", "owner" in s ? s.owner : "", c.en, c.hi, c.keys].join(" ").toLowerCase();
};

export const directions = (s: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;

export const site = {
  name: "Explore Mullana",
  url: "https://mullana.abhibansal.dev",
  // Where "Report" goes. Empty hides the link.
  reportWhatsApp: "917988979932",
};
