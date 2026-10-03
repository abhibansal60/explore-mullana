// Tithi (lunar day) for Mullana, worked out on the phone: no API, no data file.
// The tithi is the 12° step the Moon has gained on the Sun; the day's tithi is the one at sunrise.
// Positions use Meeus' low-precision series (Astronomical Algorithms ch. 25 and 47), good to
// about 0.01°, so a tithi that changes within ~10 minutes of sunrise can come out a day off.

const rad = Math.PI / 180;
const norm = (x: number) => ((x % 360) + 360) % 360;
const sin = (deg: number) => Math.sin(deg * rad);

// Julian centuries since J2000 (UT; the ~70 s to TT moves the Moon only 0.01°).
const centuries = (d: Date) => (d.getTime() / 864e5 + 2440587.5 - 2451545) / 36525;

function sunLongitude(T: number) {
  const L0 = 280.46646 + 36000.76983 * T;
  const M = 357.52911 + 35999.05029 * T;
  const C = (1.914602 - 0.004817 * T) * sin(M) + 0.019993 * sin(2 * M) + 0.000289 * sin(3 * M);
  return norm(L0 + C - 0.00569);
}

// The 24 largest periodic terms of the Moon's longitude, in millionths of a degree: [coef, D, M, M', F].
const TERMS: [number, number, number, number, number][] = [
  [6288774, 0, 0, 1, 0], [1274027, 2, 0, -1, 0], [658314, 2, 0, 0, 0], [213618, 0, 0, 2, 0],
  [-185116, 0, 1, 0, 0], [-114332, 0, 0, 0, 2], [58793, 2, 0, -2, 0], [57066, 2, -1, -1, 0],
  [53322, 2, 0, 1, 0], [45758, 2, -1, 0, 0], [-40923, 0, 1, -1, 0], [-34720, 1, 0, 0, 0],
  [-30383, 0, 1, 1, 0], [15327, 2, 0, 0, -2], [-12528, 0, 0, 1, 2], [10980, 0, 0, 1, -2],
  [10675, 4, 0, -1, 0], [10034, 0, 0, 3, 0], [8548, 4, 0, -2, 0], [-7888, 2, 1, -1, 0],
  [-6766, 2, 1, 0, 0], [-5163, 1, 0, -1, 0], [4987, 1, 1, 0, 0], [4036, 2, -1, 1, 0],
];

function moonLongitude(T: number) {
  const L = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T;
  const F = 93.272095 + 483202.0175233 * T;
  const E = 1 - 0.002516 * T;
  let sum = 0;
  for (const [c, d, m, mp, f] of TERMS) sum += c * E ** Math.abs(m) * sin(d * D + m * M + mp * Mp + f * F);
  return norm(L + sum / 1e6);
}

// 0..29: 0-14 Shukla Pratipada to Purnima, 15-29 Krishna Pratipada to Amavasya.
export const tithiAt = (d: Date) => Math.floor(norm(moonLongitude(centuries(d)) - sunLongitude(centuries(d))) / 12);

// ponytail: sunrise from a cosine fit for Mullana (05:23 IST in June, 07:17 in late December),
// off by up to ~15 minutes around January. A real sunrise formula is the upgrade if days come out wrong.
export function sunrise(ymd: string) {
  const day = Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
  const doy = (day - Date.UTC(+ymd.slice(0, 4), 0, 1)) / 864e5 + 1;
  const ist = 380 - 57 * Math.cos((2 * Math.PI * (doy - 172)) / 365);
  return new Date(day + (ist - 330) * 60e3); // IST is UTC+5:30
}

const NAMES = [
  ["Pratipada", "प्रतिपदा"], ["Dwitiya", "द्वितीया"], ["Tritiya", "तृतीया"], ["Chaturthi", "चतुर्थी"],
  ["Panchami", "पंचमी"], ["Shashthi", "षष्ठी"], ["Saptami", "सप्तमी"], ["Ashtami", "अष्टमी"],
  ["Navami", "नवमी"], ["Dashami", "दशमी"], ["Ekadashi", "एकादशी"], ["Dwadashi", "द्वादशी"],
  ["Trayodashi", "त्रयोदशी"], ["Chaturdashi", "चतुर्दशी"],
];

export function tithiName(t: number) {
  if (t === 14) return { en: "Purnima", hi: "पूर्णिमा" };
  if (t === 29) return { en: "Amavasya", hi: "अमावस्या" };
  const [en, hi] = NAMES[t % 15];
  return t < 15 ? { en: `Shukla ${en}`, hi: `शुक्ल ${hi}` } : { en: `Krishna ${en}`, hi: `कृष्ण ${hi}` };
}

// The day's tithi, and the next Purnima, Amavasya and Ekadashi from that day on (dates as YYYY-MM-DD).
export function panchang(ymd: string) {
  const at = (s: string) => tithiAt(sunrise(s));
  const plus = (i: number) => new Date(Date.parse(ymd + "T00:00:00Z") + i * 864e5).toISOString().slice(0, 10);
  // A day holds a tithi that is current at its sunrise, or one that starts and ends before the next
  // sunrise (a kshaya tithi, which is kept on that day).
  const next = (want: number[]) => {
    for (let i = 1; i <= 31; i++) {
      const a = at(plus(i));
      const span = (at(plus(i + 1)) - a + 30) % 30;
      if (want.some((w) => (w - a + 30) % 30 < Math.max(1, span))) return plus(i);
    }
    return undefined;
  };
  return { tithi: at(ymd), purnima: next([14]), amavasya: next([29]), ekadashi: next([10, 25]) };
}
