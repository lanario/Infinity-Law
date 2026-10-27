/**
 * @typedef {{ id: string; nome: string }} ProcessClient
 * @typedef {{ id: string; name: string; count: number }} ProcessClientOption
 */

/**
 * @param {Array<{ clientes: ProcessClient[] }>} processes
 * @returns {ProcessClientOption[]}
 */
export function deriveProcessClientOptions(processes) {
  const counts = new Map();

  for (const process of processes) {
    const clientsInProcess = new Set();
    for (const client of process.clientes) {
      if (clientsInProcess.has(client.id)) continue;
      clientsInProcess.add(client.id);

      const entry = counts.get(client.id) ?? { name: client.nome, count: 0 };
      entry.count += 1;
      counts.set(client.id, entry);
    }
  }

  return Array.from(counts, ([id, value]) => ({ id, ...value })).sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );
}

/**
 * @param {ProcessClientOption[]} clients
 * @param {string} query
 * @returns {ProcessClientOption[]}
 */
export function filterProcessClientOptions(clients, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedQuery) return clients;

  return clients.filter((client) =>
    client.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
  );
}

/**
 * @template { {
 *   status: string;
 *   clientes: ProcessClient[];
 *   numero_cnj: string | null;
 *   numero_protocolo: string | null;
 *   processo_originario: string | null;
 *   pasta_caso: string | null;
 *   grupo_acao: string | null;
 *   tipo_acao: string | null;
 *   etapa: string | null;
 *   fase: string | null;
 *   tribunal: string | null;
 *   vara: string | null;
 *   observacoes: string | null;
 * } } T
 * @param {T[]} processes
 * @param {{ search: string; status: string; clientId: string | null }} filters
 * @returns {T[]}
 */
export function filterProcessList(processes, filters) {
  const normalizedSearch = filters.search.trim().toLocaleLowerCase("pt-BR");

  return processes.filter((process) => {
    const matchesStatus = filters.status === "todos" || process.status === filters.status;
    const matchesClient = !filters.clientId || process.clientes.some((client) => client.id === filters.clientId);
    const searchValues = [
      process.numero_cnj,
      process.numero_protocolo,
      process.processo_originario,
      process.pasta_caso,
      process.grupo_acao,
      process.tipo_acao,
      process.etapa,
      process.fase,
      process.tribunal,
      process.vara,
      process.observacoes,
      ...process.clientes.map((client) => client.nome),
    ];
    const matchesSearch = !normalizedSearch || searchValues.some((value) =>
      value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
    );

    return matchesStatus && matchesClient && matchesSearch;
  });
}
