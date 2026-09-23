// All visible copy and destinations live here. Future sections can be added here.
export const content = {
  metadata: {
    title: 'Guilherme Gabriel Gocks | Desenvolvedor full-stack',
    description: 'Desenvolvedor full-stack com foco em Java, Spring Boot e React. Estudante de Engenharia de Software na UniAmérica, em busca de estágio.',
  },
  brand: { name: 'gocks', suffix: '.dev', label: 'Guilherme Gabriel Gocks — início' },
  accessibility: { skip: 'Ir para o conteúdo', navigation: 'Navegação principal', social: 'Links de contato' },
  // These sections are intentionally inactive until their implementation is approved.
  navigation: [
    { label: 'Projetos', href: '#projetos', enabled: false },
    { label: 'Sobre', href: '#sobre', enabled: false },
    { label: 'Contato', href: '#contato', enabled: true },
  ],
  hero: {
    status: 'Buscando estágio',
    firstName: 'Guilherme Gabriel',
    lastName: 'Gocks',
    role: 'Full-stack developer',
    introduction: 'Desenvolvo aplicações com Java, Spring Boot e React.',
    education: 'Estudante de Engenharia de Software na UniAmérica.',
    technologies: ['Java', 'Spring', 'React'],
    section: '01 — Apresentação',
    location: 'Foz do Iguaçu, PR',
  },
  contact: {
    email: 'guigocks@gmail.com',
    links: [
      { label: 'GitHub', href: 'https://github.com/guiGocksAfK', style: 'primary' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/guilherme-gabriel-gocks-023846352', style: 'outline' },
      { label: 'E-mail', href: 'mailto:guigocks@gmail.com', style: 'text' },
    ],
  },
} as const;
