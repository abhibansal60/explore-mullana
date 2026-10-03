// "Open now" in Mullana time, whatever timezone the phone is in.
export function isOpen(open: string, close: string, now = new Date()) {
  const [h, m] = now
    .toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false })
    .split(":");
  const t = `${h}:${m}`;
  return close > open ? t >= open && t < close : t >= open || t < close;
}

// The badge carries preformatted times (data-open-label, data-close-label).
export function markOpenBadges() {
  document.querySelectorAll<HTMLElement>(".open-badge").forEach((el) => {
    const open = isOpen(el.dataset.open!, el.dataset.close!);
    el.textContent = open ? `Open, closes ${el.dataset.closeLabel}` : `Closed, opens ${el.dataset.openLabel}`;
    el.classList.toggle("is-open", open);
    el.classList.toggle("is-closed", !open);
  });
}

// ponytail: fixed 18:30-06:00 IST. Real sunset varies ~17:30-19:15 by season; suncalc is the upgrade.
export function isNight(now = new Date()) {
  const [h, m] = now
    .toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false })
    .split(":");
  const t = `${h}:${m}`;
  return t >= "18:30" || t < "06:00";
}

// "08:00" -> "8 am", "21:30" -> "9:30 pm"
export const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
};
