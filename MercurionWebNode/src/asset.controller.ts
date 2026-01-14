import { Controller, Get, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Public } from 'src/metadata/metadata'

@Controller()
export class AssetController {

    @Public()
    @Get('/sitemap.xml')
    serveSiteMap(@Res() reply: FastifyReply) {
        const xml =
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
            `<url><loc>https://mercurion.app</loc></url>` +
            `<url><loc>https://mercurion.app/m/</loc></url>` +
            `<url><loc>https://mercurion.app/m/login</loc></url>` +
            `<url><loc>https://mercurion.app/m/register</loc></url>` +
            `<url><loc>https://mercurion.app/m/forgot</loc></url>` +
            `<url><loc>https://mercurion.app/m/forgot-password</loc></url>` +
            `<url><loc>https://mercurion.app/m/account-recovery</loc></url>` +
            `<url><loc>https://mercurion.app/m/welcome</loc></url>` +
            `<url><loc>https://mercurion.app/m/privacy</loc></url>` +
            `<url><loc>https://mercurion.app/m/terms-and-policies</loc></url>` +
            `<url><loc>https://mercurion.app/m/contacts</loc></url>` +
            `<url><loc>https://mercurion.app/m/403-forbidden</loc></url>` +
            `<url><loc>https://mercurion.app/m/404-not-found</loc></url>` +
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

}
