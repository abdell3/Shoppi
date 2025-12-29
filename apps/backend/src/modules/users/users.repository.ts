import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../core/base/base.repository';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UserRepository extends BaseRepository <User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.user);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email }
        });
    }


}