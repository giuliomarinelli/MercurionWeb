import { ComponentFixture, TestBed } from '@angular/core/testing'

import { ButtonPlaygroundPageComponent } from './button-playground.page.component'

describe('ButtonPlaygroundPageComponent', () => {
  let fixture: ComponentFixture<ButtonPlaygroundPageComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ButtonPlaygroundPageComponent] }).compileComponents()
    fixture = TestBed.createComponent(ButtonPlaygroundPageComponent)
    fixture.detectChanges()
  })

  it('shows every variant at each size and in each state', () => {
    const element = fixture.nativeElement as HTMLElement
    const matrix = element.querySelectorAll('#variants-title ~ div tbody tr')
    const stateGroups = element.querySelectorAll('#states-title ~ div > div')

    expect(matrix).toHaveSize(6)
    expect(stateGroups).toHaveSize(6)
    for (const row of matrix) {
      const buttons = row.querySelectorAll<HTMLButtonElement>('button')
      expect(buttons).toHaveSize(3)
      for (const [index, size] of ['sm', 'md', 'lg'].entries()) {
        expect(buttons[index].classList).toContain(`m-button__control--${size}`)
      }
    }
    for (const group of stateGroups) {
      const buttons = group.querySelectorAll<HTMLButtonElement>('button')
      expect(buttons).toHaveSize(3)
      expect(buttons[1].disabled).toBeTrue()
      expect(buttons[2].getAttribute('aria-busy')).toBe('true')
    }
  })

  it('updates the live preview and reports its interaction', () => {
    const element = fixture.nativeElement as HTMLElement
    const selects = element.querySelectorAll('select')
    const preview = element.querySelector('#preview-title')!.parentElement!
    const button = preview.querySelector<HTMLButtonElement>('form button')!

    selects[0].value = 'destructive'
    selects[0].dispatchEvent(new Event('change'))
    selects[1].value = 'lg'
    selects[1].dispatchEvent(new Event('change'))
    fixture.detectChanges()

    expect(button.classList).toContain('m-button__control--destructive')
    expect(button.classList).toContain('m-button__control--lg')
    selects[2].value = 'trailing'
    selects[2].dispatchEvent(new Event('change'))
    selects[3].value = 'submit'
    selects[3].dispatchEvent(new Event('change'))
    fixture.detectChanges()
    expect(button.classList).toContain('m-button__control--icon-trailing')
    expect(button.type).toBe('submit')

    button.click()
    fixture.detectChanges()
    expect(preview.querySelector('[role="status"]')?.textContent).toContain('Pressioni: 1')

    const loading = element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1]
    loading.click()
    fixture.detectChanges()
    expect(button.disabled).toBeTrue()
    expect(button.getAttribute('aria-busy')).toBe('true')
  })
})
