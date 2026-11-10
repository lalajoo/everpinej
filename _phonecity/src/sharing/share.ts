import { CANONICAL_URL } from '../analytics/analytics';
export interface ShareServices {
  secure: boolean;
  share?: (data: ShareData) => Promise<void>;
  copy?: (text: string) => Promise<void>;
}
export type ShareResult = 'shared' | 'copied' | 'manual' | 'cancelled';
export async function shareService(title: string, text: string, services: ShareServices): Promise<ShareResult> {
  if (services.secure && services.share) {
    try { await services.share({ title, text, url: CANONICAL_URL }); return 'shared'; }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') return 'cancelled'; }
  }
  if (services.secure && services.copy) {
    try { await services.copy(`${text}\n${CANONICAL_URL}`); return 'copied'; } catch { /* Show a selectable field. */ }
  }
  return 'manual';
}
