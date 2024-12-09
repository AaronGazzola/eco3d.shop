/**
 * Checks if the given error message indicates a verifier error.
 * We check for this specific error because it's highly likely that the
 * user is trying to sign in using a different browser than the one they
 * used to request the sign in link. This is a common mistake, so we
 * want to provide a helpful error message.
 */
export function isVerifierError(error: string) {
  return error.includes("both auth code and code verifier should be non-empty");
}

export function getAuthErrorMessage(error: string) {
  return isVerifierError(error)
    ? getCodeVerifierMessageError()
    : getGenericErrorMessage();
}

export function getCodeVerifierMessageError() {
  return `It looks like you're trying to sign in using a different browser than the one you used to request the sign in link. Please try again using the same browser.`;
}

export function getGenericErrorMessage() {
  return `Sorry, we could not authenticate you. Please try again.`;
}
