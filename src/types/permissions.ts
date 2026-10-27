export const MODULES = [
  "dashboard",
  "clientes",
  "processos",
  "financeiro",
  "agenda",
  "comunicacao",
  "relatorios",
  "configuracoes",
] as const;

export const ACTIONS = ["read", "write", "delete"] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];

export type ModulePermissions = {
  [A in Action]?: boolean;
};

export type PermissionsMap = {
  [M in Module]?: ModulePermissions;
};

export type ProfileSex = "masculino" | "feminino" | "outro";

export type UserWithPermissions = {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  avatar_path: string | null;
  data_nascimento: string | null;
  sexo: ProfileSex | null;
  cpf: string | null;
  telefone: string | null;
  escritorio_id: string;
  cargo_id: string | null;
  cargo_nome: string | null;
  is_admin: boolean;
  permissoes: PermissionsMap;
};
