import * as http from 'http';
import { BadGatewayException } from '@nestjs/common';
import { ExtracaoOnlineService } from './extracao-online.service';

jest.mock('http');

describe('ExtracaoOnlineService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...OLD_ENV,
      EXTRACAO_ONLINE_BASE_URL: 'http://191.252.196.23/api.php',
      EXTRACAO_ONLINE_ACCESS_TOKEN: 'test-token',
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  function mockHttpResponse(status: number, body: string) {
    (http.request as jest.Mock).mockImplementation(
      (_url: any, _opts: any, cb: any) => {
        const res: any = {
          statusCode: status,
          on: (event: string, handler: any) => {
            if (event === 'data') handler(Buffer.from(body));
            if (event === 'end') handler();
            return res;
          },
        };
        cb(res);
        return { on: jest.fn(), end: jest.fn(), destroy: jest.fn() };
      },
    );
  }

  it('returns parsed JSON on HTTP 200', async () => {
    mockHttpResponse(200, JSON.stringify({ dados: { beneficio: 2148232830 } }));
    const service = new ExtracaoOnlineService();
    const result = await service.consultarNb('2148232830');
    expect(result).toEqual({ dados: { beneficio: 2148232830 } });
    expect(http.request).toHaveBeenCalledWith(
      'http://191.252.196.23/api.php?acesso=test-token&nb=2148232830',
      expect.objectContaining({ method: 'GET' }),
      expect.any(Function),
    );
  });

  it('throws BadGatewayException on non-2xx status', async () => {
    mockHttpResponse(500, 'boom');
    const service = new ExtracaoOnlineService();
    await expect(service.consultarNb('2148232830')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('throws BadGatewayException when body is not JSON', async () => {
    mockHttpResponse(200, '<html>not json</html>');
    const service = new ExtracaoOnlineService();
    await expect(service.consultarNb('2148232830')).rejects.toThrow(
      BadGatewayException,
    );
  });
});
