import { DynamicModule } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AuthModule } from './auth.module';
import { ActivationReceipt } from './models/entities/activation-receipt.entity';

describe('AuthModule', () => {
  it('should be defined', () => {
    expect(new AuthModule()).toBeDefined();
  });

  it('registers activation receipts with the auto-loaded TypeORM data source', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AuthModule) as DynamicModule[];
    const typeOrmFeature = imports.find(item => item.module === TypeOrmModule);

    expect(typeOrmFeature?.providers).toContainEqual(
      expect.objectContaining({ provide: getRepositoryToken(ActivationReceipt) })
    );
  });

  it('uses the snake case naming strategy for activation receipt columns', () => {
    const columns = getMetadataArgsStorage().columns.filter(column => column.target === ActivationReceipt);
    const nameOf = (property: string) => columns.find(column => column.propertyName === property)?.options.name;
    const strategy = new SnakeNamingStrategy();

    expect(nameOf('recoveryCode')).toBeUndefined();
    expect(nameOf('createdAt')).toBeUndefined();
    expect(strategy.columnName('recoveryCode', '', [])).toBe('recovery_code');
    expect(strategy.columnName('createdAt', '', [])).toBe('created_at');
  });
});
