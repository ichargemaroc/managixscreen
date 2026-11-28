// Allow-listed webpage failure codes reported by players; never forward raw native errors.
const CODE = /^(timeout|frame_error|plugin_missing|open_failed|webpage_[a-z_]{1,30}|net_-?\d{1,3}|http_\d{3}|ssl_\d)$/;
export const WEBPAGE_ERROR_PREFIX = 'webpage:';

export function webpageFailureCode(value: unknown): string {
  const code = String(value ?? '').trim().toLowerCase();
  return CODE.test(code) ? code : 'open_failed';
}

const NET: Record<string, string> = {
  'net_-2': 'adresse du site introuvable depuis la TV (DNS)',
  'net_-6': 'connexion au site refusée',
  'net_-8': 'le site met trop de temps à répondre',
  'net_-11': 'connexion sécurisée impossible',
  'net_-1': 'erreur réseau inconnue',
};

export function webpageFailureLabel(code: string): string {
  if (code === 'timeout') return 'la page ne s’est pas chargée en 15 secondes';
  if (code === 'plugin_missing') return 'lecteur Android trop ancien, installez la dernière version';
  if (code === 'frame_error') return 'le site refuse d’être affiché';
  if (code.startsWith('http_')) return `le site a répondu avec l’erreur ${code.slice(5)}`;
  if (code.startsWith('ssl_')) return 'certificat de sécurité du site refusé par la TV';
  if (code === 'webpage_invalid_url') return 'adresse de page refusée';
  if (code === 'webpage_limit') return 'trop de pages ouvertes en même temps';
  if (code.startsWith('webpage_')) return 'affichage de la page impossible sur cette TV';
  return NET[code] ?? (code.startsWith('net_') ? `erreur réseau (${code.slice(4)})` : 'ouverture de la page impossible');
}

/** Reads a heartbeat error such as "webpage:net_-2"; other errors are ignored. */
export function reportedWebpageFailure(status: unknown): string | null {
  const error = (status as { error?: unknown } | null)?.error;
  if (typeof error !== 'string' || !error.startsWith(WEBPAGE_ERROR_PREFIX)) return null;
  return webpageFailureLabel(webpageFailureCode(error.slice(WEBPAGE_ERROR_PREFIX.length)));
}
