# Design

- UI: Tailwind 3 + shadcn (style `base-nova`, base `@base-ui/react`, ícones `lucide-react`, cor base neutral), animações com framer-motion e gsap, gráficos com recharts, calendário com react-big-calendar.
- Componentes base em `src/components/ui`; por feature em `src/components/<feature>`.
- Tokens em `src/app/globals.css` e `tailwind.config.js`.
- Tipografia: Inter em toda a interface, inclusive nas famílias `sans`, `serif` e `mono`.
- Idioma pt-BR. Acessibilidade não auditada neste setup; auditar com `web-design-guidelines` quando instalada.
- Não alterar identidade visual sem pedido do dono.
