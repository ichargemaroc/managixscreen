// Only fixed diagnostics may reach the TV; native exceptions can contain private data.
const diagnostics: Record<string, string> = {
  VAULT_PLUGIN_MISSING: "Module de stockage Android absent de cette installation.",
  VAULT_BRIDGE_TIMEOUT: "Le module Android de l’application ne répond pas.",
  VAULT_TIMEOUT: "Le stockage Android ne répond pas dans le délai prévu.",
  VAULT_READ_FAILED: "Android ne peut pas déchiffrer l’association enregistrée.",
  VAULT_WRITE_FAILED: "Android ne peut pas enregistrer l’association chiffrée.",
  VAULT_CLEAR_FAILED: "Android ne peut pas effacer l’association chiffrée.",
  VAULT_INCOMPLETE: "L’association chiffrée enregistrée est incomplète.",
  VAULT_INVALID_IDENTITY: "L’association enregistrée ne peut pas être validée.",
};
export function vaultErrorMessage(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && diagnostics[error.code] ? error.code : "VAULT_UNKNOWN";
  return `${diagnostics[code] ?? "Le stockage sécurisé est indisponible."} (${code}) L’association existante n’a pas été remplacée.`;
}
export function vaultError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}