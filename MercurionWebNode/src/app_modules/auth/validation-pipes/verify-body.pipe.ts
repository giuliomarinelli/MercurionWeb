import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { BackupCodeDTO } from '../Models/DTO/backup-code.cls.dto';
import { TotpBodyDTO } from '../Models/DTO/totp.cls.dto';
import { VerifyKind } from '../Models/enums/verify-kind.enum';

type VerifyBodyLike = {
  kind: VerifyKind
  payload: unknown
}

@Injectable()
export class VerifyBodyPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transform(value: unknown, _meta: ArgumentMetadata) {
    if (value == null || typeof value !== 'object') {
      throw new BadRequestException('Invalid body')
    }

    const v = value as Partial<VerifyBodyLike>;

    if (!v.kind || v.payload == null || typeof v.payload !== 'object') {
      throw new BadRequestException('Invalid body')
    }

    let cls: ClassConstructor<TotpBodyDTO | BackupCodeDTO>

    switch (v.kind) {
      case VerifyKind.TOTP:
        cls = TotpBodyDTO
        break;
      case VerifyKind.BACKUP:
        cls = BackupCodeDTO
        break;
      default:
        throw new BadRequestException('Invalid kind')
    }

    const inst = plainToInstance(cls, v.payload)

    const errors = await validate(inst, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });

    if (errors.length) {
      throw new BadRequestException(errors);
    }
    
    return { kind: v.kind, payload: inst }
  }
}
