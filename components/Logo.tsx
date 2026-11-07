export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="MeshLink">
      <rect width="40" height="40" rx="9" fill="#0176d3" />
      <g stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M11 27L20 12l9 15z" opacity=".55" />
        <path d="M11 27h18M20 12v9" />
      </g>
      <g fill="#fff">
        <circle cx="20" cy="12" r="3.4" /><circle cx="11" cy="27" r="3.4" /><circle cx="29" cy="27" r="3.4" />
        <circle cx="20" cy="21" r="2.4" fill="#90d0fe" />
      </g>
    </svg>
  );
}
