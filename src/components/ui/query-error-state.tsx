interface QueryErrorStateProps {
  retryHref: string;
  title?: string;
  description?: string;
  diagnosticCode?: string;
}

export function QueryErrorState({
  retryHref,
  title = "Não foi possível carregar os dados",
  description = "O serviço não conseguiu concluir esta consulta. Tente novamente; se o problema continuar, fale com o suporte.",
  diagnosticCode,
}: QueryErrorStateProps) {
  return (
    <section
      aria-labelledby="query-error-title"
      aria-live="assertive"
      className="rounded-2xl border border-red-200 bg-red-50/70 p-5 sm:p-6 dark:border-red-900/60 dark:bg-red-950/35"
      role="alert"
    >
      <h2 id="query-error-title" className="text-base font-bold text-red-950 dark:text-red-200">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-red-900 dark:text-red-300">
        {description}
      </p>
      {diagnosticCode && (
        <p className="mt-2 text-xs font-semibold text-red-800 dark:text-red-300/90">
          Referência técnica: <code>{diagnosticCode}</code>
        </p>
      )}
      <a
        href={retryHref}
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#17191a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#343637] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Tentar novamente
      </a>
    </section>
  );
}
