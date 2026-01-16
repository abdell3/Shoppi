import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../core/base/base.repository';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository extends BaseRepository <User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.user);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email }
        });
    }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async softDelete(id: string): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
    }
}