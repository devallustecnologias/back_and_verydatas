// src/middleware/company-tenant.middleware.ts
import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../company/company.service';

/**
 * Middleware that extracts the host from the incoming request, determines the company
 * based on the configured domain (sub‑domain or full custom domain) and attaches the
 * company entity to the request object for downstream handlers.
 *
 * Expected host patterns:
 *   - subdomain: "empresa1.seusistema.com"
 *   - custom: "www.minhaempresa.com.br"
 */
@Injectable()
export class CompanyTenantMiddleware implements NestMiddleware {
  constructor(private readonly companyService: CompanyService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Immediately bypass for OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    const hostHeader = req.headers.host?.toLowerCase() ?? '';
    // Remove possible port (e.g., localhost:3000)
    const host = hostHeader.split(':')[0];

    // If host is localhost or ip, skip tenant resolution unless domain is passed as query/header (for dev/testing)
    const devDomain = (req.query.domain as string) || (req.headers['x-tenant-domain'] as string);
    const isLocal = host.includes('localhost') || host.match(/^\d+\.\d+\.\d+\.\d+$/);

    if (isLocal && !devDomain) {
      return next();
    }

    const domainIdentifier = devDomain || host;

    // If resolved domain is localhost or an IP, bypass database lookup (local development fallback)
    if (
      domainIdentifier.includes('localhost') || 
      domainIdentifier.match(/^\d+\.\d+\.\d+\.\d+$/)
    ) {
      return next();
    }

    try {
      const company = await this.companyService.findByDomain(domainIdentifier);
      // Attach company to request for later use (controllers/services)
      (req as any).company = company;
      next();
    } catch (err) {
      // If not found, return 404 – the UI can handle gracefully.
      next(new NotFoundException('Empresa não encontrada para o domínio informado'));
    }
  }
}
