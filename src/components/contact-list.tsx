'use client';

import { useEffect, useRef, useState, type MouseEvent, type Ref } from 'react';
import { playZapGag, zapGagArmed, type ZapStep } from '@/components/zap-gag';

// action: what clicking the row does, shown only as the icon (spoken to screen readers and as a tooltip).
type Row = { label: string; value: string; action: string; kind: 'copy' | 'external' | 'download'; href: string | null; icon?: 'whatsapp' };

const COPIED_FOR = 2200;
const ZAP_SIGN_FOR = 3000; // how long the robot holds up its "now it works" sign

// WhatsApp's own glyph, in its green, so the row reads as WhatsApp at a glance.
const WHATSAPP = 'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z';

// The WhatsApp icon, with the pieces of its gag (see zap-gag.ts): the two halves it breaks into, a few falling shards
// and the tape that holds it together.
function ZapIcon({ step, iconRef }: { step: ZapStep | 'intact' | 'ready' | 'done'; iconRef: Ref<HTMLSpanElement> }) {
  const glyph = (className: string) => <svg aria-hidden="true" viewBox="0 0 24 24" className={className}><path d={WHATSAPP} /></svg>;
  return (
    <span ref={iconRef} className={`zap-icon zap-${step}`} aria-hidden="true">
      {glyph('zap-whole')}
      {glyph('zap-half zap-half-left')}
      {glyph('zap-half zap-half-right')}
      {[0, 1, 2].map(shard => <span key={shard} className={`zap-shard zap-shard-${shard}`} />)}
      <span className="zap-tape" />
    </span>
  );
}

function RowIcon({ kind }: { kind: Row['kind'] | 'copied' }) {
  const paths = {
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15V6a1 1 0 0 1 1-1h9" /></>,
    copied: <path d="M5 12.5 10 17.5 19 7" />,
    external: <path d="M7 17 17 7M8 7h9v9" />,
    download: <path d="M12 5v12M6 12l6 6 6-6M5 20h14" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="contact-icon">{paths[kind]}</svg>;
}

// Contact as an editorial list: one full-width row per channel, label, big value and the action's icon on the right.
// The email row copies the address (falling back to the mail app; a check and "copied!" confirm it); rows without a
// destination yet show as pending.
export function ContactList({ rows, copiedLabel, pendingLabel, zapReady }: { rows: readonly Row[]; copiedLabel: string; pendingLabel: string; zapReady: string }) {
  const [copied, setCopied] = useState(false);
  const [zap, setZap] = useState<ZapStep | 'intact' | 'ready' | 'done'>('intact');
  const zapIcon = useRef<HTMLSpanElement>(null);
  const zapGag = useRef<AbortController | null>(null);
  const zapLeave = useRef<(() => Promise<void>) | null>(null);

  // WhatsApp: the first click of the visit (after watching the section being built) plays the gag instead of opening;
  // the next click opens WhatsApp (and sends the robot holding its "now it works" sign back to the picnic, if it is
  // still there); a click during the gag opens WhatsApp and cuts it short.
  function openZap(event: MouseEvent<HTMLAnchorElement>) {
    if (zap === 'intact' && zapGagArmed() && zapIcon.current) {
      event.preventDefault();
      const controller = new AbortController();
      zapGag.current = controller;
      playZapGag(zapIcon.current, zapReady, setZap, controller.signal).then(leave => {
        zapLeave.current = leave;
        setZap('ready');
        // It holds up its sign for a few seconds, then goes back to the picnic on its own (or sooner, on a click).
        setTimeout(() => {
          if (zapLeave.current !== leave) return;
          zapLeave.current = null;
          void leave().catch(() => {});
        }, ZAP_SIGN_FOR);
      }, () => setZap('done'));
      return;
    }
    if (zap === 'ready' && zapLeave.current) {
      void zapLeave.current().catch(() => {});
      zapLeave.current = null;
    } else {
      zapGag.current?.abort();
      zapGag.current = null;
    }
    setZap('done');
  }
  useEffect(() => () => zapGag.current?.abort(), []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.location.assign(`mailto:${text}`);
    }
  }

  return (
    <ul className="contact-list">
      {rows.map(row => {
        const done = row.kind === 'copy' && copied;
        const inner = (
          <>
            <span className="contact-label font-mono">{row.label}</span>
            <span className="contact-value">{row.value}</span>
            <span className={`contact-action font-mono${done ? ' contact-action-done' : ''}`}>
              {!row.href ? pendingLabel : (
                <>
                  {done && <span aria-hidden="true">{copiedLabel}</span>}
                  {row.icon === 'whatsapp' ? <ZapIcon step={zap} iconRef={zapIcon} /> : <RowIcon kind={done ? 'copied' : row.kind} />}
                  <span className="sr-only">{row.action}</span>
                </>
              )}
            </span>
          </>
        );
        if (!row.href) {
          return <li key={row.label}><span className="contact-row contact-row-pending" aria-disabled="true">{inner}</span></li>;
        }
        if (row.kind === 'copy') {
          return (
            <li key={row.label}>
              <button type="button" className="contact-row" title={row.action} onClick={() => copy(row.href ?? '')}>{inner}</button>
              <span className="sr-only" aria-live="polite">{copied ? copiedLabel : ''}</span>
            </li>
          );
        }
        return (
          <li key={row.label}>
            <a
              className="contact-row" href={row.href} title={row.action} onClick={row.icon === 'whatsapp' ? openZap : undefined}
              {...(row.kind === 'external' ? { target: '_blank', rel: 'noopener noreferrer' } : { download: '' })}
            >{inner}</a>
          </li>
        );
      })}
    </ul>
  );
}
