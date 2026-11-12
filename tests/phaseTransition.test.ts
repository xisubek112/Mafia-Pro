import { describe, expect, it } from 'vitest';
import { resolveEnvironmentMode } from '../src/hooks/usePhaseTransition';

describe('usePhaseTransition environment mode mapping', () => {
  it('resolves LOBBY when not in active game or in lobby/role assignment', () => {
    expect(resolveEnvironmentMode('NIGHT', false, false)).toBe('LOBBY');
    expect(resolveEnvironmentMode('LOBBY', true, false)).toBe('LOBBY');
    expect(resolveEnvironmentMode('ROLE_ASSIGNMENT', true, false)).toBe('LOBBY');
  });

  it('resolves NIGHT during NIGHT phase', () => {
    expect(resolveEnvironmentMode('NIGHT', true, false)).toBe('NIGHT');
  });

  it('resolves DAWN during initial DAY sunrise window and DAYTIME afterwards', () => {
    expect(resolveEnvironmentMode('DAY', true, true)).toBe('DAWN');
    expect(resolveEnvironmentMode('DAY', true, false)).toBe('DAYTIME');
    expect(resolveEnvironmentMode('DISCUSSION', true, false)).toBe('DAYTIME');
  });

  it('resolves VOTING during VOTING and EXECUTION phases', () => {
    expect(resolveEnvironmentMode('VOTING', true, false)).toBe('VOTING');
    expect(resolveEnvironmentMode('EXECUTION', true, false)).toBe('VOTING');
  });

  it('resolves VICTORY during VICTORY phase', () => {
    expect(resolveEnvironmentMode('VICTORY', true, false)).toBe('VICTORY');
  });
});
