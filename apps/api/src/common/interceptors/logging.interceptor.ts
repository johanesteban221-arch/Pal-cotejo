import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

/** Loguea cada request en formato JSON con un requestId para trazabilidad. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const requestId = uuidv4();
    const start = Date.now();
    (req as any).requestId = requestId;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              requestId,
              method: req.method,
              url: req.url,
              statusCode: res.statusCode,
              durationMs: Date.now() - start,
            }),
          );
        },
        error: (err) => {
          this.logger.error(
            JSON.stringify({
              requestId,
              method: req.method,
              url: req.url,
              statusCode: err?.status ?? 500,
              error: err?.message,
              durationMs: Date.now() - start,
            }),
          );
        },
      }),
    );
  }
}
