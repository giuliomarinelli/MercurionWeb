jest.mock('../src/config/env-validation', () => ({
  validateEnvOrKillProcess: jest.fn(),
}));

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  it('should be defined', () => {
    expect(new AppModule()).toBeDefined();
  });
});
