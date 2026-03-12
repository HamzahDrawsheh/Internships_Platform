declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
      };
    }
  }
}

export {};
