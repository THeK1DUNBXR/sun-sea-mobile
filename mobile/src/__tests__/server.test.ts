import { normalizeServerUrl, hostOf, isRailway } from '../api/server';

describe('normalizeServerUrl', () => {
  it('turns a pasted Railway domain into an https API base', () => {
    expect(normalizeServerUrl('sunseaerp-production.up.railway.app')).toBe('https://sunseaerp-production.up.railway.app/api');
    expect(normalizeServerUrl('https://sunseaerp-production.up.railway.app/')).toBe('https://sunseaerp-production.up.railway.app/api');
    expect(normalizeServerUrl('https://sunseaerp-production.up.railway.app/api')).toBe('https://sunseaerp-production.up.railway.app/api');
    expect(normalizeServerUrl(' http://sunseaerp-production.up.railway.app/api/ ')).toBe('https://sunseaerp-production.up.railway.app/api');
  });
  it('keeps plain http for LAN addresses and strips deeper paths', () => {
    expect(normalizeServerUrl('http://192.168.1.10:5000')).toBe('http://192.168.1.10:5000/api');
    expect(normalizeServerUrl('https://erp.example.com/api/customers')).toBe('https://erp.example.com/api');
    expect(normalizeServerUrl('')).toBe('');
  });
  it('derives host and detects Railway', () => {
    expect(hostOf('https://sunseaerp-production.up.railway.app/api')).toBe('sunseaerp-production.up.railway.app');
    expect(isRailway('https://sunseaerp-production.up.railway.app/api')).toBe(true);
    expect(isRailway('http://192.168.1.10:5000/api')).toBe(false);
  });
});
