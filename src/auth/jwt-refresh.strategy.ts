import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { jwtConstants } from './jwt.constants';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConstants.refreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const authorization = req.get('Authorization');
    if (!authorization) {
      return null;
    }
    const refreshToken = authorization.replace('Bearer ', '').trim();
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      refreshToken,
    };
  }
}
