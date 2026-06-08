import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { Public } from 'src/auth/decorators/public.decorator';

export interface BrandingResponse {
  mode: 'custom' | 'subdomain' | 'default';
  companyId?: number;
  companyName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  showVerytasMark: boolean;
}

@ApiTags('Branding')
@Controller('branding')
export class BrandingController {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Resolve o branding pelo hostname (público — sem auth)',
    description:
      'Usado na tela de login antes de autenticar. ' +
      'Domínio próprio → white label completo (showVerytasMark=false). ' +
      'Subdomínio verytasdados → marca Verytas (showVerytasMark=true). ' +
      'Sem match → fallback default Verytas.',
  })
  @ApiQuery({
    name: 'host',
    required: true,
    example: 'empresa.verytasdados.com.br',
    description: 'Hostname completo (com ou sem porta)',
  })
  @ApiResponse({ status: 200, description: 'Branding resolvido' })
  async resolve(@Query('host') rawHost?: string): Promise<BrandingResponse> {
    const DEFAULT: BrandingResponse = {
      mode: 'default',
      companyName: 'Verytas Dados',
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      showVerytasMark: true,
    };

    if (!rawHost) {
      return DEFAULT;
    }

    // Normaliza: lowercase, remove porta
    const host = rawHost.toLowerCase().replace(/:\d+$/, '').trim();

    if (!host) {
      return DEFAULT;
    }

    // 1. Tenta customDomain (domínio próprio → white label completo)
    let company = await this.companyRepo.findOne({
      where: { customDomain: host },
    });

    if (company) {
      return {
        mode: 'custom',
        companyId: company.id,
        companyName: company.tradeName || company.name,
        logoUrl: company.logoUrl ?? null,
        primaryColor: company.brandPrimaryColor ?? null,
        secondaryColor: company.brandSecondaryColor ?? null,
        showVerytasMark: false,
      };
    }

    // 2. Tenta subdomain (primeira label do host)
    const firstLabel = host.split('.')[0];
    if (firstLabel) {
      company = await this.companyRepo.findOne({
        where: { subdomain: firstLabel },
      });

      if (company) {
        return {
          mode: 'subdomain',
          companyId: company.id,
          companyName: 'Verytas Dados',
          logoUrl: company.logoUrl ?? null,
          primaryColor: company.brandPrimaryColor ?? null,
          secondaryColor: company.brandSecondaryColor ?? null,
          showVerytasMark: true,
        };
      }
    }

    // 3. Fallback ao campo domain existente
    company = await this.companyRepo.findOne({
      where: { domain: host },
    });

    if (company) {
      return {
        mode: 'subdomain',
        companyId: company.id,
        companyName: 'Verytas Dados',
        logoUrl: company.logoUrl ?? null,
        primaryColor: company.brandPrimaryColor ?? null,
        secondaryColor: company.brandSecondaryColor ?? null,
        showVerytasMark: true,
      };
    }

    // 4. Nenhum match — default Verytas (nunca lança erro)
    return DEFAULT;
  }
}
