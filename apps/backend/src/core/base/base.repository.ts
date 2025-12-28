import { IBaseRepository } from './ibase.repository';

type PrismaDelegate<T, C, U> = {
  findMany: () => Promise<T[]>;
  findUnique: (args: { where: { id: string } }) => Promise<T | null>;
  create: (args: { data: C }) => Promise<T>;
  update: (args: { where: { id: string }; data: U }) => Promise<T>;
  delete: (args: { where: { id: string } }) => Promise<T>;
};

export abstract class BaseRepository<T, C, U> implements IBaseRepository<T, C, U> {
  constructor(protected readonly model: PrismaDelegate<T, C, U>) {}

  async findAll(): Promise<T[]> {
    return this.model.findMany();
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } });
  }

  async create(data: C): Promise<T> {
    return this.model.create({ data });
  }

  async update(id: string, data: U): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }
}