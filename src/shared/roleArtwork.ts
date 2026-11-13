import { ROLES } from './roles';
import { Language, RoleConfigOverride, RoleId } from './types';

export type RoleImageStatus = 'DEFAULT' | 'CUSTOM' | 'MISSING';

export function getDefaultRoleImageUrl(roleId: RoleId): string {
  return ROLES[roleId]?.imageUrl || `/assets/roles/${roleId}.jpg`;
}

export function resolveRoleImageUrl(
  roleId: RoleId,
  roleConfigs?: RoleConfigOverride[],
): string | null {
  const ov = roleConfigs?.find((r) => r.roleId === roleId);
  if (ov && ov.imageUrl !== undefined) {
    const trimmed = ov.imageUrl.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return getDefaultRoleImageUrl(roleId);
}

export function getRoleImageStatus(
  roleId: RoleId,
  roleConfigs?: RoleConfigOverride[],
): RoleImageStatus {
  const url = resolveRoleImageUrl(roleId, roleConfigs);
  if (!url) return 'MISSING';
  if (url === getDefaultRoleImageUrl(roleId)) return 'DEFAULT';
  return 'CUSTOM';
}

export function resolveEffectiveRoleMeta(
  roleId: RoleId,
  lang: Language,
  roleConfigs?: RoleConfigOverride[],
) {
  const base = ROLES[roleId];
  const ov = roleConfigs?.find((r) => r.roleId === roleId);
  return {
    name: ov?.name?.[lang] || base.name[lang],
    shortDesc: ov?.description?.[lang] || base.shortDesc[lang],
    abilityName: ov?.abilityName?.[lang] || base.abilityName[lang],
    isActive: ov ? ov.isActive : true,
    imageUrl: resolveRoleImageUrl(roleId, roleConfigs),
    imageStatus: getRoleImageStatus(roleId, roleConfigs),
  };
}
