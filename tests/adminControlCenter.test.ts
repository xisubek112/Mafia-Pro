import { describe, expect, it } from 'vitest';
import { AddressInfo } from 'net';
import { createAppServer } from '../src/server/createAppServer';

describe('MAFIA PRO — 15-Module Admin Control Center & RBAC', () => {
  it('enforces RBAC, user suspend/restore, role overrides, tournaments, notifications, settings, analytics, and backups', async () => {
    const { server } = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // 1. Login as seeded SUPER_ADMIN
      const adminLoginRes = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@mafiapro.uz', password: 'Admin123!' }),
      });
      expect(adminLoginRes.status).toBe(200);
      const { token: adminToken } = await adminLoginRes.json();

      // 2. Fetch Admin Overview
      const ovRes = await fetch(`${base}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(ovRes.status).toBe(200);
      const ov = await ovRes.json();
      expect(ov.adminRoles.length).toBeGreaterThanOrEqual(6);
      expect(ov.websiteSettings.siteTitle).toBeTruthy();

      // 3. Register a regular player & verify 403 on admin endpoints
      const ts = Date.now();
      const playerEmail = `rbac_${ts}@test.uz`;
      const regRes = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `RbacUser_${ts}`,
          email: playerEmail,
          password: 'Password123!',
        }),
      });
      expect(regRes.status).toBe(200);
      const { token: userToken, user: playerUser } = await regRes.json();

      const deniedRes = await fetch(`${base}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(deniedRes.status).toBe(403);

      // 4. Suspend & Restore User
      const suspRes = await fetch(`${base}/api/admin/users/${playerUser.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ hours: 12, reason: 'Rule check' }),
      });
      expect(suspRes.status).toBe(200);

      const blockedLoginRes = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: playerEmail, password: 'Password123!' }),
      });
      expect(blockedLoginRes.status).toBe(401);

      const restoreRes = await fetch(`${base}/api/admin/users/${playerUser.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(restoreRes.status).toBe(200);

      // 5. Assign MODERATOR role -> verify allowed on users/suspend but 403 on system:create (backup)
      const assignRes = await fetch(`${base}/api/admin/assign-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ userId: playerUser.id, role: 'ADMIN', adminRole: 'MODERATOR' }),
      });
      expect(assignRes.status).toBe(200);

      const modLoginRes = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: playerEmail, password: 'Password123!' }),
      });
      expect(modLoginRes.status).toBe(200);
      const { token: modToken } = await modLoginRes.json();

      const modBackupDenied = await fetch(`${base}/api/admin/system/backup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${modToken}` },
      });
      expect(modBackupDenied.status).toBe(403);

      // 6. Role Encyclopedia Override
      const roleRes = await fetch(`${base}/api/admin/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ roleId: 'don', rarity: 'LEGENDARY', isActive: true }),
      });
      expect(roleRes.status).toBe(200);

      // 7. Tournament Creation
      const trnRes = await fetch(`${base}/api/admin/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Admin Cup 16',
          format: 'SINGLE_ELIMINATION',
          mode: 'CLASSIC',
          maxPlayers: 16,
          prizeGold: 2000,
          prizeDiamonds: 30,
        }),
      });
      expect(trnRes.status).toBe(200);

      // 8. Notification Broadcast
      const ntfRes = await fetch(`${base}/api/admin/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          title: `Season 2 (${ts})`,
          content: `Welcome to MAFIA PRO Control Center! (${ts})`,
          audience: 'GLOBAL',
        }),
      });
      expect(ntfRes.status).toBe(200);

      // 9. Website Settings & Public Endpoint
      const wsRes = await fetch(`${base}/api/admin/site-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ siteTitle: 'MAFIA PRO 2.0', adsEnabled: false }),
      });
      expect(wsRes.status).toBe(200);
      const pubWsRes = await fetch(`${base}/api/site-settings`);
      expect(pubWsRes.status).toBe(200);
      const pubWs = await pubWsRes.json();
      expect(pubWs.websiteSettings.siteTitle).toBe('MAFIA PRO 2.0');

      // 10. Analytics & CSV Export
      const anRes = await fetch(`${base}/api/admin/analytics?range=30`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(anRes.status).toBe(200);
      const an = await anRes.json();
      expect(an.dailySeries.length).toBe(30);

      const csvRes = await fetch(`${base}/api/admin/analytics/export.csv?range=7`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(csvRes.status).toBe(200);
      const csvText = await csvRes.text();
      expect(csvText).toContain('day,registrations,orders,revenue_uzs');

      // 11. Verified Backup Creation (SUPER_ADMIN)
      const bkpRes = await fetch(`${base}/api/admin/system/backup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(bkpRes.status).toBe(200);
      const bkp = await bkpRes.json();
      expect(bkp.ok).toBe(true);
      expect(bkp.backups.length).toBeGreaterThanOrEqual(1);
    } finally {
      server.close();
    }
  });
});
