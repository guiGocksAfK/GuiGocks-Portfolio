'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { EnvelopeSprite, RobotSprite } from '@/components/robot-sprite';

const SHOW_FOR = 2200;

// Clicking the email copies it; a mail robot pops up beside it holding an envelope and a "copied" bubble.
// When copying is not possible the link opens the mail app as usual.
export function EmailCopy({ email, copiedLabel, copyHint }: { email: string; copiedLabel: string; copyHint: string }) {
  const [delivery, setDelivery] = useState(0);

  useEffect(() => {
    if (!delivery) return;
    const timer = setTimeout(() => setDelivery(0), SHOW_FOR);
    return () => clearTimeout(timer);
  }, [delivery]);

  async function copy(event: MouseEvent<HTMLAnchorElement>) {
    if (!navigator.clipboard) return;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(email);
      setDelivery(count => count + 1);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  }

  return (
    <span className="email-wrap">
      <a href={`mailto:${email}`} className="email font-mono" title={copyHint} onClick={copy}>{email}</a>
      <span className="sr-only" aria-live="polite">{delivery ? copiedLabel : ''}</span>
      {delivery > 0 && (
        <span key={delivery} className="mailman" aria-hidden="true">
          <span className="mailman-bubble font-mono">{copiedLabel}</span>
          <span className="mailman-envelope"><EnvelopeSprite /></span>
          <span className="mailman-robot"><RobotSprite pose="carry" mood="happy" /></span>
        </span>
      )}
    </span>
  );
}
