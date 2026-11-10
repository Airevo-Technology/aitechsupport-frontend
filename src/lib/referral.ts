const KEY = "ats_ref";

/** Remember a ?ref=CODE from the landing URL until the visitor signs up. */
export function captureReferral(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) localStorage.setItem(KEY, ref.toUpperCase());
  } catch {
    /* storage blocked - referral simply isn't recorded */
  }
}

export function storedReferral(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
