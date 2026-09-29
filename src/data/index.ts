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
export const categories: Record<string, { en: string; hi: string; keys: string }> = {
  food: { en: "Food & chai", hi: "खाना और चाय", keys: "khana chai dhaba bakery cake restaurant nashta" },
  grocery: { en: "Groceries", hi: "किराना", keys: "kirana general store cosmetics ration" },
  print: { en: "Stationery & print", hi: "स्टेशनरी", keys: "photocopy xerox print copy stationary" },
  salon: { en: "Salon & grooming", hi: "सैलून", keys: "nai barber parlour parlor haircut" },
  medical: { en: "Medical & pharmacy", hi: "दवाई", keys: "dawai chemist doctor clinic hospital" },
  mobile: { en: "Mobile & repairs", hi: "मोबाइल", keys: "phone recharge repair charger" },
  clothing: { en: "Clothing & tailoring", hi: "कपड़े", keys: "kapde darzi tailor cloth" },
  bank: { en: "Banks & ATMs", hi: "बैंक", keys: "atm paisa cash" },
  transport: { en: "Transport", hi: "सवारी", keys: "auto bus station taxi rickshaw" },
  sports: { en: "Gym & sports", hi: "जिम", keys: "gym khel sports" },
  services: { en: "Services", hi: "सेवाएँ", keys: "laundry dhobi electrician plumber light tent decorator" },
  places: { en: "Places", hi: "जगहें", keys: "mandir temple park gurudwara gate" },
};

// shops.json is git-ignored so phone numbers stay out of the public repo.
// Resolved from the project root: import.meta.url points into the build output.
const file = "src/data/shops.json";
const fallback = "src/data/shops.example.json";
export const shops: Shop[] = JSON.parse(readFileSync(existsSync(file) ? file : fallback, "utf8"));

export const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export const searchText = (s: Shop) => {
  const c = categories[s.category];
  return [s.name, s.about, s.owner, c.en, c.hi, c.keys].join(" ").toLowerCase();
};

export const directions = (s: Shop) =>
  `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;

export const site = {
  name: "Explore Mullana",
  url: "https://mullana.abhibansal.dev",
  // Where "Report" goes. Empty hides the link.
  reportWhatsApp: "",
};
