import { PipeTransform, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RejectRolePipe implements PipeTransform {
  transform(value: Record<string, unknown>): Record<string, unknown> {
    if (value && 'role' in value) {
      throw new ForbiddenException('Role assignment is not allowed via registration');
    }
    return value;
  }
}


