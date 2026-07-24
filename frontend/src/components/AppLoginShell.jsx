import { useEffect, useState } from 'react';

function useIsMobile(breakpoint = 860) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches : false
  );

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isMobile;
}

export default function AppLoginShell({
  eyebrow,
  title,
  subtitle,
  continueLabel = 'Continue',
  children,
}) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState('splash');

  useEffect(() => {
    if (!isMobile) setStep('splash');
  }, [isMobile]);

  const showSplash = !isMobile || step === 'splash';
  const showForm = !isMobile || step === 'form';

  return (
    <div className={`login-page ${isMobile ? `login-mobile login-mobile-${step}` : 'login-desktop'}`}>
      {showSplash && (
        <section className="login-visual">
          <div className="wave wave-a" />
          <div className="wave wave-b" />
          <div className="login-visual-copy">
            <img className="login-hero-logo" src="/surfsync-logo-clear.png" alt="SurfSync Infotech" />
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          {isMobile && (
            <div className="login-splash-actions">
              <button type="button" className="primary-btn login-continue-btn" onClick={() => setStep('form')}>
                {continueLabel}
              </button>
            </div>
          )}
        </section>
      )}

      {showForm && (
        <section className={`login-panel ${isMobile ? 'login-panel-sheet' : ''}`}>
          {children}
        </section>
      )}
    </div>
  );
}
