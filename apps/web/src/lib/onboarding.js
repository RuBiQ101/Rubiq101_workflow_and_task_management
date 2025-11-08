const KEY = 'workflo_onboarding_v1';

/** isFirstRun — checks local flag */
export function isFirstRun() {
  try {
    const v = localStorage.getItem(KEY);
    return v !== 'done';
  } catch {
    return true;
  }
}

/** markOnboardingComplete — mark locally (and optionally call server) */
export function markOnboardingComplete() {
  try {
    localStorage.setItem(KEY, 'done');
  } catch {}
}
