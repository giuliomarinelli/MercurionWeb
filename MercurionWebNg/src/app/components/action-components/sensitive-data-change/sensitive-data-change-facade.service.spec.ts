import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import type { ChangePasswordDTO } from '../../../Models/account/account.models'
import { AccountService } from '../../../services/account.service'
import { SensitiveDataChangeFacade } from './sensitive-data-change-facade.service'

describe('SensitiveDataChangeFacade', () => {
  it('exposes account commands without leaking AccountService into a use case', () => {
    const dto: ChangePasswordDTO = { oldPassword: 'old', newPassword: 'New-password1!' }
    const account = {
      changePassword: jasmine.createSpy().and.returnValue(of({ confirmed: true })),
    }
    TestBed.configureTestingModule({
      providers: [
        SensitiveDataChangeFacade,
        { provide: AccountService, useValue: account },
      ],
    })

    const facade = TestBed.inject(SensitiveDataChangeFacade)
    facade.changePassword(dto).subscribe()

    expect(account.changePassword).toHaveBeenCalledWith(dto)
  })
})
