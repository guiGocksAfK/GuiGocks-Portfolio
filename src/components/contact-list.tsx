'use client';

import { useEffect, useState } from 'react';

type Row = { label: string; value: string; action: string; kind: 'copy' | 'external' | 'download'; href: string | null };

const COPIED_FOR = 2200;

function RowIcon({ kind }: { kind: Row['kind'] }) {
  const paths = {
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15V6a1 1 0 0 1 1-1h9" /></>,
    external: <path d="M7 17 17 7M8 7h9v9" />,
    download: <path d="M12 5v12M6 12l6 6 6-6M5 20h14" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="contact-icon">{paths[kind]}</svg>;
}

// Contact as an editorial list: one full-width row per channel, label, big value and the action on the right.
// The email row copies the address (falling back to the mail app); rows without a destination yet show as pending.
export function ContactList({ rows, copiedLabel, pendingLabel }: { rows: readonly Row[]; copiedLabel: string; pendingLabel: string }) {
  const [copied, setCopied] = useState(false);

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
        const inner = (action: string) => (
          <>
            <span className="contact-label font-mono">{row.label}</span>
            <span className="contact-value">{row.value}</span>
            <span className="contact-action font-mono">{action}{row.href && <RowIcon kind={row.kind} />}</span>
          </>
        );
        if (!row.href) {
          return <li key={row.label}><span className="contact-row contact-row-pending" aria-disabled="true">{inner(pendingLabel)}</span></li>;
        }
        if (row.kind === 'copy') {
          return (
            <li key={row.label}>
              <button type="button" className="contact-row" onClick={() => copy(row.href ?? '')}>{inner(copied ? copiedLabel : row.action)}</button>
              <span className="sr-only" aria-live="polite">{copied ? copiedLabel : ''}</span>
            </li>
          );
        }
        return (
          <li key={row.label}>
            <a className="contact-row" href={row.href} {...(row.kind === 'external' ? { target: '_blank', rel: 'noopener noreferrer' } : { download: '' })}>{inner(row.action)}</a>
          </li>
        );
      })}
    </ul>
  );
}
