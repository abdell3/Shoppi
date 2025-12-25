import { IBaseRepository } from './ibase.repository';

type PrismaDelegate<T, C, U> = {
  findMany: () => Promise<T[]>;
  findUnique: (args: { where: { id: string } }) => Promise<T | null>;
  create: (args: { data: C }) => Promise<T>;
  update: (args: { where: { id: string }; data: U }) => Promise<T>;
  delete: (args: { where: { id: string } }) => Promise<T>;
};

export abstract class BaseRepository<T, C, U> implements IBaseRepository<T, C, U> {
  constructor(protected readonly dbModel: PrismaDelegate<T, C, U>) {}

  async findAll(): Promise<T[]> {
    return this.dbModel.findMany();
  }

  async findById(id: string): Promise<T | null> {
    return this.dbModel.findUnique({
      where: { id },
    });
  }

  async create(data: C): Promise<T> {
    return this.dbModel.create({ data });
  }

  async update(id: string, data: U): Promise<T> {
    return this.dbModel.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<T> {
    return this.dbModel.delete({
      where: { id },
    });
  }
}