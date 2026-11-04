import { useEffect, useState } from "react";
import Console from "./Console.jsx";

const palette = [
  ["#16b26c", "PatronPing green"],
  ["#1b63e8", "Signal blue"],
  ["#7c3aed", "Violet"],
  ["#e11d48", "Rose"],
  ["#ea6a0c", "Saffron"],
  ["#0f766e", "Teal"],
];

export default function Branding() {
  const [name, setName] = useState("Kavya Fashions");
  const [color, setColor] = useState("#7c3aed");
  const [side, setSide] = useState("light");
  const [logo, setLogo] = useState(null);

  useEffect(() => () => logo && URL.revokeObjectURL(logo), [logo]);

  const onLogo = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("image/")) setLogo(URL.createObjectURL(f));
  };

  const vars = {
    "--accent": color,
    "--accent-wash": `color-mix(in srgb, ${color} 12%, white)`,
    "--side-bg": side === "dark" ? `color-mix(in srgb, ${color} 22%, #0b1230)` : "#ffffff",
    "--side-ink": side === "dark" ? "rgba(255,255,255,.78)" : "var(--ink-2)",
  };
  if (side === "dark") vars["--accent-wash"] = "rgba(255,255,255,.12)";

  return (
    <section className="section branding" id="branding">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <span className="kicker">Customize branding</span>
            <h2 className="h2">
              Your team logs in to your CRM. <span className="new-tag">New</span>
            </h2>
          </div>
          <p className="lead">
            Add your logo, pick your colours and give the CRM your company's name. Your salespeople and PMs work in a
            tool that looks like it belongs to you. Try it here.
          </p>
        </div>

        <div className="brand-lab">
          <div className="brand-controls">
            <label className="field">
              <span>Company name</span>
              <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            </label>

            <div className="field">
              <span>Logo</span>
              <div className="logo-drop">
                <span className="logo-preview" style={{ background: color }}>
                  {logo ? <img src={logo} alt="Your uploaded logo" /> : name.trim().charAt(0).toUpperCase() || "A"}
                </span>
                <label className="upload-btn">
                  Upload a logo
                  <input type="file" accept="image/*" onChange={onLogo} />
                </label>
              </div>
            </div>

            <div className="field">
              <span>Brand colour</span>
              <div className="swatches" role="group" aria-label="Brand colour">
                {palette.map(([c, label]) => (
                  <button
                    key={c}
                    className="swatch"
                    style={{ background: c }}
                    aria-label={label}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                  />
                ))}
                <label className="swatch-custom" title="Pick any colour">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    aria-label="Pick a custom colour"
                  />
                </label>
              </div>
            </div>

            <div className="field">
              <span>Sidebar</span>
              <div className="toggle-row">
                {["light", "dark"].map((s) => (
                  <button key={s} aria-pressed={side === s} onClick={() => setSide(s)}>
                    {s === "light" ? "Light" : "Tinted"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="brand-stage">
            <div className="brand-url">
              <span className="brand-mark" style={{ width: 18, height: 18, fontSize: 10, borderRadius: 5, background: color }}>
                {logo ? <img src={logo} alt="" /> : name.trim().charAt(0).toUpperCase() || "A"}
              </span>
              <span>
                <b>{name.trim() || "Your company"}</b> · Sales CRM
              </span>
            </div>
            <div className="brand-frame">
              <Console brand={{ name, logo }} style={vars} />
            </div>
            <p className="brand-powered">Your settings apply to every login in your company</p>
          </div>
        </div>
      </div>
    </section>
  );
}
