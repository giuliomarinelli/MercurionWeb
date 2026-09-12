jest.mock('../src/config/env-validation', () => ({
  validateEnvOrKillProcess: jest.fn((config) => config),
}));

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  it('should be defined', () => {
    expect(new AppModule()).toBeDefined();
  });
});
