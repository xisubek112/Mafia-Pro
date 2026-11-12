import { describe, expect, it } from 'vitest';
import { ROLE_LIST } from '../src/shared/roles';
import { RARITY_LABELS, ROLE_VISUALS } from '../src/shared/roleCards';

describe('MAFIA PRO 30 Role Cards & Visual Identities', () => {
  it('provides a unique visual spec and motif for all 30 roles', () => {
    expect(ROLE_LIST.length).toBe(30);
    const motifs = new Set<string>();

    for (const role of ROLE_LIST) {
      const spec = ROLE_VISUALS[role.id];
      expect(spec).toBeDefined();
      expect(spec.id).toBe(role.id);
      expect(RARITY_LABELS[spec.rarity]).toBeDefined();
      expect(role.name.uz.length).toBeGreaterThan(0);
      expect(role.name.ru.length).toBeGreaterThan(0);
      expect(role.abilityDesc.uz.length).toBeGreaterThan(0);
      expect(motifs.has(spec.motif)).toBe(false);
      motifs.add(spec.motif);
    }

    expect(motifs.size).toBe(30);
  });

  it('assigns legendary or mythic presentation to special leader and solo roles', () => {
    expect(ROLE_VISUALS.don.rarity).toBe('MYTHIC');
    expect(ROLE_VISUALS.godfather.rarity).toBe('LEGENDARY');
    expect(ROLE_VISUALS.serial_killer.rarity).toBe('MYTHIC');
    expect(ROLE_VISUALS.vampire.rarity).toBe('MYTHIC');
    expect(ROLE_VISUALS.plaguebearer.rarity).toBe('MYTHIC');
    expect(ROLE_VISUALS.mayor.rarity).toBe('LEGENDARY');
  });
});
