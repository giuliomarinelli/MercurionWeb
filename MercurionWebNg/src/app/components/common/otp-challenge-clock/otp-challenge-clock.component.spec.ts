import { fakeAsync, TestBed, tick } from '@angular/core/testing'
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts'
import {
  OtpChallengeClockComponent,
  otpDeadlineFromResponse,
} from './otp-challenge-clock.component'

describe('OTP challenge clock', () => {
  it('uses server-relative time even when the local clock has a different offset', () => {
    spyOn(Date, 'now').and.returnValue(123_000)
    expect(
      otpDeadlineFromResponse({
        timestamp: utcInstantFromEpochMs(1_000_000),
        expiresAt: utcInstantFromEpochMs(1_030_000),
      })
    ).toBe(153_000)
    expect(
      otpDeadlineFromResponse({
        timestamp: utcInstantFromEpochMs(1_000_000),
        expiresAt: utcInstantFromEpochMs(999_000),
      })
    ).toBe(123_000)
  })

  it('does not invent a lifetime when server metadata is absent or malformed', () => {
    expect(otpDeadlineFromResponse({})).toBeNull()
    expect(otpDeadlineFromResponse({ timestamp: 123, expiresAt: 'invalid' })).toBeNull()
  })

  it('updates the hint, announces the end once and releases its timer on destruction', fakeAsync(() => {
    const fixture = TestBed.createComponent(OtpChallengeClockComponent)
    fixture.componentRef.setInput('deadline', Date.now() + 2000)
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('2 secondi')
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull()
    tick(2000)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Puoi richiedere un nuovo invio'
    )
    fixture.destroy()
    tick(5000)
    // fakeAsync fails if destruction leaves a periodic timer pending.
  }))
})
