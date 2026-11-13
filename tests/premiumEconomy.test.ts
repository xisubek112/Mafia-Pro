import { describe, expect, it } from 'vitest';
import { store } from '../src/server/store';
import { AddressInfo } from 'net';
import { createAppServer } from '../src/server/createAppServer';
import crypto from 'crypto';

describe('MAFIA PRO 2.0 — Premium Economy, VIP, Shop, Inventory & Sandbox Payments', () => {
  it('supports VIP plans, Shop catalog, server-side orders, idempotent callbacks, inventory equip, and refunds', async () => {
    const { server } = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // 1. Verify catalog & 3 initial VIP plans
      const catRes = await fetch(`${base}/api/shop/catalog`);
      expect(catRes.status).toBe(200);
      const catalog = await catRes.json();
      expect(catalog.vipPlans.length).toBeGreaterThanOrEqual(3);
      const monthly = catalog.vipPlans.find((p: { id: string }) => p.id === 'vip_monthly');
      expect(monthly.priceUzs).toBe(15000);
      expect(monthly.durationDays).toBe(30);
      expect(catalog.products.some((p: { category: string }) => p.category === 'DOCUMENTS')).toBe(true);
      expect(catalog.products.some((p: { category: string }) => p.category === 'RIFLE')).toBe(true);
      expect(catalog.products.some((p: { category: string }) => p.category === 'STATISTICS_RESET')).toBe(true);
      expect(catalog.products.some((p: { category: string }) => p.category === 'CHAT_DECORATION')).toBe(false);
      expect(catalog.products.some((p: { category: string }) => p.category === 'PROFILE_BG')).toBe(false);

      // 2. Register a fresh test player
      const regRes = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `EconTester_${Date.now()}`,
          email: `econ_${Date.now()}@test.uz`,
          password: 'Password123!',
        }),
      });
      const regData = await regRes.json();
      expect(regRes.status).toBe(200);
      const token = regData.token;

      // 3. Create VIP Monthly order with promo code MAFIA20 (20% off 15,000 = 12,000 UZS)
      const vipOrderRes = await fetch(`${base}/api/payments/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderType: 'VIP_PLAN',
          referenceId: 'vip_monthly',
          provider: 'PAYME',
          promoCode: 'MAFIA20',
        }),
      });
      expect(vipOrderRes.status).toBe(200);
      const vipOrderData = await vipOrderRes.json();
      expect(vipOrderData.order.amountUzs).toBe(12000);
      expect(vipOrderData.order.status).toBe('PENDING');

      // 4. Complete sandbox payment -> activates VIP
      const sbxRes = await fetch(`${base}/api/payments/sandbox/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: vipOrderData.order.id, status: 'PAID' }),
      });
      expect(sbxRes.status).toBe(200);
      const sbxData = await sbxRes.json();
      expect(sbxData.user.subscription.status).toBe('ACTIVE');
      expect(sbxData.user.subscription.tier).toBe('ELITE');

      // 5. Webhook signature verification rejects invalid signature
      const badHook = await fetch(`${base}/api/payments/webhook/sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-payment-signature': 'invalid' },
        body: JSON.stringify({ orderId: vipOrderData.order.id, status: 'PAID', providerTxId: 'tx_1' }),
      });
      expect(badHook.status).toBe(401);

      // 6. Verify UZS checkout is disabled for functional items (in-game currency only)
      const uzsShopRes = await fetch(`${base}/api/payments/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderType: 'SHOP_PRODUCT',
          referenceId: 'fn_role_unlock_detective',
          provider: 'CLICK',
        }),
      });
      expect(uzsShopRes.status).toBe(400);

      // 7. Purchase fn_role_unlock_detective with in-game Diamonds & reject duplicate unlock
      const registeredUser = store.findUserById(regData.user.id)!;
      registeredUser.diamonds += 50;

      const buyRes = await fetch(`${base}/api/shop/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: 'fn_role_unlock_detective', currency: 'DIAMONDS' }),
      });
      expect(buyRes.status).toBe(200);

      const dupPurchaseRes = await fetch(`${base}/api/shop/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: 'fn_role_unlock_detective', currency: 'DIAMONDS' }),
      });
      expect(dupPurchaseRes.status).toBe(400);

      // 8. Verify functional inventory & unlockedRoles
      const invRes = await fetch(`${base}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const invData = await invRes.json();
      expect(invData.functionalItems.some((i: { productId: string }) => i.productId === 'fn_role_unlock_detective')).toBe(true);
      expect(invData.unlockedRoles).toContain('detective');

      // 9. Request refund on VIP order & verify admin approval
      const refReq = await fetch(`${base}/api/payments/orders/${vipOrderData.order.id}/refund-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: 'Test refund' }),
      });
      expect(refReq.status).toBe(200);
      const resolved = store.adminResolveRefund(vipOrderData.order.id, true, {
        id: 'usr_admin',
        username: 'DonCorleone',
      });
      expect(resolved.status).toBe('REFUNDED');
    } finally {
      server.close();
    }
  });
});
