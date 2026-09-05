import { HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { DocumentController } from './document.controller';

describe('DocumentController', () => {
  const createReply = () => {
    const send = jest.fn();
    const status = jest.fn().mockReturnValue({ send });
    return { reply: { status } as unknown as FastifyReply, status, send };
  };

  it.each([
    ['upload', (controller: DocumentController, reply: FastifyReply) => controller.upload(reply)],
    ['download', (controller: DocumentController, reply: FastifyReply) => controller.download(reply)],
    ['delete', (controller: DocumentController, reply: FastifyReply) => controller.delete(reply)],
    ['list', (controller: DocumentController, reply: FastifyReply) => controller.list(reply)],
  ])('returns an empty 403 response while %s is disabled', (_name, invoke) => {
    const { reply, status, send } = createReply();

    invoke(new DocumentController(), reply);

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(send).toHaveBeenCalledWith();
  });
});
