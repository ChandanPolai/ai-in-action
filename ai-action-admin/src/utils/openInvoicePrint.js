/**
 * Open / print a GST invoice.
 * Uses a Blob URL (avoids window.open noopener returning null).
 * Falls back to hidden iframe print if popups are blocked.
 */

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const nl2br = (value) => escapeHtml(value).replace(/\n/g, '<br/>');

const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(d);
  }
};

const buildInvoiceHtml = (inv) => {
  const taxRows = [];
  if (Number(inv.cgstAmount) > 0 || Number(inv.sgstAmount) > 0) {
    taxRows.push(
      `<tr><td>CGST (${(Number(inv.gstPercent) / 2).toFixed(1)}%)</td><td style="text-align:right">${money(inv.cgstAmount)}</td></tr>`
    );
    taxRows.push(
      `<tr><td>SGST (${(Number(inv.gstPercent) / 2).toFixed(1)}%)</td><td style="text-align:right">${money(inv.sgstAmount)}</td></tr>`
    );
  } else {
    taxRows.push(
      `<tr><td>IGST (${Number(inv.gstPercent || 0)}%)</td><td style="text-align:right">${money(inv.igstAmount || inv.gstAmount)}</td></tr>`
    );
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(inv.invoiceNumber || 'Invoice')}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
    .sheet { max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 28px; }
    h1 { margin: 0; font-size: 22px; letter-spacing: 0.04em; }
    .muted { color: #64748b; font-size: 12px; line-height: 1.5; }
    .row { display: flex; justify-content: space-between; gap: 24px; }
    .box { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; font-size: 13px; }
    th { background: #f8fafc; text-align: left; }
    .totals td { border: none; padding: 6px 0; }
    .totals tr td:last-child { text-align: right; font-weight: 600; }
    .grand { font-size: 16px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .actions { margin: 16px auto; max-width: 800px; text-align: right; }
    .actions button { background: #1e3a5f; color: #fff; border: 0; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 700; }
    @media print { .actions { display: none !important; } .sheet { border: none; padding: 0; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="actions"><button type="button" onclick="window.print()">Print / Save PDF</button></div>
  <div class="sheet">
    <div class="row" style="align-items:flex-start;margin-bottom:18px;">
      <div>
        <h1>TAX INVOICE</h1>
        <div class="muted" style="margin-top:6px;">GST Invoice</div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700;font-size:16px;">${escapeHtml(inv.companyName || 'AI in Action')}</div>
        <div class="muted">${nl2br(inv.companyAddress || '')}</div>
        ${inv.companyGstin ? `<div class="muted">GSTIN: ${escapeHtml(inv.companyGstin)}</div>` : ''}
        ${inv.companyPan ? `<div class="muted">PAN: ${escapeHtml(inv.companyPan)}</div>` : ''}
        ${inv.companyState ? `<div class="muted">State: ${escapeHtml(inv.companyState)}</div>` : ''}
        ${
          inv.companyPhone || inv.companyEmail
            ? `<div class="muted">${escapeHtml([inv.companyPhone, inv.companyEmail].filter(Boolean).join(' · '))}</div>`
            : ''
        }
      </div>
    </div>

    <div class="row" style="margin-bottom:18px;">
      <div class="box">
        <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.06em;margin-bottom:6px;">BILL TO</div>
        <div style="font-weight:700;">${escapeHtml(inv.buyerName || '')}</div>
        <div class="muted">${nl2br(inv.buyerAddress || '')}</div>
        <div class="muted">${escapeHtml([inv.buyerEmail, inv.buyerMobile].filter(Boolean).join(' · '))}</div>
        ${inv.buyerGstin ? `<div class="muted">GSTIN: ${escapeHtml(inv.buyerGstin)}</div>` : ''}
        ${inv.buyerState ? `<div class="muted">State: ${escapeHtml(inv.buyerState)}</div>` : ''}
      </div>
      <div class="box" style="text-align:right;">
        <div><strong>Invoice No:</strong> ${escapeHtml(inv.invoiceNumber || '—')}</div>
        <div class="muted">Date: ${escapeHtml(fmtDate(inv.invoiceDate))}</div>
        <div style="margin-top:8px;"><span class="badge">${escapeHtml(inv.paymentStatus || 'paid')}</span></div>
        ${inv.workshopTitle ? `<div class="muted" style="margin-top:8px;">Workshop: ${escapeHtml(inv.workshopTitle)}</div>` : ''}
        ${inv.courseTitle ? `<div class="muted">Course: ${escapeHtml(inv.courseTitle)}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:60%">Description</th>
          <th style="text-align:right">Taxable Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(inv.description || 'Training / Workshop Fee')}</td>
          <td style="text-align:right">${money(inv.taxableAmount)}</td>
        </tr>
      </tbody>
    </table>

    <table class="totals" style="width:320px;margin-left:auto;margin-top:16px;">
      <tr><td>Taxable Amount</td><td>${money(inv.taxableAmount)}</td></tr>
      ${taxRows.join('')}
      <tr><td>Total GST</td><td>${money(inv.gstAmount)}</td></tr>
      <tr class="grand"><td>Grand Total</td><td>${money(inv.totalAmount)}</td></tr>
      <tr><td>Amount Paid</td><td>${money(inv.amountPaid)}</td></tr>
      ${inv.paymentMode ? `<tr><td>Payment Mode</td><td>${escapeHtml(inv.paymentMode)}</td></tr>` : ''}
    </table>

    ${inv.notes ? `<p class="muted" style="margin-top:24px;"><strong>Notes:</strong> ${escapeHtml(inv.notes)}</p>` : ''}
    <p class="muted" style="margin-top:28px;text-align:center;">This is a computer-generated GST invoice.</p>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { try { window.focus(); } catch (e) {} }, 100);
    });
  </script>
</body>
</html>`;
};

const printViaIframe = (html) => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'invoice-print');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      /* ignore */
    }
    cleanup();
  }, 300);

  return true;
};

/**
 * @returns {'opened'|'printed'|'failed'}
 */
export const openInvoicePrint = (inv) => {
  if (!inv) return 'failed';

  const html = buildInvoiceHtml(inv);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  // Do NOT pass noopener — it makes window.open return null in Chromium
  const w = window.open(url, '_blank');

  if (w) {
    try {
      w.focus();
    } catch {
      /* ignore */
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'opened';
  }

  URL.revokeObjectURL(url);
  const printed = printViaIframe(html);
  return printed ? 'printed' : 'failed';
};

export default openInvoicePrint;
