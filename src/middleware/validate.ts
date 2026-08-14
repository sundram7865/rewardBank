import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      }) as any;

      // Only assign if the schema defined that key,
      // otherwise keep the original Express values.
      if ('body' in parsed) req.body = parsed.body;
      if ('params' in parsed) req.params = parsed.params;
      if ('query' in parsed) req.query = parsed.query;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e: any) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        throw new ValidationError('Validation failed', details);
      }
      throw err;
    }
  };
}