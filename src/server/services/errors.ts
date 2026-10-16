/** Erro de regra de negócio, exibido ao usuário (opcionalmente ligado a um campo). */
export class ServiceError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
