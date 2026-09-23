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
    // Ordered backend → frontend → infra, each group starting with the main tool.
    technologies: ['Java', 'Spring Boot', 'Node.js', 'Python', 'TypeScript', 'JavaScript', 'React', 'Next.js', 'Angular', 'Docker', 'Oracle Cloud', 'Vercel', 'Neon'],
    section: '01 — Apresentação',
    location: 'Foz do Iguaçu, PR',
  },
  projects: {
    section: '02 — Projetos',
    title: 'Projetos em destaque.',
    screenshotLabel: 'Screenshot em breve',
    siteLabel: 'Ver site',
    repositoryLabel: 'Repositório',
    missingLinkLabel: 'Link ainda não informado',
    highlightsLabel: 'Decisões e destaques',
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
        site: 'https://myrank-oficial.vercel.app',
        repositories: [{ label: 'Frontend', href: 'https://github.com/guiGocksAfK/MyRank-frontend' }, { label: 'Backend', href: 'https://github.com/guiGocksAfK/MyRank-backend' }, { label: 'Bot Discord', href: 'https://github.com/guiGocksAfK/MyRank-discordBot' }],
        screenshot: null,
        screenshotAlt: 'Interface da plataforma MyRank',
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
        site: 'https://escola-imaculada.vercel.app',
        repositories: [{ label: 'Frontend', href: 'https://github.com/guiGocksAfK/EscolaImaculada-frontend' }, { label: 'Backend', href: 'https://github.com/guiGocksAfK/EscolaImaculada-backend' }],
        screenshot: null,
        screenshotAlt: 'Interface do sistema Escola Imaculada',
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
        site: null,
        repositories: [],
        screenshot: null,
        screenshotAlt: 'Interface do sistema AJT Viagens e Turismo',
      },
    ] as readonly {
      name: string; category: string; description: string; highlights: readonly string[];
      stack: readonly string[]; site: string | null; repositories: readonly { label: string; href: string }[];
      // Save images in public/projects/ and use a path such as /projects/myrank.webp.
      screenshot: string | null; screenshotAlt: string;
    }[],
  },
  contact: {
    email: 'guigocks@gmail.com',
    links: [
      { label: 'GitHub', href: 'https://github.com/guiGocksAfK', style: 'primary' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/guilherme-gabriel-gocks-023846352', style: 'outline' },
      { label: 'Ver projetos', href: '#projetos', style: 'text' },
    ],
  },
} as const;
