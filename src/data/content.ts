// Project names as they appear on the project cards, so the tool crates can link to them.
const MYRANK = 'MyRank';
const AJT = 'AJT Viagens e Turismo';
const ESCOLA = 'Escola Imaculada';
const PORTFOLIO = 'Este portfólio';

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
    { label: 'Capacidades', href: '#capacidades', enabled: true },
    { label: 'Contato', href: '#contato', enabled: true },
  ],
  hero: {
    status: 'Aberto a oportunidades',
    firstName: 'Guilherme Gabriel',
    lastName: 'Gocks',
    role: 'Full-stack developer',
    introduction: 'Desenvolvo aplicações web completas, do banco de dados à interface, com código organizado, testado e pronto para crescer.',
    // Shown one group at a time in the hero, each group starting with the main tool.
    technologies: [
      { label: 'backend', items: ['Java', 'Spring Boot', 'Node.js', 'Python'] },
      { label: 'frontend', items: ['TypeScript', 'JavaScript', 'React', 'Next.js', 'Angular'] },
      { label: 'infra', items: ['Docker', 'Oracle Cloud', 'Neon', 'Vercel'] },
    ],
    section: '01 — Apresentação',
    location: 'Foz do Iguaçu, PR',
  },
  about: {
    section: '03 — Sobre',
    title: 'Sobre mim.',
    footerNote: 'Engenharia de Software · UniAmérica',
    paragraphs: [
      'Comecei a programar em C++, no Code::Blocks. De lá para cá, troquei os primeiros exercícios por sistemas de verdade, com usuários de verdade, e cada um deles me ensinou algo que nenhuma aula ensinaria.',
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
  // The tool store ("almoxarifado"): every tool on a shelf per area, marked by where it has really been used.
  capabilities: {
    section: '04 — Capacidades',
    title: 'Capacidades.',
    countLabel: 'ferramentas',
    // Each crate: the projects that use the tool (names matching a project card become links to it) and, when it
    // helps, what of it was used.
    shelves: [
      { label: 'Linguagens', items: [
        { name: 'Java', projects: [AJT, MYRANK] },
        { name: 'TypeScript', projects: [ESCOLA, PORTFOLIO, AJT] },
        { name: 'JavaScript', projects: [MYRANK] },
        { name: 'Python', projects: [`${MYRANK} (bot do Discord)`] },
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
        { name: 'Tailwind CSS', projects: [AJT] },
        { name: 'Vite', projects: [MYRANK] },
        { name: 'Next.js', projects: [PORTFOLIO] },
      ] },
      { label: 'Banco de dados', items: [
        { name: 'SQL', projects: [MYRANK, AJT, ESCOLA], used: ['Migrações em SQL (Flyway)'] },
        { name: 'PostgreSQL', projects: [AJT, ESCOLA, MYRANK] },
      ] },
      { label: 'Infra e DevOps', items: [
        { name: 'Docker', projects: [ESCOLA, AJT, MYRANK], used: ['Docker Compose'] },
        { name: 'Caddy', projects: [MYRANK, ESCOLA] },
        { name: 'Oracle Cloud', projects: [ESCOLA, MYRANK] },
        { name: 'Neon', projects: [ESCOLA, MYRANK] },
        { name: 'Vercel', projects: [ESCOLA, MYRANK, PORTFOLIO] },
        { name: 'Git e GitHub', projects: [AJT, ESCOLA, MYRANK, PORTFOLIO] },
      ] },
    ],
    // Clicking a crate sends it to the office counter, where a robot takes out what is inside.
    counter: { hint: 'Clique num caixote para ver o que tem dentro', nudge: 'Achou demorado? Desligue a bomba.', pumpOff: 'Desligar a bomba (sem animação)', pumpOn: 'Ligar a bomba (com animação)', projects: 'Projetos', used: 'Usei' },
    languages: {
      label: 'Idiomas',
      items: [{ name: 'Português', level: 'Nativo' }, { name: 'Inglês', level: 'Avançado' }],
      // What the two robots say to each other on the languages shelf.
      chat: ['Olá!', 'Hello!'],
    },
  } as {
    section: string; title: string; countLabel: string;
    shelves: readonly { label: string; items: readonly (string | { name: string; projects: readonly string[]; used?: readonly string[] })[] }[];
    counter: { hint: string; nudge: string; projects: string; used: string; pumpOff: string; pumpOn: string };
    languages: { label: string; items: readonly { name: string; level: string }[]; chat: readonly [string, string] };
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
        name: MYRANK,
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
        name: ESCOLA,
        category: 'Sistema em uso por escolas',
        description: 'Registro de classe e chamada usado por escolas em Curitiba e Cascavel, reunindo a rotina pedagógica e o histórico dos alunos.',
        highlights: [
          { title: 'Sessão revogada na hora, sem blacklist', text: 'O token só diz quem é a pessoa: o papel e a escola são lidos do banco a cada requisição, por chave primária. Uma professora removida perde o acesso na hora, não 8 horas depois, sem blacklist para sincronizar. O custo foi medido, e o desenho do cache já está documentado.' },
          { title: 'Não migrar para cookie, de propósito', text: 'Front e API estão em domínios diferentes, então um cookie httpOnly exigiria `SameSite=None` e abriria uma brecha de CSRF que o header `Authorization` não tem. A decisão ficou documentada, com o caminho certo na ordem certa: unificar o domínio antes de mudar o token de lugar.' },
          { title: 'Backup que não é teatro', text: 'Três camadas (PITR do Neon, dump diário e cópia no Backblaze B2), cifradas na origem com a chave fora do servidor. O Object Lock impede apagar o histórico mesmo com a chave da VM, um alerta avisa se o backup parar, e a restauração foi testada de verdade.' },
          { title: 'Tudo fechado por padrão', text: 'Toda rota nasce protegida, e liberar exige um `@Public()` explícito. A API se recusa a subir em produção com segredo fraco, CORS aberto ou rate limit desligado. Mais de 100 testes de fumaça provam o isolamento: a diretora de uma escola recebe 403 na turma da outra.' },
        ],
        stack: ['Angular', 'NestJS', 'PostgreSQL', 'Prisma'],
        stamp: { label: 'Em uso real', tone: 'accent' },
        site: 'https://escola-imaculada.vercel.app',
        repositories: [{ label: 'Frontend', href: 'https://github.com/guiGocksAfK/EscolaImaculada-frontend' }, { label: 'Backend', href: 'https://github.com/guiGocksAfK/EscolaImaculada-backend' }],
        screenshot: '/projects/EscolaImaculada.png',
        screenshotAlt: 'Tela de login do Registro de Classe da Escola Imaculada',
      },
      {
        name: AJT,
        category: 'Projeto acadêmico em grupo',
        description: 'Sistema de gestão de turismo desenvolvido em equipe, com frontend Angular e backend Java/Spring Boot.',
        highlights: [
          { title: 'Documento do passageiro cifrado', text: 'Um `AttributeConverter` cifra o campo com AES-256-GCM sem o service saber. O formato grava `v1:` + IV + texto + tag, então o algoritmo pode mudar sem quebrar dado antigo, e registros legados em texto puro são recifrados na próxima gravação, sem downtime.' },
          { title: 'Testes com banco de verdade', text: 'Testcontainers sobe um PostgreSQL real, não H2, e o WireMock simula a API de câmbio sem sair para a internet: mocks não pegam erro de SQL nem de mapeamento JPA. Os containers sobem uma vez para a suíte inteira, para o JUnit não recriá-los numa porta nova entre as classes.' },
          { title: 'Câmbio fora do ar não trava o cadastro', text: 'A cotação vem de uma API externa via Feign, com cache. Se ela cair, o transfer é cadastrado mesmo assim: o valor base fica pendente e o erro vira log, não uma exceção na tela de quem está trabalhando.' },
          { title: 'Log à prova de injeção', text: 'Antes de registrar o que o usuário digitou, `\\r`, `\\n` e `\\t` são trocados, então ninguém forja linhas falsas no log escrevendo uma quebra de linha no campo de usuário.' },
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
  // Last section: an editorial list of the ways to get in touch. A null href shows the row as coming soon.
  contactSection: {
    section: '05 — Contato',
    title: 'Vamos construir algo juntos?',
    status: ['Disponível', 'Estágio e júnior', 'Presencial ou remoto', 'Foz do Iguaçu, PR'],
    footerNote: 'Obrigado pela visita',
    // Sign held by the robot that lets the visitor skip the robots building the section.
    skipLabel: 'Pular animação ⏭',
    // What the robots say while building: the boss ordering paint, the boss stopping the fight.
    // typo: how the title gets misspelt at first; keep: what stays when the typo is erased (both must start the title).
    lines: { call: 'TINTA, JÁ!!', stop: 'CHEGA!!', typo: 'Vamos contruir', keep: 'Vamos con', nothing: 'NADA AQUI :)',
      // The skip robot's lines: its jokes as it peeks out, the last one before the park.
      jokes: ['Tá longo, né?', 'Pode pular, eu não conto', 'Ainda dá tempo!'], finale: 'Ok, agora vale ver o final',
    },
    copiedLabel: 'Copiado!',
    pendingLabel: 'em breve',
    // Shown by the WhatsApp button once the robot has (sort of) fixed it.
    zapReady: 'Agora funciona →',
    rows: [
      { label: 'E-mail', value: 'guigocks@gmail.com', action: 'Copiar e-mail', kind: 'copy', href: 'guigocks@gmail.com' },
      // WhatsApp: https://wa.me/55<DDD><número> (only digits), with a message ready to send.
      { label: 'WhatsApp', value: 'Chamar no WhatsApp', action: 'Abrir conversa no WhatsApp', kind: 'external', icon: 'whatsapp', href: `https://wa.me/5545999546529?text=${encodeURIComponent('Olá, Guilherme! Vi seu portfólio e gostaria de conversar.')}` },
      // Résumé: the PDF in public/ (its file name is what the visitor's download gets).
      { label: 'Currículo', value: 'Baixar em PDF', action: 'Baixar currículo', kind: 'download', href: '/curriculo-guilherme-gocks.pdf' },
    ],
  } as {
    section: string; title: string; status: readonly string[]; footerNote: string; skipLabel: string; lines: { call: string; stop: string; typo: string; keep: string; nothing: string; jokes: readonly string[]; finale: string }; copiedLabel: string; pendingLabel: string; zapReady: string;
    rows: readonly { label: string; value: string; action: string; kind: 'copy' | 'external' | 'download'; href: string | null; icon?: 'whatsapp' }[];
  },
  contact: {
    email: 'guigocks@gmail.com',
    copiedLabel: 'Copiado!',
    copyHint: 'Clique para copiar o e-mail',
    links: [
      { label: 'GitHub', href: 'https://github.com/guiGocksAfK', style: 'primary' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/guilherme-gabriel-gocks-023846352', style: 'outline' },
    ],
  },
  // What the teleport's trip screen calls the top of the page (the other destinations use the menu's names).
  teleport: { home: 'Início' },
  // The page's footer: one thin line like the ones closing each section, with the building site's sign (the "placa
  // de obra") summed up in a line, a tiny builders' lift back to the top and the small print.
  footer: {
    sign: ['gocks.dev', 'Resp. técnico Guilherme Gabriel Gocks', 'Início 2026', 'Término: nunca, sempre em manutenção'],
    topLabel: 'Topo',
    topAction: 'Voltar ao topo',
    disclaimer: 'Nenhum robô foi ferido na construção deste site. (Um pifou no lago, mas passa bem.)',
  },
} as const;
