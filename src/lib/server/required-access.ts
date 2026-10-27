type AccessResolution = { ok: true } | { ok: false; error: string };

/**
 * Keeps a protected action's work behind its server-side authorization check.
 * The callback is never invoked when access is denied.
 */
export async function runWithRequiredAccess<
  TResolution extends AccessResolution,
  TDeniedResult,
  TRunResult,
>(
  resolveAccess: () => Promise<TResolution>,
  onDenied: (error: string) => TDeniedResult,
  run: (access: Extract<TResolution, { ok: true }>) => Promise<TRunResult>,
): Promise<TDeniedResult | TRunResult> {
  const access = await resolveAccess();
  if (access.ok === false) return onDenied(access.error);
  // TypeScript does not fully narrow a generic discriminated union here;
  // the explicit guard above guarantees this is the successful access arm.
  return run(access as Extract<TResolution, { ok: true }>);
}
