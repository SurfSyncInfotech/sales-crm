export default function BrandLogo({ variant = 'full', className = '' }) {
  return (
    <div className={`brand-logo brand-logo-${variant} ${className}`.trim()}>
      <img src="/surfsync-logo-clear.png" alt="SurfSync Infotech" />
    </div>
  );
}
