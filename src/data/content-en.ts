import { content } from '@/data/content';

// Project names as they appear on the project cards, so the tool crates can link to them (the real names stay).
const MYRANK = 'MyRank';
const AJT = 'AJT Viagens e Turismo';
const ESCOLA = 'Escola Imaculada';
const PORTFOLIO = 'This portfolio';

// The English version of the site's copy (the page at /en), the same shape as the Portuguese one in content.ts.
// Section anchors (#projetos, #sobre...) stay the same in both, so switching language can land on the same spot.
export const contentEn = {
  metadata: {
    title: 'Gocks.dev | Guilherme Gocks',
    description: 'Full-stack developer focused on Java, Spring Boot and React. Software Engineering student at UniAmérica, open to opportunities.',
  },
  brand: { name: 'gocks', suffix: '.dev', label: 'Guilherme Gabriel Gocks — home' },
  language: { current: 'EN', target: 'PT', href: '/', tripLabel: 'Português', action: 'View the site in Portuguese' },
  accessibility: { skip: 'Skip to content', navigation: 'Main navigation', social: 'Contact links' },
  navigation: [
    { label: 'Projects', href: '#projetos', enabled: true },
    { label: 'About', href: '#sobre', enabled: true },
    { label: 'Capabilities', href: '#capacidades', enabled: true },
    { label: 'Contact', href: '#contato', enabled: true },
  ],
  hero: {
    status: 'Open to opportunities',
    firstName: 'Guilherme Gabriel',
    lastName: 'Gocks',
    role: 'Full-stack developer',
    introduction: 'I build complete web applications, from the database to the interface, with code that is organized, tested and ready to grow.',
    technologies: content.hero.technologies,
    section: '01 — Introduction',
    location: 'Foz do Iguaçu, Brazil',
  },
  about: {
    section: '03 — About',
    title: 'About me.',
    footerNote: 'Software Engineering · UniAmérica',
    paragraphs: [
      'I started with C++ in Code::Blocks, solving college exercises. Today I write systems that teachers open every morning to take attendance, and that changes everything: when something breaks, it’s not a grade that drops, it’s someone’s day that stops.',
      'That’s why I like big, well-tested projects, built with the kind of care users don’t see but feel, finding a new detail every time they use them. I work best with organization: a clear scope, well-split tasks and everyone rowing in the same direction.',
    ],
    // Word in the story whose last letter falls off and gets fixed at the end of the About scene (must appear in a paragraph).
    bugWord: 'tested',
    badge: {
      role: 'Full-stack developer',
      location: 'Foz do Iguaçu, Brazil',
      lookingLabel: 'Looking for',
      spyLine: 'That’s the boss.',
      lookingText: 'A team where I can deliver from day one: internship or junior, front end, back end or full stack. On-site in Foz do Iguaçu or remote, including for companies outside Brazil.',
    },
    timelineLabel: 'Journey',
    nextFloor: { label: 'Next floor', text: 'your company?', href: 'mailto:guigocks@gmail.com' },
    timeline: [
      { year: '2025', text: 'Started Software Engineering at UniAmérica' },
      { year: '2025', text: 'First contact with programming, in C++' },
      { year: '2026', text: 'First projects for a company and a school: AJT Viagens and Escola Imaculada' },
      { year: '2026', text: 'First solo project: MyRank' },
    ],
    photo: content.about.photo,
    photoAlt: 'Photo of Guilherme Gabriel Gocks',
    avatarLabel: 'Pixel-art avatar of Guilherme wearing a hard hat',
  },
  capabilities: {
    section: '04 — Capabilities',
    title: 'Capabilities.',
    countLabel: 'tools',
    shelves: [
      { label: 'Languages', items: [
        { name: 'Java', projects: [AJT, MYRANK] },
        { name: 'TypeScript', projects: [ESCOLA, PORTFOLIO, AJT] },
        { name: 'JavaScript', projects: [MYRANK] },
        { name: 'Python', projects: [`${MYRANK} (Discord bot)`] },
      ] },
      { label: 'Backend', items: [
        { name: 'Spring Boot', projects: [MYRANK, AJT], used: ['Web', 'Data JPA', 'Security (JWT)', 'Validation', 'WebSocket', 'Cache + Caffeine', 'OpenFeign'] },
        { name: 'Node.js', projects: [ESCOLA], used: ['NestJS'] },
        { name: 'Prisma', projects: [ESCOLA] },
        { name: 'Flyway', projects: [MYRANK, AJT] },
      ] },
      { label: 'Frontend', items: [
        { name: 'React', projects: [PORTFOLIO, MYRANK] },
        { name: 'Angular', projects: [ESCOLA, AJT], used: ['Angular Material'] },
        { name: 'Tailwind CSS', projects: [PORTFOLIO, MYRANK, AJT] },
        { name: 'Vite', projects: [MYRANK] },
        { name: 'Next.js', projects: [PORTFOLIO] },
      ] },
      { label: 'Databases', items: [
        { name: 'SQL', projects: [MYRANK, AJT, ESCOLA], used: ['SQL migrations (Flyway)'] },
        { name: 'PostgreSQL', projects: [AJT, ESCOLA, MYRANK] },
      ] },
      { label: 'Infra and DevOps', items: [
        { name: 'Docker', projects: [ESCOLA, AJT, MYRANK], used: ['Docker Compose'] },
        { name: 'Caddy', projects: [MYRANK, ESCOLA] },
        { name: 'Oracle Cloud', projects: [ESCOLA, MYRANK] },
        { name: 'Neon', projects: [ESCOLA, MYRANK] },
        { name: 'Vercel', projects: [ESCOLA, MYRANK, PORTFOLIO] },
        { name: 'Git and GitHub', projects: [AJT, ESCOLA, MYRANK, PORTFOLIO] },
      ] },
    ],
    counter: { hint: 'Click a crate to see what’s inside', nudge: 'Taking too long? Switch the pump off.', pumpOff: 'Switch the pump off (no animation)', pumpOn: 'Switch the pump on (with animation)', projects: 'Projects', used: 'Used' },
    languages: {
      label: 'Languages',
      items: [{ name: 'Portuguese', level: 'Native' }, { name: 'English', level: 'Advanced' }],
      chat: ['Olá!', 'Hello!'],
    },
  } as typeof content.capabilities,
  projects: {
    section: '02 — Projects',
    title: 'Featured projects.',
    countLabel: 'projects',
    screenshotLabel: 'Screenshot coming soon',
    siteLabel: 'Visit site',
    repositoryLabel: 'Repository',
    missingLinkLabel: 'Link not available yet',
    codeLabel: 'Code:',
    missingCodeLabel: 'not available',
    drawerOpenLabel: 'See technical decisions',
    drawerCloseLabel: 'Hide technical decisions',
    items: [
      {
        name: MYRANK,
        category: 'Social platform',
        description: 'A social network for ranking anything, from films and games to whatever you like, with real-time chat, achievements, AI-generated insights and a Discord bot.',
        highlights: [
          { title: 'Account takeover blocked', text: 'Social login only links to accounts whose e-mail is already confirmed. The confirmation link is stored only as a SHA-256 hash, and "resend" answers the same for any e-mail, without revealing which ones are registered.' },
          { title: 'Self-hosted on an Oracle ARM VM', text: 'The API runs with Docker Compose on a free Oracle VM in São Paulo, with a shared Caddy handling HTTPS for several projects and the database in the same region. It’s always on, boots in ~25s, uses ~336 MB of RAM and backs up the database daily.' },
          { title: 'Performance driven by measurement', text: 'A load test revealed a ~520 req/s ceiling caused by the connection pool, which went from 10 to 30. N+1 queries were removed with fetch joins, and recalculating achievements moved to the background.' },
          { title: 'Account deletion built for privacy law', text: 'Deleting an account cascades through everything without taking other people’s data with it: group ownership passes to the next member first. Deleting also asks for the password, so a stolen token isn’t enough. Designed around Brazil’s data protection law (LGPD).' },
          { title: 'A Discord bot with no business logic', text: 'The bot is just an HTTP client of the Java API: it authenticates with a service key, stays off if the key is missing and is rate limited per Discord user, since every request comes from the same IP.' },
          { title: 'Scores weighted by time', text: '`score + log10(minutes / 60)`: 100 hours of a game aren’t worth 100 times an hour of film. The formula lives only in the backend, so the site and the bot never show different scores.' },
          { title: 'Cheap, swappable AI Insights', text: 'Gemini is called through its OpenAI-compatible endpoint, so switching providers is a configuration change. Answers are cached by the selection’s hash, and the follow-up chat is limited to 15 messages a day, which keeps the cost at zero.' },
          { title: 'Real-time chat with a plan B', text: 'DMs and groups share one model, with owner, admin, moderator and member roles. Real time runs on WebSocket (STOMP) with polling as a fallback, and unread counts come from a read cursor per member instead of marking message by message.' },
        ],
        stack: ['React 19', 'Vite', 'Tailwind CSS', 'Spring Boot 3', 'Java 17', 'PostgreSQL', 'Flyway', 'Docker'],
        stamp: { label: 'In production', tone: 'accent' },
        site: 'https://myrank-oficial.vercel.app',
        repositories: [{ label: 'Frontend', href: 'https://github.com/guiGocksAfK/MyRank-frontend' }, { label: 'Backend', href: 'https://github.com/guiGocksAfK/MyRank-backend' }, { label: 'Discord bot', href: 'https://github.com/guiGocksAfK/MyRank-discordBot' }],
        screenshot: '/projects/MyRank.png',
        screenshotAlt: 'MyRank’s home page with film posters and the slogan “Your taste. Your ranking. Your identity.”',
      },
      {
        name: ESCOLA,
        category: 'System in use by schools',
        description: 'Class register and attendance used by schools in Curitiba and Cascavel, bringing the teaching routine and the students’ records together.',
        highlights: [
          { title: 'Sessions revoked at once, no blacklist', text: 'The token only says who the person is: their role and school are read from the database on every request, by primary key. A removed teacher loses access immediately, not 8 hours later, with no blacklist to keep in sync. The cost was measured, and the cache design is already documented.' },
          { title: 'Not moving to cookies, on purpose', text: 'Front end and API live on different domains, so an httpOnly cookie would need `SameSite=None` and open a CSRF gap that the `Authorization` header doesn’t have. The decision is documented, with the right path in the right order: unify the domain before moving the token.' },
          { title: 'Backups that aren’t theatre', text: 'Three layers (Neon PITR, a daily dump and a copy on Backblaze B2), encrypted at the source with the key off the server. Object Lock keeps the history from being deleted even with the VM’s key, an alert fires if backups stop, and restoring was actually tested.' },
          { title: 'Closed by default', text: 'Every route starts protected, and opening one takes an explicit `@Public()`. The API refuses to start in production with a weak secret, open CORS or rate limiting off. Over 100 smoke tests prove the isolation: one school’s principal gets a 403 on another school’s class.' },
        ],
        stack: ['Angular', 'NestJS', 'PostgreSQL', 'Prisma'],
        stamp: { label: 'In real use', tone: 'accent' },
        site: 'https://escola-imaculada.vercel.app',
        repositories: [{ label: 'Frontend', href: 'https://github.com/guiGocksAfK/EscolaImaculada-frontend' }, { label: 'Backend', href: 'https://github.com/guiGocksAfK/EscolaImaculada-backend' }],
        screenshot: '/projects/EscolaImaculada.png',
        screenshotAlt: 'Login screen of Escola Imaculada’s class register',
      },
      {
        name: AJT,
        category: 'Academic group project',
        description: 'A management system for a travel agency, built as a team: transfers, service orders and passengers organized in one place.',
        highlights: [
          { title: 'Encrypted passenger documents', text: 'An `AttributeConverter` encrypts the field with AES-256-GCM without the service knowing. The format stores `v1:` + IV + text + tag, so the algorithm can change without breaking old data, and legacy plain-text records are re-encrypted on their next save, with no downtime.' },
          { title: 'Tests against a real database', text: 'Testcontainers starts a real PostgreSQL, not H2, and WireMock stands in for the exchange-rate API without going online: mocks don’t catch SQL or JPA mapping errors. The containers start once for the whole suite, so JUnit doesn’t recreate them on a new port between classes.' },
          { title: 'Exchange rates down don’t block a booking', text: 'Rates come from an external API through Feign, with a cache. If it goes down, the transfer is still saved: the base value stays pending and the error becomes a log entry, not an exception on the screen of whoever is working.' },
          { title: 'Injection-proof logs', text: 'Before logging what a user typed, `\\r`, `\\n` and `\\t` are replaced, so nobody can forge fake log lines by typing a line break into the username field.' },
        ],
        stack: ['Angular', 'Spring Boot 3', 'Java 17', 'Spring Security', 'PostgreSQL', 'Flyway'],
        stamp: { label: 'Academic project', tone: 'muted' },
        site: null,
        repositories: [{ label: 'Frontend', href: 'https://github.com/k9milly/AJT-Frontend' }, { label: 'Backend', href: 'https://github.com/guiPinheiroAfK/AJT-Backend' }],
        screenshot: '/projects/AJT.png',
        screenshotAlt: 'AJT Viagens admin dashboard with a summary of transfers and service orders',
      },
    ] as typeof content.projects.items,
  },
  contactSection: {
    section: '05 — Contact',
    title: 'Shall we build something together?',
    status: ['Available', 'Internship and junior', 'On-site or remote', 'Foz do Iguaçu, Brazil'],
    footerNote: 'Thanks for visiting',
    skipLabel: 'Skip animation ⏭',
    // typo: how the title gets misspelt at first; keep: what stays when the typo is erased (both must start the title).
    lines: { call: 'PAINT, NOW!!', stop: 'ENOUGH!!', typo: 'Shall we biuld', keep: 'Shall we b', nothing: 'NOTHING HERE :)', late: 'You’re late, we already built it all :)',
      jokes: ['Long one, huh?', 'You can skip, I won’t tell', 'Still time to skip!'], finale: 'Ok, now the ending is worth it',
    },
    copiedLabel: 'Copied!',
    pendingLabel: 'coming soon',
    zapReady: 'Works now →',
    rows: [
      { label: 'E-mail', value: 'guigocks@gmail.com', action: 'Copy e-mail', kind: 'copy', href: 'guigocks@gmail.com' },
      { label: 'WhatsApp', value: 'Message on WhatsApp', action: 'Open a WhatsApp chat', kind: 'external', icon: 'whatsapp', href: `https://wa.me/5545999546529?text=${encodeURIComponent('Hi, Guilherme! I saw your portfolio and would like to talk.')}` },
      { label: 'Résumé', value: 'Download PDF', action: 'Download résumé', kind: 'download', href: '/curriculo-guilherme-gocks.pdf' },
    ],
  } as typeof content.contactSection,
  contact: {
    email: 'guigocks@gmail.com',
    copiedLabel: 'Copied!',
    copyHint: 'Click to copy the e-mail',
    tools: { label: 'See my tools', href: '#capacidades' },
    links: content.contact.links,
  },
  teleport: { home: 'Home' },
  footer: {
    sign: ['gocks.dev', 'Engineer in charge Guilherme Gabriel Gocks', 'Started 2026', 'Completion: never, always under maintenance'],
    topLabel: 'Top',
    topAction: 'Back to top',
    disclaimer: 'No robots were harmed in the making of this site. (One shorted out in the lake, but it’s doing fine.)',
  },
} as const;

// What a page's copy looks like, in either language.
export type SiteContent = typeof content | typeof contentEn;
