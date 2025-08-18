import {
    createCsrfProtect,
    CsrfError,
  } from 'csrf-sync';
import rateLimit from 'express-rate-limit';

const LAN_ALLOWLIST = (process.env.LAN_ALLOWLIST || '127.0.0.1,::1').split(',');

export const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes',
    // Use express-rate-limit's memory store by default.
    // For production, a more robust external store like redis or memcached is recommended.
});

const {
    generateToken: generateCsrfToken,
    validateToken: validateCsrfToken,
  } = createCsrfProtect({
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  });

export { generateCsrfToken, validateCsrfToken, CsrfError };

export function lanFirewall(request) {
    const ip = (request.headers['x-forwarded-for'] || request.socket.remoteAddress)?.split(',')[0].trim();
    if (ip && !isAllowed(ip)) {
        console.warn(`[Firewall] Denied access to IP: ${ip}`);
        return {
            status: 403,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Access Denied'
        };
    }
    return null;
}

function isAllowed(ip) {
    // This is a simplified check. For production, use a robust library like `ip-range-check`.
    if (!ip) return false;
    return LAN_ALLOWLIST.some(allowedIp => {
        if (allowedIp.includes('/')) { // CIDR range
            // Basic CIDR check, not fully compliant.
            const [range, bits] = allowedIp.split('/');
            const ipParts = ip.split('.').map(Number);
            const rangeParts = range.split('.').map(Number);
            const mask = -1 << (32 - parseInt(bits, 10));
            const ipLong = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
            const rangeLong = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
            return (ipLong & mask) === (rangeLong & mask);
        }
        return ip === allowedIp;
    });
}

