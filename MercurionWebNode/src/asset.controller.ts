import { Controller, Get, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { join } from 'path';
import { Public } from 'src/metadata/metadata'
import { existsSync, createReadStream } from 'fs'

@Controller()
export class AssetController {

    @Public()
    @Get('/sitemap.xml')
    serveSiteMap(@Res() reply: FastifyReply) {
        const xml =
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
            `<url><loc>https://mercurion.app/</loc></url>` +
            `<url><loc>https://mercurion.app/login</loc></url>` +
            `<url><loc>https://mercurion.app/register</loc></url>` +
            `<url><loc>https://mercurion.app/forgot</loc></url>` +
            `<url><loc>https://mercurion.app/forgot-password</loc></url>` +
            `<url><loc>https://mercurion.app/account-recovery</loc></url>` +
            `<url><loc>https://mercurion.app/welcome</loc></url>` +
            `<url><loc>https://mercurion.app/privacy</loc></url>` +
            `<url><loc>https://mercurion.app/terms-and-policies</loc></url>` +
            `<url><loc>https://mercurion.app/contacts</loc></url>` +
            `<url><loc>https://mercurion.app/403-forbidden</loc></url>` +
            `<url><loc>https://mercurion.app/404-not-found</loc></url>` +
            `</urlset>`

        return reply
            .type('application/xml; charset=UTF-8')
            .header('Cache-Control', 'public, max-age=3600')
            .send(xml)
    }

    @Public()
    @Get('/robots.txt')
    serveRobots(@Res() reply: FastifyReply) {
        const txt =
            `User-agent: *\n` +
            `Allow: /\n` +
            `Sitemap: https://mercurion.app/sitemap.xml\n`

        return reply
            .type('text/plain; charset=UTF-8')
            .header('Cache-Control', 'public, max-age=3600')
            .send(txt)
    }

    @Public()
    @Get('/og/mercurion-og.png')
    async serveOgImage(@Res() reply: FastifyReply) {

        const filePath = join(
            process.cwd(),
            'assets-root',
            'og',
            'mercurion-og.png',
        )

        // opzionale: controllo esistenza
        if (!existsSync(filePath)) {
            reply.code(404)
            return 'Not found'
        }

        const stream = createReadStream(filePath)

        reply
            .header('Content-Type', 'image/png')
            .header('Cache-Control', 'public, max-age=604800')
        return reply.send(stream)
    }

}
