import { CheckoutService } from './checkout.service';

/**
 * Webhook orchestration for online payment settlement. The money-critical
 * idempotency (a replayed webhook settling exactly once) lives in
 * PaymentsService.settleCheckout and is proven end-to-end against the real DB in
 * the live smoke; here we cover the orchestration + the load-bearing security
 * property: an unverified webhook (adapter throws) must NEVER settle.
 */
describe('CheckoutService.handleWebhook', () => {
  function make(paid: boolean, providerRef = 'mock_x') {
    const gateway = {
      parseWebhook: jest.fn().mockResolvedValue({ providerRef, paid, amount: 4500 }),
    };
    const settleCheckout = jest.fn().mockResolvedValue({ settled: true });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { checkoutSession: { updateMany } };
    const svc = new CheckoutService(
      prisma as any,
      gateway as any,
      { settleCheckout } as any,
    );
    return { svc, gateway, settleCheckout, updateMany };
  }

  it('settles on a paid event via PaymentsService.settleCheckout', async () => {
    const { svc, settleCheckout } = make(true, 'mock_abc');
    const res = await svc.handleWebhook('mock', '{}', {});
    expect(settleCheckout).toHaveBeenCalledWith('mock_abc');
    expect(res).toEqual({ received: true, settled: true });
  });

  it('does NOT settle on a non-paid event — marks the pending session FAILED', async () => {
    const { svc, settleCheckout, updateMany } = make(false, 'mock_abc');
    const res = await svc.handleWebhook('mock', '{}', {});
    expect(settleCheckout).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalledWith({
      where: { providerRef: 'mock_abc', status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    expect(res).toEqual({ received: true, settled: false });
  });

  it('an unverified webhook (adapter throws) never settles', async () => {
    const gateway = {
      parseWebhook: jest.fn().mockRejectedValue(new Error('bad signature')),
    };
    const settleCheckout = jest.fn();
    const svc = new CheckoutService(
      {} as any,
      gateway as any,
      { settleCheckout } as any,
    );
    await expect(svc.handleWebhook('mock', '{}', {})).rejects.toThrow(
      'bad signature',
    );
    expect(settleCheckout).not.toHaveBeenCalled();
  });
});
