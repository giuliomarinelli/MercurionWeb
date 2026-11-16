import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { of, Subject } from 'rxjs'
import { FeedbackPageComponent } from './feedback.page.component'
import { FeedbackService } from '../../services/feedback.service'
import { Feedback } from '../../Models/feedback.models'

const confirmed = { id: 'qa-feedback' } as Feedback

describe('FeedbackPageComponent delivery', () => {
  let fixture: ComponentFixture<FeedbackPageComponent>
  let component: FeedbackPageComponent
  let create: jasmine.Spy

  beforeEach(() => {
    create = jasmine.createSpy('createFeedback').and.returnValue(of(confirmed))
    TestBed.configureTestingModule({
      imports: [FeedbackPageComponent], providers: [{ provide: FeedbackService, useValue: { createFeedback: create } }],
    })
    fixture = TestBed.createComponent(FeedbackPageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('retains the draft and unlocks retry after a transport failure', () => {
    const response = new Subject<Feedback>()
    create.and.returnValue(response)
    component.onMessageInput('Una proposta')
    component.ratingUtility.set(4)
    component.submit()
    response.error(new Error('offline'))
    fixture.detectChanges()
    expect(component.submitting()).toBeFalse()
    expect(component.canSubmit()).toBeTrue()
    expect(component.message()).toBe('Una proposta')
    expect(component.ratingUtility()).toBe(4)
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('disables edits and serializes submissions while awaiting confirmation', () => {
    create.and.returnValue(new Subject<Feedback>())
    component.onMessageInput('Testo iniziale')
    component.submit()
    fixture.detectChanges()
    component.submit()
    component.onMessageInput('Modifica tardiva')
    expect(create.calls.count()).toBe(1)
    expect(component.message()).toBe('Testo iniziale')
    expect(fixture.nativeElement.querySelector('textarea').disabled).toBeTrue()
    expect([...fixture.nativeElement.querySelectorAll('m-star-rating button')].every((button: unknown) => (button as HTMLButtonElement).disabled)).toBeTrue()
  })

  it('starts the original acknowledgement animation only after a delayed success', fakeAsync(() => {
    const response = new Subject<Feedback>()
    create.and.returnValue(response)
    component.onMessageInput('Una proposta')
    component.submit()
    tick(5000)
    expect(component.sent()).toBeFalse()
    response.next(confirmed)
    response.complete()
    expect(component.sent()).toBeTrue()
    expect(component.message()).toBe('')
    expect(component.sendClicked()).toBeTrue()
    tick(3999)
    expect(component.hideAck()).toBeFalse()
    tick(1)
    expect(component.hideAck()).toBeTrue()
  }))

  it('does not treat an empty response as confirmed delivery', () => {
    create.and.returnValue(of(null))
    component.onMessageInput('Bozza')
    component.submit()
    expect(component.sent()).toBeFalse()
    expect(component.message()).toBe('Bozza')
    expect(component.error()).toContain('non confermato')
  })

  it('supports a rating-only message and enforces the backend length limit', () => {
    component.ratingUtility.set(5)
    component.submit()
    expect(create.calls.mostRecent().args[0].ratingUtility).toBe(5)
    expect(create.calls.mostRecent().args[0].message).toBeUndefined()
    component.message.set('x'.repeat(4001))
    component.submit()
    expect(create.calls.count()).toBe(1)
  })

  it('cancels the old acknowledgement when a new rating is entered', fakeAsync(() => {
    component.onMessageInput('Primo')
    component.submit()
    tick(1000)
    component.onRatingInput(component.ratingClarity, 4)
    expect(component.sent()).toBeFalse()
    tick(4000)
    expect(component.hideAck()).toBeFalse()
  }))

  it('unsubscribes on destruction without accepting a late response', () => {
    const response = new Subject<Feedback>()
    create.and.returnValue(response)
    component.onMessageInput('Bozza')
    component.submit()
    fixture.destroy()
    expect(response.observed).toBeFalse()
    response.next(confirmed)
    expect(component.sent()).toBeFalse()
  })
})
