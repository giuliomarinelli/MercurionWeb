import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsConfiguration } from 'src/config/config.types';
import { Twilio } from 'twilio';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

@Injectable()
export class SmsSenderService {

    private readonly from: string

    private readonly smsClient: Twilio

    constructor(
        private readonly configService: ConfigService
    ) {
        const { accountSID, authToken, from } = this.configService.get<SmsConfiguration>("Sms") as SmsConfiguration        
        this.smsClient = new Twilio(accountSID, authToken)
        this.from = from
    }

    public async sendSms(to: string, body: string): Promise<MessageInstance> {
        return this.smsClient.messages.create({
            to,
            body,
            from: this.from
        })
    }

}
