export class ExploreEngineError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ExploreEngineError';
    this.statusCode = statusCode;
  }
}

export class ExploreAiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ExploreAiError';
    this.statusCode = statusCode;
  }
}
