import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SmsConfiguration } from 'src/config/config.types'
import { Twilio } from 'twilio'
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class SmsSenderService {
  private readonly from: string

  private readonly smsClient: Twilio

  constructor(private readonly configService: ConfigService) {
    const { accountSID, authToken, from } = this.configService.get<SmsConfiguration>(
      'Sms'
    ) as SmsConfiguration
    this.smsClient = new Twilio(accountSID, authToken)
    this.from = from
  }

  public async sendSms(to: string, body: string): Promise<MessageInstance> {
    // Also enforce the country restriction for recipients already stored on an account.
    if (!/^\+39\d{6,15}$/.test(to)) {
      throw applicationError(
        ApplicationErrorCode.UNPROCESSABLE_ENTITY,
        'Sono supportati solo numeri italiani con prefisso +39.'
      )
    }
    return this.smsClient.messages.create({
      to,
      body,
      from: this.from,
    })
  }
}
