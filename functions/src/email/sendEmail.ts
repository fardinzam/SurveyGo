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
