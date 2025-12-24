export interface IBaseRepository<T, C, U> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: C): Promise<T>;
  update(id: string, data: U): Promise<T>;
  delete(id: string): Promise<T>;
}