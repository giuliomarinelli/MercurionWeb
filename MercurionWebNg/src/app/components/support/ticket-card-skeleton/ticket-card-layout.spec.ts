import { TestBed } from '@angular/core/testing'
import { TicketCardComponent } from '../ticket-card/ticket-card.component'
import { TicketCardSkeletonComponent } from './ticket-card-skeleton.component'
import { Ticket } from '../../../Models/graphql/help.models'

const fixtureTicket: Ticket = {
  id: 'qa-ticket', publicId: 'MTCK-000000123', subject: 'Oggetto molto lungo '.repeat(12),
  status: 'WaitingSupport', createdAt: '1793278800000', updatedAt: '1793278800000', lastMessageAt: '1793278800000',
  userId: 'qa-user', userFullName: 'Nome utente molto lungo '.repeat(5),
}

for (const theme of ['light', 'dark']) {
  for (const width of [320, 375, 768, 1280]) {
    it(`aligns ticket skeleton and card at ${width}px in ${theme}`, () => {
      TestBed.configureTestingModule({ imports: [TicketCardComponent, TicketCardSkeletonComponent] })
      const card = TestBed.createComponent(TicketCardComponent)
      const skeleton = TestBed.createComponent(TicketCardSkeletonComponent)
      card.componentRef.setInput('ticket', fixtureTicket)
      card.detectChanges()
      skeleton.detectChanges()
      const frame = document.createElement('iframe')
      frame.style.cssText = `position:fixed;top:0;left:0;width:${width}px;height:700px;border:0`
      document.body.appendChild(frame)
      const cardRoot = card.nativeElement as HTMLElement
      const skeletonRoot = skeleton.nativeElement as HTMLElement
      const cardParent = cardRoot.parentElement ?? document.body
      const skeletonParent = skeletonRoot.parentElement ?? document.body
      try {
        const doc = frame.contentDocument!
        doc.body.style.margin = '0'
        doc.documentElement.classList.toggle('dark', theme === 'dark')
        const style = doc.createElement('style')
        style.textContent = Array.from(document.styleSheets).flatMap(sheet => {
          try { return Array.from(sheet.cssRules).map(rule => rule.cssText) } catch { return [] }
        }).join('\n')
        doc.head.appendChild(style)
        doc.body.append(cardRoot, skeletonRoot)
        for (const support of [false, true]) {
          card.componentRef.setInput('cardMode', support ? 'support' : 'user')
          skeleton.componentRef.setInput('support', support)
          skeleton.detectChanges()
          for (const status of ['Open', 'WaitingUser', 'WaitingSupport', 'Closed']) {
            card.componentRef.setInput('ticket', { ...fixtureTicket, status })
            card.detectChanges()
            const loaded = cardRoot.querySelector('article')!.getBoundingClientRect()
            const loading = skeletonRoot.querySelector('[role="status"]')!.getBoundingClientRect()
            expect(Math.abs(loaded.height - loading.height)).withContext(`${status}, support=${support}`).toBeLessThanOrEqual(1)
            expect(Math.abs(loaded.width - loading.width)).toBeLessThanOrEqual(1)
            expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width + 1)
            if (width >= 768) {
              const article = cardRoot.querySelector('article')!
              const badge = article.querySelector('.rounded-full')!.getBoundingClientRect()
              const placeholder = skeletonRoot.querySelector('.min-h-10 m-skeleton:last-child')!.getBoundingClientRect()
              const articleStyle = frame.contentWindow!.getComputedStyle(article)
              const rightInset = parseFloat(articleStyle.paddingRight) + parseFloat(articleStyle.borderRightWidth)
              expect(Math.abs(badge.right - (loaded.right - rightInset))).withContext(`${status}, desktop badge`).toBeLessThanOrEqual(1)
              expect(Math.abs(placeholder.right - (loading.right - rightInset))).withContext('desktop badge skeleton').toBeLessThanOrEqual(1)
            }
          }
        }
      } finally {
        cardParent.appendChild(cardRoot)
        skeletonParent.appendChild(skeletonRoot)
        frame.remove()
        card.destroy()
        skeleton.destroy()
      }
    })
  }
}
