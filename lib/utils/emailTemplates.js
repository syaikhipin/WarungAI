/**
 * Email template generator for shift closure reports
 */

export function generateShiftClosureEmail(shiftData, transactions = []) {
  const formatUSD = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalRevenue = shiftData?.totalRevenue || 0;
  const totalExpenses = shiftData?.totalExpenses || 0;
  const netProfit = totalRevenue - totalExpenses;
  const transactionCount = transactions.length;

  // Generate transaction rows
  const transactionRows = transactions.map((tx, index) => {
    const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
    const itemsList = Array.isArray(items)
      ? items.map(item => `${item.quantity}x ${item.name}`).join(', ')
      : '-';

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 12px 8px;">${formatDate(tx.transactionDate)}</td>
        <td style="padding: 12px 8px;">${itemsList}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 600;">${formatUSD(tx.totalAmount)}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shift Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">📊 Shift Report</h1>
      <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 16px;">
        Shift ${shiftData?.shiftNumber || '-'} • ${formatDate(shiftData?.date)}
      </p>
    </div>

    <!-- Summary Cards -->
    <div style="padding: 24px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <!-- Revenue Card -->
        <div style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 16px;">
          <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 600;">Revenue</p>
          <p style="margin: 8px 0 0 0; color: #15803d; font-size: 24px; font-weight: 700;">${formatUSD(totalRevenue)}</p>
        </div>

        <!-- Expenses Card -->
        <div style="background-color: #fef2f2; border: 2px solid #fca5a5; border-radius: 12px; padding: 16px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">Expenses</p>
          <p style="margin: 8px 0 0 0; color: #dc2626; font-size: 24px; font-weight: 700;">${formatUSD(totalExpenses)}</p>
        </div>
      </div>

      <!-- Net Profit Card -->
      <div style="background: linear-gradient(135deg, ${netProfit >= 0 ? '#10b981' : '#ef4444'} 0%, ${netProfit >= 0 ? '#059669' : '#dc2626'} 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600; opacity: 0.9;">Net Profit</p>
        <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 32px; font-weight: 700;">${formatUSD(netProfit)}</p>
        <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.8;">
          ${transactionCount} transactions
        </p>
      </div>

      <!-- Shift Details -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 700;">Shift Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Shift Start</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">
              ${formatDate(shiftData?.startTime)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Shift End</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">
              ${formatDate(shiftData?.endTime)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Opening Cash</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">
              ${formatUSD(shiftData?.startingCash)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Closing Cash</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">
              ${formatUSD(shiftData?.endingCash)}
            </td>
          </tr>
        </table>
      </div>

      <!-- Transactions Table -->
      ${transactionCount > 0 ? `
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 700;">Transaction History</h2>
        <div style="overflow-x: auto; border-radius: 12px; border: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
            <thead>
              <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 12px 8px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">#</th>
                <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Time</th>
                <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Items</th>
                <th style="padding: 12px 8px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <!-- Notes -->
      ${shiftData?.notes ? `
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">Notes:</p>
        <p style="margin: 8px 0 0 0; color: #78350f; font-size: 14px;">${shiftData.notes}</p>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        This report was automatically generated by <strong style="color: #667eea;">WarungAI</strong>
      </p>
      <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
        ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
