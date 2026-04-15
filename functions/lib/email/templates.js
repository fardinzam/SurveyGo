"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newResponseTemplate = newResponseTemplate;
exports.milestoneTemplate = milestoneTemplate;
exports.weeklySummaryTemplate = weeklySummaryTemplate;
const APP_URL = process.env.APP_URL ?? 'https://surveygo-effcc.web.app';
const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 600px;
  margin: 0 auto;
  color: #1a1a2e;
`;
const buttonStyle = `
  display: inline-block;
  background: #6366f1;
  color: #ffffff;
  padding: 12px 28px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
`;
const footerHtml = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>
  <p style="color:#6b7280;font-size:13px;text-align:center">
    You're receiving this because you enabled notifications in
    <a href="${APP_URL}/app/settings" style="color:#6366f1">SurveyGo settings</a>.
    You can unsubscribe at any time from that page.
  </p>
`;
// ── New Response ─────────────────────────────────────────────────────────────
function newResponseTemplate(params) {
    const url = `${APP_URL}/app/surveys/${params.surveyId}/results`;
    const html = `
<div style="${baseStyle}">
  <h2 style="color:#6366f1;margin-bottom:4px">New response received</h2>
  <p style="color:#4b5563;margin-top:0">${params.surveyTitle}</p>
  <p>Someone just submitted a response to your survey. You now have
     <strong>${params.responseCount.toLocaleString()}</strong>
     ${params.responseCount === 1 ? 'response' : 'responses'} total.</p>
  <p style="margin-top:24px">
    <a href="${url}" style="${buttonStyle}">View responses</a>
  </p>
  ${footerHtml}
</div>`;
    const text = `New response on "${params.surveyTitle}"\n\n`
        + `You now have ${params.responseCount} response(s) total.\n\n`
        + `View results: ${url}`;
    return { html, text };
}
// ── Milestone ─────────────────────────────────────────────────────────────────
function milestoneTemplate(params) {
    const url = `${APP_URL}/app/surveys/${params.surveyId}/results`;
    const count = params.milestoneCount.toLocaleString();
    const html = `
<div style="${baseStyle}">
  <h2 style="color:#6366f1;margin-bottom:4px">🎉 ${count} responses!</h2>
  <p style="color:#4b5563;margin-top:0">${params.surveyTitle}</p>
  <p>Your survey just crossed <strong>${count} responses</strong>. Congratulations!</p>
  <p style="margin-top:24px">
    <a href="${url}" style="${buttonStyle}">View results</a>
  </p>
  ${footerHtml}
</div>`;
    const text = `"${params.surveyTitle}" just hit ${count} responses!\n\nView results: ${url}`;
    return { html, text };
}
// ── Weekly Summary ────────────────────────────────────────────────────────────
function weeklySummaryTemplate(params) {
    const rows = params.summaries.map((s) => {
        const url = `${APP_URL}/app/surveys/${s.surveyId}/results`;
        return `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb">
          <a href="${url}" style="color:#6366f1;font-weight:600;text-decoration:none">${s.surveyTitle}</a>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right">+${s.newResponses.toLocaleString()}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${s.totalResponses.toLocaleString()}</td>
      </tr>`;
    }).join('');
    const html = `
<div style="${baseStyle}">
  <h2 style="color:#6366f1;margin-bottom:4px">Your weekly summary</h2>
  <p style="color:#4b5563;margin-top:0">${params.weekLabel}</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <thead>
      <tr style="background:#f3f4f6">
        <th style="padding:10px 8px;text-align:left;font-size:13px;color:#6b7280">Survey</th>
        <th style="padding:10px 8px;text-align:right;font-size:13px;color:#6b7280">This week</th>
        <th style="padding:10px 8px;text-align:right;font-size:13px;color:#6b7280">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:24px">
    <a href="${APP_URL}/app/dashboard" style="${buttonStyle}">Go to dashboard</a>
  </p>
  ${footerHtml}
</div>`;
    const textRows = params.summaries.map((s) => `  ${s.surveyTitle}: +${s.newResponses} this week (${s.totalResponses} total)`).join('\n');
    const text = `Your SurveyGo weekly summary — ${params.weekLabel}\n\n${textRows}\n\nDashboard: ${APP_URL}/app/dashboard`;
    return { html, text };
}
//# sourceMappingURL=templates.js.map