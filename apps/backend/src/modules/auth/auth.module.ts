import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';

@Module({
  providers: [AuthService, UsersRepository],
  exports: [AuthService], 
})
export class AuthModule {}
