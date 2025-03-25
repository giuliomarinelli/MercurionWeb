import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsConfiguration } from 'src/config/@types-config';
import { Twilio } from 'twilio';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

@Injectable()
export class SmsSenderService {

    private readonly smsConfig: SmsConfiguration

    private readonly smsClient: Twilio

    constructor(
        private readonly configService: ConfigService
    ) {

        const { accountSID, authToken } = this.configService.get<SmsConfiguration>("Sms") as SmsConfiguration
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.smsClient = new Twilio(accountSID, authToken)
        
    }

    public async sendSms(to: string, body: string): Promise<MessageInstance> {

        return await this.smsClient.messages.create({
            to,
            body,
            from: this.configService.get<string>("Sms.number")
        })

    }

}
