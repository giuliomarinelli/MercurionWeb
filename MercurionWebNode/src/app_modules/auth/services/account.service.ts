import { Injectable } from '@nestjs/common';
import { UserService } from 'src/app_modules/user/services/user.service';

@Injectable()
export class AccountService {

    constructor(private readonly userService: UserService) { }

    

}
