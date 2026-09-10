/**
 * Client for external Certificate generation API.
 * Exact endpoint: POST https://warm-vans-switch.loca.lt/api/certificates/generate
 * (no trailing slash — slash returns HTTP 405)
 */

const stripTrailingSlashes = (value = '') => String(value).trim().replace(/\/+$/, '');

/**
 * Resolve full generate URL.
 * Supports:
 * - CERTIFICATE_API_URL = full endpoint
 * - or CERTIFICATE_API_BASE_URL + CERTIFICATE_GENERATE_PATH
 */
export const getGenerateUrl = () => {
  const full = stripTrailingSlashes(process.env.CERTIFICATE_API_URL || '');
  if (full) return full;

  const base = stripTrailingSlashes(
    process.env.CERTIFICATE_API_BASE_URL || 'https://warm-vans-switch.loca.lt'
  );

  // If base already includes the generate path, use it as-is
  if (/\/api\/certificates\/generate$/i.test(base)) {
    return base;
  }

  let path = (process.env.CERTIFICATE_GENERATE_PATH || '/api/certificates/generate').trim();
  path = path.startsWith('/') ? path : `/${path}`;
  path = stripTrailingSlashes(path);

  return `${base}${path}`;
};

const getBaseUrl = () => {
  const generateUrl = getGenerateUrl();
  try {
    const u = new URL(generateUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return stripTrailingSlashes(
      process.env.CERTIFICATE_API_BASE_URL || 'https://warm-vans-switch.loca.lt'
    );
  }
};

const buildAbsoluteUrl = (relativeOrAbsolute) => {
  if (!relativeOrAbsolute) return '';
  if (/^https?:\/\//i.test(relativeOrAbsolute)) {
    try {
      const u = new URL(relativeOrAbsolute);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return `${getBaseUrl()}${u.pathname}${u.search}`;
      }
    } catch {
      /* keep as-is */
    }
    return relativeOrAbsolute;
  }
  return `${getBaseUrl()}${relativeOrAbsolute.startsWith('/') ? '' : '/'}${relativeOrAbsolute}`;
};

const callCertApi = async (body) => {
  const url = getGenerateUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    console.log(`[CERT API] POST ${url}`);

    const res = await fetch(url, {
      method: 'POST',
      redirect: 'manual', // avoid redirect adding trailing slash → 405
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'bypass-tunnel-reminder': 'true',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    // If tunnel/proxy still redirects, retry once on Location without trailing slash
    if ([301, 302, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (loc) {
        const retryUrl = stripTrailingSlashes(
          loc.startsWith('http') ? loc : `${getBaseUrl()}${loc.startsWith('/') ? loc : `/${loc}`}`
        );
        console.log(`[CERT API] redirect → retry POST ${retryUrl}`);
        const retry = await fetch(retryUrl, {
          method: 'POST',
          redirect: 'manual',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'bypass-tunnel-reminder': 'true',
            'User-Agent': 'Mozilla/5.0'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        return parseCertResponse(retry, retryUrl);
      }
    }

    return parseCertResponse(res, url);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Certificate API timed out. Check CERTIFICATE_API_BASE_URL / tunnel.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

const parseCertResponse = async (res, url) => {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Certificate API returned non-JSON (${res.status}) from ${url}: ${text.slice(0, 200)}`
    );
  }

  if (!res.ok) {
    const detail = data?.detail || data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(`Certificate API error (${res.status}) at ${url}: ${detail}`);
  }

  if (data?.status && data.status !== 'success') {
    throw new Error(data?.message || data?.error || 'Certificate generation failed');
  }

  return data;
};

const normalizeResult = (data) => ({
  ...data,
  cert_id: data.cert_id || data.id || '',
  verify_hash: data.verify_hash || '',
  full_pdf_url: buildAbsoluteUrl(data.full_pdf_url || data.pdf_url),
  pdf_url: data.pdf_url || '',
  svg_url: data.svg_url || ''
});

/**
 * Generate a single certificate via POST /api/certificates/generate
 */
export const generateCertificate = async (payload) => {
  const data = await callCertApi(payload);
  return normalizeResult(data);
};

/**
 * Generate certificates one-by-one (same generate API for each user).
 */
export const batchGenerateCertificates = async ({
  template_id,
  items,
  issue_date,
  signatory1_name,
  signatory2_name,
  course_title
}) => {
  const certificates = [];
  const errors = [];

  for (const item of items || []) {
    try {
      const data = await generateCertificate({
        recipient_name: item.recipient_name,
        recipient_email: item.recipient_email,
        course_title: item.course_title || course_title,
        issue_date,
        template_id,
        signatory1_name,
        signatory2_name
      });
      certificates.push(normalizeResult(data));
    } catch (err) {
      errors.push({
        recipient_name: item.recipient_name,
        recipient_email: item.recipient_email,
        error: err.message
      });
    }
  }

  return {
    status: 'success',
    count: certificates.length,
    certificates,
    errors
  };
};

export const resolvePdfUrl = buildAbsoluteUrl;

/**
 * Fetch a remote certificate file (PDF/SVG) for inline preview/download proxy.
 */
export const fetchCertificateFile = async (fileUrl) => {
  const url = buildAbsoluteUrl(fileUrl);
  if (!url) throw new Error('Certificate file URL is missing');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/pdf,image/svg+xml,*/*',
        'bypass-tunnel-reminder': 'true',
        'User-Agent': 'Mozilla/5.0'
      },
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch certificate file (${res.status})`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/pdf';
    return { buffer, contentType, url };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Certificate file fetch timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

export default {
  generateCertificate,
  batchGenerateCertificates,
  resolvePdfUrl,
  fetchCertificateFile,
  getGenerateUrl
};
