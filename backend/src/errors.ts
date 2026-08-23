export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(resource: string, id: string): AppError {
  return new AppError(404, "NOT_FOUND", `${resource} '${id}' was not found.`);
}
