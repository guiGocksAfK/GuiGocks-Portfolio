// All visible copy and destinations live here. Future sections can be added here.
export const content = {
  metadata: {
    title: 'Gocks.dev | Guilherme Gocks',
    description: 'Desenvolvedor full-stack com foco em Java, Spring Boot e React. Estudante de Engenharia de Software na UniAmérica, aberto a oportunidades na área.',
  },
  brand: { name: 'gocks', suffix: '.dev', label: 'Guilherme Gabriel Gocks — início' },
  accessibility: { skip: 'Ir para o conteúdo', navigation: 'Navegação principal', social: 'Links de contato' },
  // These sections are intentionally inactive until their implementation is approved.
  navigation: [
    { label: 'Projetos', href: '#projetos', enabled: true },
    { label: 'Sobre', href: '#sobre', enabled: true },
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
  about: {
    section: '03 — Sobre',
    title: 'Sobre mim.',
    footerNote: 'Engenharia de Software · UniAmérica',
    paragraphs: [
      'Comecei a programar em C++, no Code::Blocks. De lá para cá, troquei os primeiros exercícios por sistemas de verdade: hoje construo aplicações completas, do banco de dados à interface.',
      'Gosto de projetos grandes e bem testados, daqueles em que o usuário descobre um detalhe novo a cada uso. Trabalho melhor com organização: escopo bem definido, tarefas claras e uma equipe alinhada.',
    ],
    // Word in the story whose last letter falls off and gets fixed at the end of the About scene (must appear in a paragraph).
    bugWord: 'testados',
    // Construction-site ID badge delivered by the drone.
    badge: {
      role: 'Full-stack developer',
      location: 'Foz do Iguaçu, PR',
      lookingLabel: 'Procurando',
      lookingText: 'Vagas que usem a minha stack, em qualquer formato: presencial em Foz do Iguaçu, remoto ou em outro país.',
    },
    timelineLabel: 'Trajetória',
    // Dashed top floor of the career building.
    nextFloor: { label: 'Próximo andar', text: 'sua empresa?', href: 'mailto:guigocks@gmail.com' },
    timeline: [
      { year: '2025', text: 'Entrada em Engenharia de Software na UniAmérica' },
      { year: '2025', text: 'Primeiro contato com programação, em C++' },
      { year: '2026', text: 'Primeiros projetos para uma empresa e uma escola: AJT Viagens e Escola Imaculada' },
      { year: '2026', text: 'Primeiro projeto individual: o MyRank' },
    ],
    // Until a real photo exists the badge shows a pixel-art avatar: save the photo in public/ (e.g. /about/foto.webp) and set the path here.
    photo: null as string | null,
    photoAlt: 'Foto de Guilherme Gabriel Gocks',
    avatarLabel: 'Avatar em pixel art de Guilherme com capacete de obra',
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
          { title: 'Sequestro de conta bloqueado', text: 'Login social só se une a contas com e-mail já confirmado. O link de confirmação é salvo apenas como hash SHA-256, e o "reenviar" responde igual para qualquer e-mail, sem revelar quais estão cadastrados.' },
          { title: 'Infraestrutura própria numa VM ARM da Oracle', text: 'A API roda com Docker Compose numa VM gratuita da Oracle em São Paulo, com um Caddy compartilhado fazendo o HTTPS de vários projetos e o banco na mesma região. Ela fica sempre ligada, sobe em ~25s, usa ~336 MB de RAM e tem backup diário do banco.' },
          { title: 'Performance guiada por medição', text: 'Um teste de carga revelou um teto de ~520 req/s causado pelo pool de conexões, que passou de 10 para 30. Consultas N+1 foram eliminadas com fetch joins, e o recálculo de conquistas foi para segundo plano.' },
          { title: 'Exclusão de conta pensada para a LGPD', text: 'A exclusão apaga tudo em cascata sem levar junto dados de outras pessoas: antes, o cargo de dono dos grupos passa para o próximo membro. Excluir também exige a senha, então um token roubado não basta.' },
          { title: 'Bot do Discord sem regra de negócio', text: 'O bot é só um cliente HTTP da API Java: autentica com uma chave de serviço, fica desligado se ela faltar e tem limite de requisições por usuário do Discord, já que todos saem do mesmo IP.' },
          { title: 'Nota ponderada por tempo', text: '`nota + log10(minutos / 60)`: 100 horas de jogo não valem 100 vezes uma hora de filme. O cálculo existe só no backend, então site e bot nunca mostram notas diferentes.' },
          { title: 'IA Insights barata e trocável', text: 'O Gemini é chamado pelo endpoint compatível com a API da OpenAI, então trocar de provedor é só mudar a configuração. As respostas ficam em cache pelo hash da seleção, e o chat de acompanhamento tem limite de 15 mensagens por dia, o que mantém o custo em zero.' },
          { title: 'Chat em tempo real com plano B', text: 'DMs e grupos usam o mesmo modelo, com cargos de dono, admin, moderador e membro. O tempo real usa WebSocket (STOMP) com polling como reserva, e as não lidas vêm de um cursor de leitura por membro, em vez de marcar mensagem por mensagem.' },
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
          { title: 'Acesso por papel', text: 'A diretora acompanha todas as turmas; cada professora acessa apenas a própria.' },
          { title: 'Rotina em um só lugar', text: 'Chamada diária e avaliações descritivas no mesmo sistema.' },
          { title: 'Histórico preservado', text: 'Alunos transferidos mantêm o histórico, e a chamada do mês é exportada para impressão.' },
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
          { title: 'Autenticação com JWT', text: 'Login protegido com Spring Security e tokens JWT.' },
          { title: 'Sem enumeração de usuários', text: 'Usuário inexistente e senha incorreta recebem a mesma resposta 401, então o login não revela quem está cadastrado.' },
          { title: 'Banco versionado', text: 'PostgreSQL com migrações versionadas pelo Flyway.' },
        ],
        stack: ['Angular', 'Spring Boot 3', 'Java 17', 'Spring Security', 'PostgreSQL', 'Flyway'],
        stamp: { label: 'Projeto acadêmico', tone: 'muted' },
        site: null,
        repositories: [{ label: 'Frontend', href: 'https://github.com/k9milly/AJT-Frontend' }, { label: 'Backend', href: 'https://github.com/guiPinheiroAfK/AJT-Backend' }],
        screenshot: '/projects/AJT.png',
        screenshotAlt: 'Painel administrativo do AJT Viagens com resumo de transfers e ordens de serviço',
      },
    ] as readonly {
      name: string; category: string; description: string;
      // Technical decisions shown in the card's drawer; `backticks` in text render as inline code.
      highlights: readonly { title: string; text: string }[];
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
    ],
  },
} as const;
