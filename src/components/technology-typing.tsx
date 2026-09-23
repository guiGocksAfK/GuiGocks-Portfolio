'use client';

import { useEffect, useState } from 'react';

const VISIBLE_LINES = 6;

type Line = { word: string; length: number };

// Fills the braces line by line, then rewrites one line at a time in place, from top to bottom, cycling through every technology.
export function TechnologyTyping({ words }: { words: readonly string[] }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: Line[] = [];
    let nextWord = 0;
    let slot = 0;

    const render = (index: number | null, isErasing = false) => { setLines(current.map(line => ({ ...line }))); setActive(index); setErasing(isErasing); };
    const wait = (delay: number, step: () => void) => { timer = setTimeout(step, delay); };
    // Small random variation makes the typing feel like a person rather than a metronome.
    const typingDelay = () => 55 + Math.random() * 45;

    function startLine(index: number) {
      current[index] = { word: words[nextWord], length: 0 };
      nextWord = (nextWord + 1) % words.length;
      typeLine(index);
    }

    function typeLine(index: number) {
      if (preference.matches) return;
      const line = current[index];
      line.length += 1;
      render(index);
      if (line.length < line.word.length) return wait(typingDelay(), () => typeLine(index));
      if (current.length < VISIBLE_LINES) return wait(260, () => startLine(current.length));
      slot = (index + 1) % VISIBLE_LINES;
      wait(1100, () => eraseLine(slot));
    }

    function eraseLine(index: number) {
      if (preference.matches) return;
      const line = current[index];
      line.length -= 1;
      render(index, true);
      if (line.length > 0) return wait(28, () => eraseLine(index));
      wait(180, () => startLine(index));
    }

    function restart() {
      clearTimeout(timer);
      current = [];
      nextWord = 0;
      render(null);
      if (!preference.matches && words.length > 0) wait(600, () => startLine(0));
    }

    restart();
    preference.addEventListener('change', restart);
    return () => { clearTimeout(timer); preference.removeEventListener('change', restart); };
  }, [words]);

  return (
    <div className="technical-mark">
      <span className="sr-only">{words.join(', ')}</span>
      <div className="braces font-mono" aria-hidden="true">
        <span className="brace">{'{'}</span>
        <ul className="tech-list animated-tech">
          {lines.map((line, index) => {
            const complete = line.length === line.word.length;
            const typing = index === active && !erasing && line.length > 0;
            return (
              <li key={index} className={index === active ? 'tech-active' : undefined}>
                {typing ? <>{line.word.slice(0, line.length - 1)}<span key={line.length} className="char-in">{line.word[line.length - 1]}</span></> : line.word.slice(0, line.length)}
                {complete && index < VISIBLE_LINES - 1 && <span className="tech-comma char-in">,</span>}
                {index === active && <span className="typing-cursor" />}
              </li>
            );
          })}
        </ul>
        <ul className="tech-list static-tech">
          {words.slice(0, VISIBLE_LINES).map((word, index) => <li key={word}>{word}{index < VISIBLE_LINES - 1 && <span className="tech-comma">,</span>}</li>)}
        </ul>
        <span className="brace">{'}'}</span>
      </div>
    </div>
  );
}
