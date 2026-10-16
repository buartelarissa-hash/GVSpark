const LABELS: Record<string, string> = {
  "auth.login": "Entrou na plataforma",
  "auth.logout": "Saiu da plataforma",
  "auth.changePassword": "Alterou a própria senha",
  "user.create": "Colaborador cadastrado",
  "user.update": "Cadastro alterado",
  "user.activate": "Acesso reativado",
  "user.deactivate": "Acesso desativado",
  "user.resetPassword": "Senha temporária gerada",
  "department.create": "Departamento criado",
  "department.update": "Departamento alterado",
  "department.archive": "Departamento arquivado",
  "department.activate": "Departamento reativado",
  "position.create": "Cargo criado",
  "position.update": "Cargo alterado",
  "position.archive": "Cargo arquivado",
  "position.activate": "Cargo reativado",
};

export function auditLabel(action: string): string {
  return LABELS[action] ?? action;
}
