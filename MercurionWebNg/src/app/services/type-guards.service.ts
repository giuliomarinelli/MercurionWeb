import { APIClientTicket, ClientTicketMessage, TicketMessage } from './../Models/graphql/help.models';
import { Injectable } from "@angular/core";
import { MoleculeDetailSystem } from "../Models/graphql/molecule.detail.models";
import { ChEMBLMoleculeItemEntity, CustomMoleculeItemEntity, MoleculeCollectionItemClient, MoleculeCollectionItemEntityShort, MoleculeDetailItem } from "../Models/graphql/molecule-collection/molecule-collection.types";
import { SSO_AuthProvider } from "../Models/auth/provider.models";
import { Ticket } from "../Models/graphql/help.models";
import { Maybe } from 'graphql/jsutils/Maybe';

@Injectable({ providedIn: 'root' })
export class TypeGuardsService {
  // chembl
  isChemblMolecule(item: MoleculeDetailItem): item is ChEMBLMoleculeItemEntity;
  isChemblMolecule(item: MoleculeCollectionItemClient): item is Extract<MoleculeCollectionItemClient, { type: 'chembl' }>;
  isChemblMolecule(item: MoleculeCollectionItemEntityShort): item is MoleculeCollectionItemEntityShort & { type: 'chembl' };
  isChemblMolecule(item: any): boolean {
    return item?.type === 'chembl';
  }

  // custom
  isCustomMolecule(item: MoleculeDetailItem): item is CustomMoleculeItemEntity;
  isCustomMolecule(
    item: MoleculeCollectionItemEntityShort
  ): item is MoleculeCollectionItemEntityShort & { type: 'custom' };
  isCustomMolecule(item: any): boolean {
    return item?.type === 'custom';
  }

  // system (solo per detail)
  isSystemMolecule(item: MoleculeDetailItem): item is MoleculeDetailSystem {
    return item?.type === 'system';
  }

  isUserMoleculeType(item: 'chembl' | 'custom' | 'system'): item is 'chembl' | 'custom' {
    return item !== 'system'
  }

  isCustomMoleculeType(item: 'chembl' | 'custom' | 'system'): item is 'custom' {
    return item === 'custom'
  }

  isString(item: unknown): item is string {
    return typeof item === 'string'
  }

  isNotNullish<T>(item: T | null | undefined): item is T {
    return item != null
  }

  isNullish<T>(item: T | null | undefined): item is null | undefined {
    return item == null
  }

  isNotNull<T>(item: T | null): item is T {
    return item !== null
  }

  isNotUndefined<T>(item: T | null): item is T {
    return item !== undefined
  }

  isUndefined<T>(item: T | null | undefined): item is undefined {
    return item === undefined
  }

  isNull<T>(item: T | null | undefined): item is null {
    return item === null
  }

  is_SSO_AuthProvider(item: unknown): item is SSO_AuthProvider {
    if (!item) {
      return false
    }
    return ['Google', 'GitHub', 'LinkedIn', 'Discord'].includes(item as string)
  }

  isTicketVsOmitUpdatedAt(item: Ticket | Omit<Ticket, 'updatedAt'>): item is Ticket {
    return !!(item as Ticket).updatedAt
  }

  // --- TICKET guards ---

  isTicket(
    item: Maybe<Ticket | APIClientTicket>
  ): item is Ticket {
    if (!item) return false

    const rec = this.asRecord(item)
    const discriminants = ['userId', 'userFullName'] as const

    // full Ticket solo se entrambi presenti e NON nullish e stringhe non vuote
    return this.allPresentStrings(rec, discriminants)
  }

  isClientTicket(
    item: Maybe<APIClientTicket | Ticket>
  ): item is APIClientTicket {
    if (!item) return false

    const rec = this.asRecord(item)
    const discriminants = ['userId', 'userFullName'] as const

    // ClientTicket se entrambi nullish (missing/undefined/null)
    return this.allNullish(rec, discriminants)
  }

  // --- MESSAGE guards ---

  isMessageTicket(
    item: Maybe<TicketMessage | ClientTicketMessage>
  ): item is TicketMessage {
    if (!item) return false

    const rec = this.asRecord(item)
    const discriminants = ['userId', 'authorId', 'userFullName', 'authorFullName'] as const

    // full Message solo se tutti presenti e non nullish e stringhe non vuote
    return this.allPresentStrings(rec, discriminants)
  }

  isClientMessageTicket(
    item: Maybe<ClientTicketMessage | TicketMessage>
  ): item is ClientTicketMessage {
    if (!item) return false

    const rec = this.asRecord(item)
    const discriminants = ['userId', 'authorId', 'userFullName', 'authorFullName'] as const

    // ClientMessage se tutti nullish (missing/undefined/null)
    return this.allNullish(rec, discriminants)
  }

  // --- helpers DRY / strict ---

  private asRecord(item: unknown): Record<string, unknown> {
    return item as Record<string, unknown>
  }

  private hasNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
  }

  private allNullish(rec: Record<string, unknown>, keys: readonly string[]): boolean {
    for (const k of keys) {
      if (!this.isNullish(rec[k])) {
        return false
      }
    }
    return true
  }

  private allPresentStrings(rec: Record<string, unknown>, keys: readonly string[]): boolean {
    for (const k of keys) {
      if (!this.hasNonEmptyString(rec[k])) {
        return false
      }
    }
    return true
  }

}
