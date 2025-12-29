import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/jwt-payload.type';
import { env } from '../../../config/env';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: env.JWT_SECRET
        });
    }

    async validate(payload: JwtPayload) {
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role
        }

        // payload : contenu de token qui est décodé, il utilise le type JwtPayload pour eviter d'utiliser le standard de Nestjs "any"
    }
}