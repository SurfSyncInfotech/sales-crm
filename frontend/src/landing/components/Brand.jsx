/* Real source marks. Justdial is a wordmark, so it gets a wide white tile. */
const src = {
  meta: "/brands/meta.svg",
  indiamart: "/brands/indiamart.png",
  justdial: "/brands/justdial.svg",
  whatsapp: "/brands/whatsapp.svg",
};

export const sources = [
  { id: "meta", label: "Meta ads" },
  { id: "indiamart", label: "IndiaMART" },
  { id: "justdial", label: "Justdial" },
  { id: "website", label: "Your website" },
];

function Globe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export default function Brand({ id, size = 20, tile = false }) {
  const cls = `brand brand--${id}${tile ? " brand--tile" : ""}`;
  return (
    <span className={cls} style={{ "--s": `${size}px` }} aria-hidden="true">
      {id === "website" ? <Globe /> : <img src={src[id]} alt="" />}
    </span>
  );
}
