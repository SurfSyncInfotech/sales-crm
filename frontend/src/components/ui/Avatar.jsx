export default function Avatar({ name = '?', size = 28 }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="ui-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }} title={name}>
      {initials}
    </span>
  );
}
