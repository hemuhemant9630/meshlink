export const CITIES = [
  'Hyderabad', 'Bengaluru', 'Pune', 'Chennai', 'Mumbai', 'Delhi NCR', 'Noida', 'Gurugram', 'Kolkata', 'Ahmedabad',
  'Indore', 'Jaipur', 'Kochi', 'Bhopal', 'San Francisco', 'New York', 'Chicago', 'Dallas', 'Austin', 'Toronto',
  'London', 'Dublin', 'Berlin', 'Amsterdam', 'Sydney', 'Melbourne', 'Singapore', 'Dubai',
];
const ALIASES = {
  bangalore: 'Bengaluru', bengaluru: 'Bengaluru', gurgaon: 'Gurugram', gurugram: 'Gurugram', 'new delhi': 'Delhi NCR',
  delhi: 'Delhi NCR', bombay: 'Mumbai', madras: 'Chennai', 'navi mumbai': 'Mumbai', calcutta: 'Kolkata', secunderabad: 'Hyderabad',
  'new york city': 'New York', nyc: 'New York', 'greater noida': 'Noida',
};
/** Map a free-text location ("Bangalore, Karnataka", "London, UK") to a canonical city name. */
export function normalizeCity(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return '';
  for (const [alias, city] of Object.entries(ALIASES)) if (new RegExp(`\\b${alias}\\b`).test(t)) return city;
  for (const c of CITIES) if (t.includes(c.toLowerCase())) return c;
  return String(text).split(',')[0].trim().slice(0, 60);
}
