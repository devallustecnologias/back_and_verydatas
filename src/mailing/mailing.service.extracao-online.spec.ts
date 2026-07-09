import { BadRequestException } from '@nestjs/common';
import { MailingService } from './mailing.service';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger } from 'src/ledger/ledger.entity';

describe('MailingService.consultarExtracaoOnline', () => {
  function buildService(balance = 5) {
    const extracaoOnline = {
      consultarNb: jest.fn().mockResolvedValue({ dados: { beneficio: 2148232830 } }),
    };
    const cr = {} as any;

    const walletRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'wallet-1' }),
    } as any;

    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ bal: String(balance) }),
    };

    const managerLedgerRepo = {
      create: jest.fn((x: any) => x),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const dataSource = {
      getRepository: jest
        .fn()
        .mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }),
      transaction: jest.fn(async (cb: any) => {
        const manager = {
          getRepository: jest.fn((entity: any) =>
            entity === Wallet ? walletRepo : managerLedgerRepo,
          ),
        };
        return cb(manager);
      }),
    } as any;

    const genRepo = {} as any;

    const service = new MailingService(
      cr,
      walletRepo,
      genRepo,
      dataSource,
      extracaoOnline as any,
    );
    return { service, extracaoOnline, dataSource, managerLedgerRepo };
  }

  afterEach(() => {
    delete process.env.EXTRACAO_ONLINE_CREDIT_COST;
  });

  it('throws BadRequestException when company balance is insufficient and never calls the upstream API', async () => {
    const { service, extracaoOnline } = buildService(0);
    await expect(
      service.consultarExtracaoOnline('2148232830', {
        companyId: 7,
        userId: 'u1',
        username: 'x',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(extracaoOnline.consultarNb).not.toHaveBeenCalled();
  });

  it('master user (no companyId) skips balance check and debit, still calls upstream, returns creditCost 0', async () => {
    const { service, extracaoOnline, dataSource } = buildService(0);
    const result = await service.consultarExtracaoOnline('2148232830', {
      userId: 'm1',
      username: 'master',
    });
    expect(result).toEqual({
      success: true,
      creditCost: 0,
      data: { dados: { beneficio: 2148232830 } },
    });
    expect(extracaoOnline.consultarNb).toHaveBeenCalledWith('2148232830');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('empresa user with sufficient balance calls upstream then debits the cost', async () => {
    const { service, extracaoOnline, dataSource, managerLedgerRepo } =
      buildService(5);
    const result = await service.consultarExtracaoOnline('2148232830', {
      companyId: 7,
      userId: 'u1',
      username: 'x',
    });
    expect(result.creditCost).toBe(1);
    expect(extracaoOnline.consultarNb).toHaveBeenCalledWith('2148232830');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(managerLedgerRepo.save).toHaveBeenCalledTimes(1);
  });

  it('empresa user with sufficient balance but upstream fails should not debit credit', async () => {
    const { service, extracaoOnline, dataSource } = buildService(5);

    // Override the consultarNb mock to reject
    extracaoOnline.consultarNb.mockRejectedValue(
      new Error('upstream down'),
    );

    await expect(
      service.consultarExtracaoOnline('2148232830', {
        companyId: 7,
        userId: 'u1',
        username: 'x',
      }),
    ).rejects.toThrow('upstream down');

    expect(extracaoOnline.consultarNb).toHaveBeenCalledWith('2148232830');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
