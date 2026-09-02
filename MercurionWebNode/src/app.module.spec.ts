jest.mock('./config/env-validation', () => ({
  validateEnvOrKillProcess: jest.fn(),
}));

import { AppModule } from './app.module';

describe('AppModule', () => {
  it('should be defined', () => {
    expect(new AppModule()).toBeDefined();
  });
});
