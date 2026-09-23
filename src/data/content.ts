// All visible copy and destinations live here. Future sections can be added here.
export const content = {
  metadata: {
    title: 'Guilherme Gabriel Gocks | Desenvolvedor full-stack',
    description: 'Desenvolvedor full-stack com foco em Java, Spring Boot e React. Estudante de Engenharia de Software na UniAmérica, aberto a oportunidades na área.',
  },
  brand: { name: 'gocks', suffix: '.dev', label: 'Guilherme Gabriel Gocks — início' },
  accessibility: { skip: 'Ir para o conteúdo', navigation: 'Navegação principal', social: 'Links de contato' },
  // These sections are intentionally inactive until their implementation is approved.
  navigation: [
    { label: 'Projetos', href: '#projetos', enabled: true },
    { label: 'Sobre', href: '#sobre', enabled: false },
    { label: 'Contato', href: '#contato', enabled: true },
  ],
  hero: {
    status: 'Aberto a oportunidades',
    firstName: 'Guilherme Gabriel',
    lastName: 'Gocks',
    role: 'Full-stack developer',
    introduction: 'Desenvolvo aplicações com Java, Spring Boot e React.',
    education: 'Estudante de Engenharia de Software na UniAmérica.',
    // Shown one group at a time in the hero, each group starting with the main tool.
    technologies: [
      { label: 'backend', items: ['Java', 'Spring Boot', 'Node.js', 'Python'] },
      { label: 'frontend', items: ['TypeScript', 'JavaScript', 'React', 'Next.js', 'Angular'] },
      { label: 'infra', items: ['Docker', 'Oracle Cloud', 'Vercel', 'Neon'] },
    ],
    section: '01 — Apresentação',
    location: 'Foz do Iguaçu, PR',
  },
  projects: {
    section: '02 — Projetos',
    title: 'Projetos em destaque.',
    countLabel: 'projetos',
    screenshotLabel: 'Screenshot em breve',
    siteLabel: 'Ver site',
    repositoryLabel: 'Repositório',
    missingLinkLabel: 'Link ainda não informado',
    codeLabel: 'Código:',
    missingCodeLabel: 'não informado',
    drawerOpenLabel: 'Ver decisões técnicas',
    drawerCloseLabel: 'Esconder decisões técnicas',
    items: [
      {
        name: 'MyRank',
        category: 'Plataforma social',
        description: 'Uma plataforma para organizar e compartilhar rankings de filmes, séries, jogos, livros e animes.',
        highlights: [
          'Nota ponderada pelo tempo: Nota_Final = Nota_Original + log10(Minutos/60).',
          'Autenticação JWT e login social com Google e Discord.',
          'Integração com TMDB, Google Books, RAWG e Jikan.',
          'Frontend na Vercel, backend em VM Oracle Cloud e PostgreSQL no Neon.',
        ],
        stack: ['React 19', 'Vite', 'Tailwind CSS', 'Spring Boot 3', 'Java 17', 'PostgreSQL', 'Flyway', 'Docker'],
        stamp: { label: 'Em produção', tone: 'accent' },
        site: 'https://myrank-oficial.vercel.app',
        repositories: [{ label: 'Frontend', href: 'https://github.com/guiGocksAfK/MyRank-frontend' }, { label: 'Backend', href: 'https://github.com/guiGocksAfK/MyRank-backend' }, { label: 'Bot Discord', href: 'https://github.com/guiGocksAfK/MyRank-discordBot' }],
        screenshot: '/projects/MyRank.png',
        screenshotAlt: 'Página inicial do MyRank com capas de filmes e o slogan “Seu gosto. Seu ranking. Sua identidade.”',
      },
      {
        name: 'Escola Imaculada',
        category: 'Sistema em uso por escolas',
        description: 'Registro de classe e chamada usado por escolas em Curitiba e Cascavel, reunindo a rotina pedagógica e o histórico dos alunos.',
        highlights: [
          'Acesso por papel: a diretora acompanha todas as turmas; cada professora acessa a própria.',
          'Chamada diária e avaliações descritivas em um único sistema.',
          'Preservação do histórico de alunos transferidos e exportação mensal para impressão.',
        ],
        stack: ['Angular', 'NestJS', 'PostgreSQL', 'Prisma'],
        stamp: { label: 'Em uso real', tone: 'accent' },
        site: 'https://escola-imaculada.vercel.app',
        repositories: [{ label: 'Frontend', href: 'https://github.com/guiGocksAfK/EscolaImaculada-frontend' }, { label: 'Backend', href: 'https://github.com/guiGocksAfK/EscolaImaculada-backend' }],
        screenshot: '/projects/EscolaImaculada.png',
        screenshotAlt: 'Tela de login do Registro de Classe da Escola Imaculada',
      },
      {
        name: 'AJT Viagens e Turismo',
        category: 'Projeto acadêmico em grupo',
        description: 'Sistema de gestão de turismo desenvolvido em equipe, com frontend Angular e backend Java/Spring Boot.',
        highlights: [
          'Autenticação JWT com Spring Security.',
          'Respostas 401 idênticas para usuário inexistente e senha incorreta, evitando enumeração de usuários.',
          'Banco PostgreSQL com migrações versionadas pelo Flyway.',
        ],
        stack: ['Angular', 'Spring Boot 3', 'Java 17', 'Spring Security', 'PostgreSQL', 'Flyway'],
        stamp: { label: 'Projeto acadêmico', tone: 'muted' },
        site: null,
        repositories: [],
        screenshot: null,
        screenshotAlt: 'Interface do sistema AJT Viagens e Turismo',
      },
    ] as readonly {
      name: string; category: string; description: string; highlights: readonly string[];
      // Status stamped on the card by the inspector robot.
      stamp: { label: string; tone: 'accent' | 'muted' };
      stack: readonly string[]; site: string | null; repositories: readonly { label: string; href: string }[];
      // Save images in public/projects/ and use a path such as /projects/myrank.webp.
      screenshot: string | null; screenshotAlt: string;
    }[],
  },
  contact: {
    email: 'guigocks@gmail.com',
    copiedLabel: 'copiado!',
    copyHint: 'Clique para copiar o e-mail',
    links: [
      { label: 'GitHub', href: 'https://github.com/guiGocksAfK', style: 'primary' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/guilherme-gabriel-gocks-023846352', style: 'outline' },
      { label: 'Ver projetos', href: '#projetos', style: 'text' },
    ],
  },
} as const;
