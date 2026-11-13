import fs from 'fs';
import path from 'path';
import { AddressInfo } from 'net';
import { describe, expect, it } from 'vitest';
import { createAppServer } from '../src/server/createAppServer';
import { ROLE_LIST, ROLES } from '../src/shared/roles';
import {
  getDefaultRoleImageUrl,
  getRoleImageStatus,
  resolveEffectiveRoleMeta,
  resolveRoleImageUrl,
} from '../src/shared/roleArtwork';

function readJpegDimensions(filePath: string): { width: number; height: number } | null {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3
    ) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (marker === 0xd9 || marker === 0xda) break;
    const len = buf.readUInt16BE(offset + 2);
    if (len < 2) break;
    offset += 2 + len;
  }
  return null;
}

describe('MAFIA PRO — 30 Role Character Art & Admin Image Management', () => {
  it('assigns unique 1:1 (>=1024x1024) portrait files to all 30 existing roles', () => {
    expect(ROLE_LIST).toHaveLength(30);
    const seenUrls = new Set<string>();
    const rolesDir = path.join(process.cwd(), 'public', 'assets', 'roles');

    for (const role of ROLE_LIST) {
      expect(ROLES[role.id]).toBeDefined();
      expect(role.imageUrl).toBe(`/assets/roles/${role.id}.jpg`);
      expect(seenUrls.has(role.imageUrl)).toBe(false);
      seenUrls.add(role.imageUrl);

      const diskPath = path.join(rolesDir, `${role.id}.jpg`);
      expect(fs.existsSync(diskPath)).toBe(true);
      const dims = readJpegDimensions(diskPath);
      expect(dims).not.toBeNull();
      expect(dims!.width).toBeGreaterThanOrEqual(1024);
      expect(dims!.height).toBeGreaterThanOrEqual(1024);
      expect(dims!.width).toBe(dims!.height);
    }

    expect(seenUrls.size).toBe(30);
  });

  it('resolves default, custom override, and explicit missing states deterministically', () => {
    expect(getDefaultRoleImageUrl('don')).toBe('/assets/roles/don.jpg');
    expect(resolveRoleImageUrl('don', [])).toBe('/assets/roles/don.jpg');
    expect(getRoleImageStatus('don', [])).toBe('DEFAULT');

    const customOverrides = [
      { roleId: 'don' as const, isActive: true, imageUrl: '/uploads/roles/don-custom.png', updatedAt: Date.now() },
      { roleId: 'sheriff' as const, isActive: true, imageUrl: '', updatedAt: Date.now() },
    ];
    expect(resolveRoleImageUrl('don', customOverrides)).toBe('/uploads/roles/don-custom.png');
    expect(getRoleImageStatus('don', customOverrides)).toBe('CUSTOM');
    expect(resolveRoleImageUrl('sheriff', customOverrides)).toBeNull();
    expect(getRoleImageStatus('sheriff', customOverrides)).toBe('MISSING');

    const meta = resolveEffectiveRoleMeta('sheriff', 'uz', customOverrides);
    expect(meta.imageUrl).toBeNull();
    expect(meta.imageStatus).toBe('MISSING');
  });

  it('enforces admin RBAC and supports upload, serve, remove, and restore on /api/admin/roles/:roleId/image', async () => {
    const { server } = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    let uploadedDiskPath: string | null = null;

    try {
      // 1. Public role config returns all 30 seeded role entries
      const publicCfgRes = await fetch(`${base}/api/roles/config`);
      expect(publicCfgRes.status).toBe(200);
      const publicCfgData = await publicCfgRes.json();
      expect(publicCfgData.roles).toHaveLength(30);
      const donCfg = publicCfgData.roles.find((r: { roleId: string }) => r.roleId === 'don');
      expect(donCfg?.imageUrl).toBe('/assets/roles/don.jpg');

      // 2. Unauthenticated image update returns 403
      const unauthRes = await fetch(`${base}/api/admin/roles/don/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restoreDefault: true }),
      });
      expect(unauthRes.status).toBe(403);

      // 3. Regular player returns 403
      const ts = Date.now();
      const regRes = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `ArtPlayer_${ts}`,
          email: `artplayer_${ts}@test.uz`,
          password: 'Password123!',
        }),
      });
      expect(regRes.status).toBe(200);
      const { token: playerToken } = await regRes.json();

      const playerForbidden = await fetch(`${base}/api/admin/roles/don/image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${playerToken}` },
      });
      expect(playerForbidden.status).toBe(403);

      // 4. Admin login
      const adminLoginRes = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@mafiapro.uz', password: 'Admin123!' }),
      });
      expect(adminLoginRes.status).toBe(200);
      const { token: adminToken } = await adminLoginRes.json();

      // 5. Upload custom 1x1 PNG portrait for sheriff
      const tinyPngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+f90AAAAASUVORK5CYII=';
      const uploadRes = await fetch(`${base}/api/admin/roles/sheriff/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ dataUrl: `data:image/png;base64,${tinyPngBase64}` }),
      });
      expect(uploadRes.status).toBe(200);
      const uploadBody = await uploadRes.json();
      expect(uploadBody.imageUrl).toMatch(/^\/uploads\/roles\/sheriff-\d+\.png$/);
      uploadedDiskPath = path.join(process.cwd(), 'data', uploadBody.imageUrl.replace(/^\//, ''));
      expect(fs.existsSync(uploadedDiskPath)).toBe(true);

      // 6. Serve custom uploaded portrait via Express static route
      const servedRes = await fetch(`${base}${uploadBody.imageUrl}`);
      expect(servedRes.status).toBe(200);
      expect(servedRes.headers.get('content-type')).toContain('image/png');

      // 7. Remove image -> empty string ('MISSING') and cleans up old custom file
      const delRes = await fetch(`${base}/api/admin/roles/sheriff/image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(delRes.status).toBe(200);
      const delBody = await delRes.json();
      expect(delBody.roleConfig.imageUrl).toBe('');
      expect(fs.existsSync(uploadedDiskPath)).toBe(false);
      uploadedDiskPath = null;

      // 8. Restore default image
      const restoreRes = await fetch(`${base}/api/admin/roles/sheriff/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ restoreDefault: true }),
      });
      expect(restoreRes.status).toBe(200);
      const restoreBody = await restoreRes.json();
      expect(restoreBody.imageUrl).toBe('/assets/roles/sheriff.jpg');
    } finally {
      if (uploadedDiskPath && fs.existsSync(uploadedDiskPath)) {
        fs.unlinkSync(uploadedDiskPath);
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
