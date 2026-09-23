'use client';

import { useEffect, useState } from 'react';

export function TechnologyTyping({ words }: { words: readonly string[] }) {
  const [text, setText] = useState(words[0] ?? '');

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wordIndex = 0;
    let length = words[0]?.length ?? 0;
    let deleting = true;

    function tick() {
      const word = words[wordIndex];
      if (!word || preference.matches) return;
      length += deleting ? -1 : 1;
      setText(word.slice(0, length));
      let delay = deleting ? 55 : 110;
      if (length === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        delay = 300;
      } else if (length === word.length && !deleting) {
        deleting = true;
        delay = 1800;
      }
      timer = setTimeout(tick, delay);
    }

    function restart() {
      clearTimeout(timer);
      wordIndex = 0;
      length = words[0]?.length ?? 0;
      deleting = true;
      setText(words[0] ?? '');
      if (!preference.matches && words.length > 1) timer = setTimeout(tick, 1800);
    }

    restart();
    preference.addEventListener('change', restart);
    return () => { clearTimeout(timer); preference.removeEventListener('change', restart); };
  }, [words]);

  return (
    <div className="technical-mark">
      <span className="sr-only">{words.join(', ')}</span>
      <div className="braces font-mono" aria-hidden="true">
        <span>{'{'}</span>
        <span className="typing-word"><span className="animated-tech">{text}</span><span className="static-tech">{words[0]}</span><span className="typing-cursor">_</span></span>
        <span>{'}'}</span>
      </div>
    </div>
  );
}
