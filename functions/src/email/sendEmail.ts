import { defineSecret } from 'firebase-functions/params';
import sgMail from '@sendgrid/mail';
import {
    newResponseTemplate,
    milestoneTemplate,
    weeklySummaryTemplate,
} from './templates';

const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

const FROM_EMAIL = 'notifications@surveygo.app'; // must match verified sender in SendGrid
const FROM_NAME = 'SurveyGo';

// Set to false to re-enable real SendGrid sends (requires valid API key + verified sender).
const STUB_EMAILS = true;

function getSgMail() {
    sgMail.setApiKey(sendgridApiKey.value());
    return sgMail;
}

export async function sendNewResponseEmail(params: {
    toEmail: string;
    surveyTitle: string;
    surveyId: string;
    responseId: string;
    responseCount: number;
}): Promise<void> {
    if (STUB_EMAILS) { console.log('[stub email] new-response skipped', { to: params.toEmail }); return; }
    const mail = getSgMail();
    const { html, text } = newResponseTemplate(params);
    await mail.send({
        to: params.toEmail,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `New response on "${params.surveyTitle}"`,
        html,
        text,
    });
}

export async function sendMilestoneEmail(params: {
    toEmail: string;
    surveyTitle: string;
    surveyId: string;
    milestoneCount: number;
}): Promise<void> {
    if (STUB_EMAILS) { console.log('[stub email] milestone skipped', { to: params.toEmail }); return; }
    const mail = getSgMail();
    const { html, text } = milestoneTemplate(params);
    await mail.send({
        to: params.toEmail,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `🎉 "${params.surveyTitle}" just hit ${params.milestoneCount.toLocaleString()} responses!`,
        html,
        text,
    });
}

export async function sendWeeklySummaryEmail(params: {
    toEmail: string;
    summaries: Array<{
        surveyTitle: string;
        surveyId: string;
        newResponses: number;
        totalResponses: number;
    }>;
    weekLabel: string;
}): Promise<void> {
    if (STUB_EMAILS) { console.log('[stub email] weekly-summary skipped', { to: params.toEmail }); return; }
    const mail = getSgMail();
    const { html, text } = weeklySummaryTemplate(params);
    await mail.send({
        to: params.toEmail,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `Your SurveyGo weekly summary — ${params.weekLabel}`,
        html,
        text,
    });
}

export async function sendInvitationEmail(params: {
    toEmail: string;
    surveyTitle: string;
    surveyUrl: string;
    subject: string;
    body: string;
}): Promise<void> {
    if (STUB_EMAILS) { console.log('[stub email] invitation skipped', { to: params.toEmail }); return; }
    const mail = getSgMail();
    await mail.send({
        to: params.toEmail,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: params.subject,
        html: `<p>${params.body.replace(/\n/g, '<br>')}</p>`,
        text: params.body,
    });
}
