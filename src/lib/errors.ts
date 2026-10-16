export function friendlyError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return "Something went wrong. Please try again.";
  if (error.code === "invalid_credentials") return "That email and password don't match. Please try again.";
  if (error.code === "email_not_confirmed") return "Check your inbox and confirm your email before signing in.";
  // Supabase's default mail quota is hourly; do not promise a one-minute reset.
  if (error.code === "over_email_send_rate_limit") return "The email sending limit has been reached. Wait for the email quota to reset before trying again; repeated attempts won't help.";
  if (error.code === "over_request_rate_limit") return "Too many requests. Please wait before trying again.";
  if (error.code === "weak_password") return "Choose a stronger password with at least 10 characters.";
  if (error.code === "email_address_not_authorized") return "This address isn't authorized by the email service. Supabase's default email service sends only to Supabase organization team members. Ask the operator to check recipient restrictions; a room key doesn't grant email access.";
  if (error.code === "email_address_invalid") return "The email service couldn't accept that address. Check the spelling or contact the app operator.";
  if (error.code === "signup_disabled" || error.code === "email_provider_disabled") return "Email registration is currently disabled. Please contact the app operator.";
  if (error.message === "Error sending confirmation email" || error.message === "Error sending recovery email") return "The email service couldn't send the message. Ask the operator to check Supabase Auth logs and SMTP settings before retrying.";
  if (error.code === "unexpected_failure") return "The authentication service couldn't finish this request. Ask the operator to check the latest Supabase Auth error before retrying.";
  if (error.code === "23503") return "This post or poll is no longer available. Refresh and try again.";
  if (error.code === "23514" || error.code === "23502") return "Please check the text length and required fields.";
  // Only our explicitly user-facing SQL messages are forwarded; never leak
  // SQL details, identifiers, emails, or auth internals to an ordinary member.
  const safe = [
    "Join this room first.", "Room moderator access required.", "Post unavailable in this room.",
    "Report unavailable in this room.", "This room key is invalid or expired.",
    "You can belong to at most 6 rooms. Leave a room first.", "This room has reached its 25-member limit",
    "The room moderator cannot leave the room.", "Check the room key settings.", "Generate a new key first.",
    "Room admission requires a fresh transaction. Please try again.",
    "Join the office first.", "Sign in first.", "Administrator access required.",
    "Confirm your email before joining.", "This invitation is invalid or expired.",
    "This office has reached its 25-member limit",
    "Office admission requires a fresh transaction. Please try again.",
    "Use 2 to 4 different, nonempty poll options.", "You can only edit your own posts.",
    "You can only delete your own posts.", "You can only edit your own comments.",
    "You can only delete your own comments.", "A poll question cannot change after someone votes.",
    "This poll no longer exists.", "You have already voted in this poll.",
    "You have already reported this post.", "This report has already been resolved.",
  ];
  if (error.message && safe.includes(error.message)) return error.message;
  if (error.code === "23505") return "That action has already been recorded. Refresh to see the latest.";
  return "We couldn't complete that request. Please try again in a moment.";
}

// Allowlisted metadata only: never log raw Auth errors, messages, emails, tokens,
// provider responses, or form values. Unknown provider codes remain redacted.
export function safeAuthDiagnostic(error: { code?: string; status?: number; message?: string }) {
  const known = ["unexpected_failure", "over_email_send_rate_limit", "over_request_rate_limit", "email_address_not_authorized", "email_address_invalid", "signup_disabled", "email_provider_disabled", "weak_password", "user_already_exists", "captcha_failed", "request_timeout"];
  return {
    code: error.code && known.includes(error.code) ? error.code : "unclassified_auth_error",
    status: Number.isInteger(error.status) && error.status! >= 400 && error.status! <= 599 ? error.status : undefined,
    emailSendFailed: error.message === "Error sending confirmation email" || error.message === "Error sending recovery email",
  };
}