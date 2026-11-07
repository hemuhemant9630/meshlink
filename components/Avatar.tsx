const COLORS = ['#0176d3', '#2e844a', '#9050e9', '#dd7a01', '#ba0517', '#06a59a', '#3ba755', '#014486', '#c23934', '#7f8de1'];
export default function Avatar({ name, id, size = 40 }: { name: string; id: number; size?: number }) {
  const initials = (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: COLORS[(id || 0) % COLORS.length] }}>
      {initials}
    </span>
  );
}
