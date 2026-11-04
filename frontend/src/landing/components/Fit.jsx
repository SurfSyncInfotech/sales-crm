import { useLayoutEffect, useRef, useState } from "react";

/* Draws a fixed-size illustration and scales it to the column width, so the drawing stays exact on every screen. */
export default function Fit({ w, h, className = "", children }) {
  const box = useRef(null);
  const [k, setK] = useState(1);

  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setK(Math.min(1, e.contentRect.width / w)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [w]);

  return (
    <div ref={box} className={`fit ${className}`} style={{ height: h * k }}>
      <div className="fit-in" style={{ width: w, height: h, transform: `scale(${k})` }}>
        {children}
      </div>
    </div>
  );
}
