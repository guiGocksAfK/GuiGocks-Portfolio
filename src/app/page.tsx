import Image from 'next/image';
import { TechnologyTyping } from '@/components/technology-typing';
import { content } from '@/data/content';
import { Reveal } from '@/components/reveal';
import { PaintedName } from '@/components/painted-name';
import { EmailCopy } from '@/components/email-copy';
import { ProjectStamp } from '@/components/project-stamp';
import { RobotSprite } from '@/components/robot-sprite';
import { PatrolRobot } from '@/components/patrol-robot';
import { ProjectDrawer } from '@/components/project-drawer';
import { AboutBadge } from '@/components/about-badge';
import { CareerBuilding } from '@/components/career-building';
import { StoryPrinter } from '@/components/story-printer';

function Arrow() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="arrow"><path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Home() {
  const { hero, contact, projects, about } = content;
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
      <main id="main">
      <div className="hero-main">
        <Reveal>
          <div className="hero-grid">
            <section aria-labelledby="hero-title">
              <p className="status font-mono"><span aria-hidden="true" />{hero.status}</p>
              <PaintedName firstName={hero.firstName} lastName={hero.lastName} />
              <p className="role font-mono"><span aria-hidden="true" className="text-accent">&gt; </span>{hero.role}<span aria-hidden="true" className="text-accent">_</span></p>
              <div className="intro"><p>{hero.introduction}</p><p>{hero.education}</p></div>
              <div id="contato" className="contact">
                <nav aria-label={content.accessibility.social} className="social-links">
                  {contact.links.map(link => {
                    const external = link.href.startsWith('https:');
                    return (
                      <a key={link.label} className={`social-link social-${link.style} font-mono`} href={link.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                        {link.label}<Arrow />
                        {/* Spy robot that peeks over the button on hover. */}
                        {external && <span className="spy" aria-hidden="true"><span className="spy-robot"><RobotSprite pose="idle" mood="happy" /></span></span>}
                      </a>
                    );
                  })}
                </nav>
                <EmailCopy email={contact.email} copiedLabel={contact.copiedLabel} copyHint={contact.copyHint} />
              </div>
            </section>
            <TechnologyTyping groups={hero.technologies} />
          </div>
        </Reveal>
      </div>
      <div className="hero-footer font-mono"><span>{hero.section}</span><span>{hero.location}</span><PatrolRobot /></div>
      <section id="projetos" aria-labelledby="projects-title" className="projects-section">
        <h2 id="projects-title">{projects.title}</h2>
        <div className="project-list">
          {projects.items.map((project, index) => (
            <Reveal key={project.name}>
              <article className="project-card" aria-labelledby={`project-${index}`}>
                <div className="project-visual">
                  <ProjectStamp label={project.stamp.label} tone={project.stamp.tone} />
                  {project.screenshot ? <div className="project-shot"><Image src={project.screenshot} alt={project.screenshotAlt} fill quality={90} sizes="(max-width: 900px) 100vw, 1200px" className="project-image" /></div> :
                    <div className="screenshot-placeholder"><span className="placeholder-number font-mono" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="font-mono">{projects.screenshotLabel}</span></div>}
                </div>
                <div className="project-details">
                  <p className="project-eyebrow font-mono"><span>{String(index + 1).padStart(2, '0')}</span>{project.category}</p>
                  <h3 id={`project-${index}`}>{project.name}</h3>
                  <p className="project-description">{project.description}</p>
                  <ul className="project-stack font-mono" aria-label={project.stack.join(', ')}>{project.stack.map(tech => <li key={tech}>{tech}</li>)}</ul>
                  {/* One compact row: the live site, then the repositories as short labels. */}
                  <div className="project-links font-mono">
                    {project.site
                      ? <a href={project.site} target="_blank" rel="noopener noreferrer" aria-label={`${projects.siteLabel} — ${project.name}`}>{projects.siteLabel}<Arrow /></a>
                      : <span className="link-missing" aria-disabled="true" title={projects.missingLinkLabel}>{projects.siteLabel}<Arrow /></span>}
                    <span className="project-code">
                      <span className="code-label">{projects.codeLabel}</span>
                      {project.repositories.length
                        ? project.repositories.map((repo, repoIndex) => (
                          <span key={repo.href} className="code-link">
                            {repoIndex > 0 && <span className="code-separator" aria-hidden="true">·</span>}
                            <a href={repo.href} target="_blank" rel="noopener noreferrer" aria-label={`${projects.repositoryLabel} ${repo.label} — ${project.name}`}>{repo.label.toLowerCase()}</a>
                          </span>
                        ))
                        : <span className="link-missing" aria-disabled="true" title={projects.missingLinkLabel}>{projects.missingCodeLabel}</span>}
                    </span>
                  </div>
                  <ProjectDrawer items={project.highlights} openLabel={projects.drawerOpenLabel} closeLabel={projects.drawerCloseLabel} slotId={`drawer-slot-${index}`} />
                </div>
                {/* Full-width slot under the card where the decisions drawer opens. */}
                <div className="project-drawer-slot" id={`drawer-slot-${index}`} />
              </article>
            </Reveal>
          ))}
        </div>
        {/* Each section ends with its number and name, like the hero. */}
        <div className="section-footer font-mono"><span>{projects.section}</span><span>{projects.items.length} {projects.countLabel}</span><PatrolRobot /></div>
      </section>
      <section id="sobre" aria-labelledby="about-title" className="about-section">
        <h2 id="about-title">{about.title}</h2>
        <div className="about-grid">
          <AboutBadge
            name={`${hero.firstName} ${hero.lastName}`} role={about.badge.role} location={about.badge.location}
            lookingLabel={about.badge.lookingLabel} lookingText={about.badge.lookingText}
            photo={about.photo} photoAlt={about.photoAlt} avatarLabel={about.avatarLabel}
          />
          <div className="about-main">
            <StoryPrinter paragraphs={about.paragraphs} />
            <p className="about-label font-mono">{about.timelineLabel}</p>
            <CareerBuilding steps={about.timeline} next={about.nextFloor} />
          </div>
        </div>
        <div className="section-footer font-mono"><span>{about.section}</span><span>{about.footerNote}</span><PatrolRobot /></div>
      </section>
      </main>
    </div>
  );
}
