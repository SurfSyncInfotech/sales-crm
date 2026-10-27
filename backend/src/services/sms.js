/**
 * SmartPing Sparc DLT SMS Gateway Service
 */

async function sendOtpSms({ phone, otp, validMinutes = 10 }) {
  const baseUrl = (process.env.SMS_API_BASE_URL || 'https://pgapi.sparc.smartping.io/fe').replace(/\/+$/, '');
  const username = process.env.SMS_API_USERNAME;
  const password = process.env.SMS_API_PASSWORD;
  const from = process.env.SMS_SENDER_ID || 'SFSYNC';
  const dltContentId = process.env.SMS_DLT_CONTENT_ID;
  const dltPrincipalEntityId = process.env.SMS_DLT_PEID;
  const dltTelemarketerId = process.env.SMS_DLT_TELEMARKETER_ID;
  const unicode = process.env.SMS_UNICODE || 'false';

  if (!username || !password) {
    console.warn('[SmartPing SMS] Credentials missing in .env');
    return { success: false, reason: 'SMS credentials missing' };
  }

  // Format recipient phone number with country code 91
  const digitsOnly = String(phone).replace(/\D/g, '');
  const to = digitsOnly.startsWith('91') && digitsOnly.length === 12
    ? digitsOnly
    : digitsOnly.length === 10
      ? `91${digitsOnly}`
      : digitsOnly;

  // Construct DLT-approved template message
  const rawTemplate = process.env.SMS_OTP_MESSAGE ||
    "Your SurfSync Infotech verification code is {#var#}. This OTP is valid for {#var#} minutes. Do not share this code with anyone.";
  const text = rawTemplate.replace('{#var#}', otp).replace('{#var#}', String(validMinutes));

  const params = new URLSearchParams({
    username,
    password,
    from,
    to,
    text,
    unicode,
    ...(dltContentId ? { dltContentId, templateid: dltContentId } : {}),
    ...(dltPrincipalEntityId ? { dltPrincipalEntityId, entityid: dltPrincipalEntityId } : {}),
    ...(dltTelemarketerId ? { dltTelemarketerId, tmid: dltTelemarketerId } : {}),
  });

  const url = `${baseUrl}/api/v1/send?${params.toString()}`;

  if (process.env.SMS_LOG_OTP === 'true') {
    console.log(`[SmartPing SMS] Dispatching to ${to}: "${text}"`);
  }

  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.statusCode === 200 || data.state === 'SUBMIT_ACCEPTED')) {
      console.log(`[SmartPing SMS] Sent successfully to ${to} (TxID: ${data.transactionId || 'OK'})`);
      return { success: true, transactionId: data.transactionId, data };
    } else {
      console.error(`[SmartPing SMS Error] Status: ${res.status}`, data);
      return { success: false, error: data };
    }
  } catch (err) {
    console.error(`[SmartPing SMS Network Error]:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendOtpSms };
