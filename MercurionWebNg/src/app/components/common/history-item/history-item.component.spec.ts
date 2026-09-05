import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoryItemComponent } from './history-item.component';

describe('HistoryItemComponent', () => {
  let component: HistoryItemComponent;
  let fixture: ComponentFixture<HistoryItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoryItemComponent);
    fixture.componentRef.setInput('historyDTO', {
      itemEntity: 'molecule_collection_items',
      itemId: 'molecule-1',
      itemName: 'Test molecule',
      flagIds: '{}',
      touchedAt: new Date().toISOString()
    } as never);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
