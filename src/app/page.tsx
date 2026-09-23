import { content } from '@/data/content';
import { Reveal } from '@/components/reveal';

function Arrow() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="arrow"><path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Home() {
  const { hero, contact } = content;
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">{content.accessibility.skip}</a>
      <header className="flex items-center justify-between gap-6 py-8 md:py-10">
        <a href="#main" className="wordmark font-mono" aria-label={content.brand.label}>{content.brand.name}<span className="text-accent">{content.brand.suffix}</span></a>
        <nav aria-label={content.accessibility.navigation} className="flex items-center gap-5 sm:gap-10">
          {content.navigation.map(item => item.enabled
            ? <a key={item.label} href={item.href} className="nav-link font-mono">{item.label}</a>
            : <span key={item.label} aria-disabled="true" className="nav-link nav-pending font-mono">{item.label}</span>)}
        </nav>
      </header>
      <main id="main" className="hero-main">
        <Reveal>
          <div className="hero-grid">
            <section aria-labelledby="hero-title">
              <p className="status font-mono"><span aria-hidden="true" />{hero.status}</p>
              <h1 id="hero-title">{hero.firstName}<br /><span className="text-accent">{hero.lastName}<span className="name-period">.</span></span></h1>
              <p className="role font-mono"><span aria-hidden="true" className="text-accent">&gt; </span>{hero.role}<span aria-hidden="true" className="text-accent">_</span></p>
              <div className="intro"><p>{hero.introduction}</p><p>{hero.education}</p></div>
              <div id="contato" className="contact">
                <nav aria-label={content.accessibility.social} className="social-links">
                  {contact.links.map(link => <a key={link.label} className={`social-link social-${link.style} font-mono`} href={link.href} {...(link.href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{link.label}<Arrow /></a>)}
                </nav>
                <a href={`mailto:${contact.email}`} className="email font-mono">{contact.email}</a>
              </div>
            </section>
            <div className="technical-mark" aria-hidden="true"><div className="braces font-mono"><span>{'{'}</span><span>{'}'}</span></div><p className="font-mono">{hero.technologies.join(' / ')}</p></div>
          </div>
        </Reveal>
      </main>
      <footer className="hero-footer font-mono"><span>{hero.section}</span><span>{hero.location}</span></footer>
    </div>
  );
}
