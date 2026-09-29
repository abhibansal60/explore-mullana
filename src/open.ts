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
