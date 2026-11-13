import React, { useEffect, useState } from 'react';
import { ROLES } from '../shared/roles';
import { ROLE_VISUALS } from '../shared/roleCards';
import { resolveRoleImageUrl } from '../shared/roleArtwork';
import { RoleConfigOverride, RoleId } from '../shared/types';
import { RoleArtwork } from './RoleArtwork';

interface RolePortraitProps {
  roleId: RoleId;
  roleConfigs?: RoleConfigOverride[];
  imageUrlOverride?: string | null;
  alt?: string;
  className?: string;
  lazy?: boolean;
  showVignette?: boolean;
}

export const RolePortrait: React.FC<RolePortraitProps> = ({
  roleId,
  roleConfigs,
  imageUrlOverride,
  alt,
  className = 'w-full aspect-square',
  lazy = true,
  showVignette = true,
}) => {
  const resolvedUrl =
    imageUrlOverride !== undefined ? imageUrlOverride : resolveRoleImageUrl(roleId, roleConfigs);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    setFailedUrl(null);
  }, [resolvedUrl]);

  const spec = ROLE_VISUALS[roleId];
  const roleName = alt || ROLES[roleId]?.name.uz || roleId;
  const canShowImage = Boolean(resolvedUrl && resolvedUrl !== failedUrl);

  return (
    <div
      className={`relative overflow-hidden bg-[#070912] ${className}`}
      style={{
        background: spec.bgGradient,
      }}
    >
      {canShowImage ? (
        <>
          <img
            src={resolvedUrl!}
            alt={roleName}
            loading={lazy ? 'lazy' : 'eager'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(resolvedUrl!)}
            className="w-full h-full object-cover object-top select-none transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {showVignette && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(9,11,18,0.06) 0%, rgba(9,11,18,0) 55%, rgba(9,11,18,0.68) 100%)',
              }}
            />
          )}
        </>
      ) : (
        <RoleArtwork spec={spec} className="w-full h-full" />
      )}
    </div>
  );
};
