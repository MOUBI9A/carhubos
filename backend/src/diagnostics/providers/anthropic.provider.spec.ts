import { AnthropicDiagnosticProvider } from './anthropic.provider';
import type { Analysis } from '../obd/telemetry.types';
const context: Analysis = {
  rulesVersion: 'test',
  provider: 'DETERMINISTIC',
  analyzedRevision: 1,
  source: 'SIMULATOR',
  limitations: ['Generic only'],
  findings: [
    {
      id: 'coolant',
      title: 'Temperature',
      severity: 'WARNING',
      confidenceBasis: 'Rule',
      evidence: ['100 C'],
      recommendedTests: [],
      limitations: [],
    },
  ],
};
describe('genuine optional explanation provider', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });
  it('never invokes an unconfigured provider', async () => {
    global.fetch = jest.fn();
    const p = new AnthropicDiagnosticProvider('', '');
    expect(p.configured).toBe(false);
    await expect(p.explain(context)).rejects.toThrow('unconfigured');
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('invokes the bounded real endpoint and accepts known evidence', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        Response.json({
          stop_reason: 'end_turn',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                narrative: 'Simulation requires technician testing.',
                evidenceIds: ['coolant'],
              }),
            },
          ],
        }),
      );
    const p = new AnthropicDiagnosticProvider('key', 'configured-model');
    expect((await p.explain(context)).evidenceIds).toEqual(['coolant']);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(JSON.parse(options.body).model).toBe('configured-model');
    expect(JSON.parse(options.body).messages[0].content).not.toContain(
      'agencyId',
    );
  });
  it('rejects fabricated evidence', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        Response.json({
          stop_reason: 'end_turn',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                narrative: 'Claim',
                evidenceIds: ['invented'],
              }),
            },
          ],
        }),
      );
    await expect(
      new AnthropicDiagnosticProvider('key', 'model').explain(context),
    ).rejects.toThrow('unavailable');
  });
  it('hides upstream failure details', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('credential detail', { status: 401 }));
    await expect(
      new AnthropicDiagnosticProvider('key', 'model').explain(context),
    ).rejects.toThrow('Diagnostic explanation provider is unavailable');
  });
  it('rejects truncated output', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        Response.json({ stop_reason: 'max_tokens', content: [] }),
      );
    await expect(
      new AnthropicDiagnosticProvider('key', 'model').explain(context),
    ).rejects.toThrow('unavailable');
  });
});
