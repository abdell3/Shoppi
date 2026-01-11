import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly ttl = 30000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(request);
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      return of(cachedEntry.data);
    }

    return next.handle().pipe(
      tap((data: unknown) => {
        this.cache.set(cacheKey, {
          data,
          expiresAt: Date.now() + this.ttl,
        });
        
        this.cleanExpiredEntries();
      }),
    );
  }

  private generateCacheKey(request: Request): string {
    const path = request.path;
    const queryString = request.query ? this.sortQueryParams(request.query) : '';
    return `${request.method}:${path}${queryString ? `?${queryString}` : ''}`;
  }

  private sortQueryParams(query: Record<string, unknown>): string {
    const sortedKeys = Object.keys(query).sort();
    return sortedKeys
      .map((key) => `${key}=${String(query[key])}`)
      .join('&');
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach((key) => this.cache.delete(key));
  }
}
