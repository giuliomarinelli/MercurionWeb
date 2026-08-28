import { Test, TestingModule } from '@nestjs/testing';
import { FastifyReply } from 'fastify';
import { AssetController } from './asset.controller';

describe('AssetController', () => {
  let controller: AssetController;

  const renderSitemap = (): string => {
    const reply = {
      type: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    controller.serveSiteMap(reply as unknown as FastifyReply);

    expect(reply.send).toHaveBeenCalledTimes(1);
    return reply.send.mock.calls[0][0] as string;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetController],
    }).compile();

    controller = module.get<AssetController>(AssetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('serves canonical frontend URLs from the root', () => {
    const sitemap = renderSitemap();
    const urls = Array.from(
      sitemap.matchAll(/<loc>(.*?)<\/loc>/g),
      (match) => match[1],
    );

    expect(urls).toEqual([
      'https://mercurion.app/',
      'https://mercurion.app/login',
      'https://mercurion.app/register',
      'https://mercurion.app/forgot',
      'https://mercurion.app/forgot-password',
      'https://mercurion.app/account-recovery',
      'https://mercurion.app/welcome',
      'https://mercurion.app/privacy',
      'https://mercurion.app/terms-and-policies',
      'https://mercurion.app/contacts',
      'https://mercurion.app/403-forbidden',
      'https://mercurion.app/404-not-found',
    ]);
  });

  it('does not expose the legacy /m prefix', () => {
    expect(renderSitemap()).not.toContain('https://mercurion.app/m/');
  });

  it('lists the homepage exactly once', () => {
    const sitemap = renderSitemap();
    const homepageMatches = sitemap.match(
      /<loc>https:\/\/mercurion\.app\/<\/loc>/g,
    );

    expect(homepageMatches).toHaveLength(1);
  });
});
