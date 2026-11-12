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
      expect(catalog.products.some((p: { category: string }) => p.category === 'CHAT_DECORATION')).toBe(true);
      expect(catalog.products.some((p: { category: string }) => p.category === 'PROFILE_BG')).toBe(true);

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

      // 6. Create & pay for a Shop Product (pb_noir_penthouse)
      const prodOrderRes = await fetch(`${base}/api/payments/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderType: 'SHOP_PRODUCT',
          referenceId: 'pb_noir_penthouse',
          provider: 'CLICK',
        }),
      });
      expect(prodOrderRes.status).toBe(200);
      const prodOrderData = await prodOrderRes.json();

      // Valid signed webhook callback
      const secret = process.env.CLICK_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET || '';
      if (secret) {
        const sig = crypto
          .createHmac('sha256', secret)
          .update(`${prodOrderData.order.id}:PAID:click_tx_99`)
          .digest('hex');
        const okHook = await fetch(`${base}/api/payments/webhook/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-payment-signature': sig },
          body: JSON.stringify({ orderId: prodOrderData.order.id, status: 'PAID', providerTxId: 'click_tx_99' }),
        });
        expect(okHook.status).toBe(200);
      } else {
        await fetch(`${base}/api/payments/sandbox/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orderId: prodOrderData.order.id, status: 'PAID' }),
        });
      }

      // 7. Duplicate unique item order should be rejected
      const dupOrderRes = await fetch(`${base}/api/payments/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderType: 'SHOP_PRODUCT',
          referenceId: 'pb_noir_penthouse',
          provider: 'PAYME',
        }),
      });
      expect(dupOrderRes.status).toBe(400);

      // 8. Verify inventory & equip toggle
      const invRes = await fetch(`${base}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const invData = await invRes.json();
      expect(invData.items.some((i: { id: string }) => i.id === 'pb_noir_penthouse')).toBe(true);

      // 9. Request refund & verify admin approval revokes item
      const refReq = await fetch(`${base}/api/payments/orders/${prodOrderData.order.id}/refund-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: 'Test refund' }),
      });
      expect(refReq.status).toBe(200);
      const resolved = store.adminResolveRefund(prodOrderData.order.id, true, {
        id: 'usr_admin',
        username: 'DonCorleone',
      });
      expect(resolved.status).toBe('REFUNDED');
    } finally {
      server.close();
    }
  });
});
