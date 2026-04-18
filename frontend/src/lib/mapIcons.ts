import L from "leaflet";

// Fix default icon paths for bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

/* ---------- Inline Lucide-style icon paths (24x24 viewBox) ---------- */

// Store / shop front (businesses)
const storePath = `
  <path d="M3 9l1.5-5h15L21 9" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" stroke-linejoin="round"/>
  <path d="M9 20v-6h6v6" stroke-linejoin="round"/>
  <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" stroke-linejoin="round"/>
`;

// Home + heart (shelters / NGOs)
const shelterPath = `
  <path d="M3 11l9-8 9 8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" stroke-linejoin="round"/>
  <path d="M12 18.5l-2.6-2.4a1.7 1.7 0 1 1 2.6-2.1 1.7 1.7 0 1 1 2.6 2.1L12 18.5z" stroke-linejoin="round" fill="currentColor"/>
`;

const vehiclePaths: Record<string, string> = {
  bike: `
    <circle cx="6" cy="17" r="3"/>
    <circle cx="18" cy="17" r="3"/>
    <path d="M6 17l4-7h5l3 7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 10l-1-3h-2" stroke-linecap="round"/>
    <path d="M15 10l-2-4" stroke-linecap="round"/>
  `,
  car: `
    <path d="M3 13l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 13h18v4a1 1 0 0 1-1 1h-1.5a1.5 1.5 0 0 1-3 0h-7a1.5 1.5 0 0 1-3 0H4a1 1 0 0 1-1-1v-4z" stroke-linejoin="round"/>
    <circle cx="7.5" cy="17.5" r="1.2" fill="currentColor"/>
    <circle cx="16.5" cy="17.5" r="1.2" fill="currentColor"/>
  `,
  van: `
    <path d="M2 8h11v9H2z" stroke-linejoin="round"/>
    <path d="M13 10h5l3 3v4h-8z" stroke-linejoin="round"/>
    <circle cx="7" cy="18" r="1.5" fill="currentColor"/>
    <circle cx="17" cy="18" r="1.5" fill="currentColor"/>
  `,
  truck: `
    <path d="M2 7h11v10H2z" stroke-linejoin="round"/>
    <path d="M13 10h5l3 3v4h-8z" stroke-linejoin="round"/>
    <circle cx="7" cy="18" r="1.5" fill="currentColor"/>
    <circle cx="17" cy="18" r="1.5" fill="currentColor"/>
    <path d="M5 11h5M5 13h5" stroke-linecap="round"/>
  `,
};

/* ---------- Pin (Business / Shelter) ---------- */

const pinSvg = (
  baseHsl: string,
  lightHsl: string,
  iconColor: string,
  iconPath: string,
  gradId: string,
) => `
<svg xmlns="http://www.w3.org/2000/svg" width="42" height="52" viewBox="0 0 42 52">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${lightHsl}"/>
      <stop offset="100%" stop-color="${baseHsl}"/>
    </linearGradient>
    <radialGradient id="${gradId}-inner" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="white" stop-opacity="1"/>
      <stop offset="85%" stop-color="white" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${baseHsl}" stop-opacity="0.15"/>
    </radialGradient>
    <filter id="${gradId}-shadow" x="-30%" y="-10%" width="160%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="rgba(0,0,0,0.30)"/>
      <feDropShadow dx="0" dy="1" stdDeviation="0.5" flood-color="rgba(0,0,0,0.18)"/>
    </filter>
  </defs>

  <g filter="url(#${gradId}-shadow)">
    <path fill="url(#${gradId})" stroke="white" stroke-width="2.5"
      d="M21 1.5c10.5 0 18 7.8 18 17.2 0 12.8-18 30.8-18 30.8S3 31.5 3 18.7C3 9.3 10.5 1.5 21 1.5z"/>
  </g>

  <circle cx="21" cy="19" r="11" fill="url(#${gradId}-inner)"/>
  <circle cx="21" cy="19" r="11" fill="none" stroke="${baseHsl}" stroke-opacity="0.25" stroke-width="0.8"/>

  <g transform="translate(9 7) scale(0.5)" fill="none" stroke="${iconColor}" stroke-width="2.2">
    ${iconPath}
  </g>
</svg>`;

const div = (html: string, cls = "") =>
  L.divIcon({
    html: `<div class="marker-pop-inner">${html}</div>`,
    className: `leaflet-themed-icon ${cls}`,
    iconSize: [42, 52],
    iconAnchor: [21, 50],
    popupAnchor: [0, -42],
  });

const businessBase = "hsl(35, 95%, 48%)";
const businessLight = "hsl(40, 100%, 65%)";
const shelterBase = "hsl(152, 65%, 36%)";
const shelterLight = "hsl(160, 70%, 55%)";

export const businessIcon = div(
  pinSvg(businessBase, businessLight, businessBase, storePath, "biz"),
  "marker-pop",
);
export const shelterIcon = div(
  pinSvg(shelterBase, shelterLight, shelterBase, shelterPath, "shel"),
  "marker-pop",
);

/* ---------- Driver badge ---------- */

export const driverIcon = (vehicle: string, available: boolean) => {
  const base = available ? "hsl(210, 90%, 52%)" : "hsl(0, 78%, 56%)";
  const light = available ? "hsl(210, 95%, 70%)" : "hsl(8, 85%, 68%)";
  const path = vehiclePaths[vehicle] ?? vehiclePaths.car;
  const gid = `drv-${vehicle}-${available ? "a" : "b"}`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <defs>
        <radialGradient id="${gid}" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stop-color="${light}"/>
          <stop offset="100%" stop-color="${base}"/>
        </radialGradient>
        <filter id="${gid}-s" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.32)"/>
        </filter>
      </defs>
      <circle cx="22" cy="22" r="20" fill="${base}" fill-opacity="0.18"/>
      <g filter="url(#${gid}-s)">
        <circle cx="22" cy="22" r="16" fill="url(#${gid})" stroke="white" stroke-width="3"/>
      </g>
      <g transform="translate(10 10)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round">
        ${path}
      </g>
    </svg>`;

  return L.divIcon({
    html: `<div class="driver-marker ${available ? "driver-marker--available" : ""}">${svg}</div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};
