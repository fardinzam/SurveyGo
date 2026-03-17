"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewResponseEmail = sendNewResponseEmail;
exports.sendMilestoneEmail = sendMilestoneEmail;
exports.sendWeeklySummaryEmail = sendWeeklySummaryEmail;
const params_1 = require("firebase-functions/params");
const mail_1 = __importDefault(require("@sendgrid/mail"));
const templates_1 = require("./templates");
const sendgridApiKey = (0, params_1.defineSecret)('SENDGRID_API_KEY');
const FROM_EMAIL = 'notifications@surveygo.app'; // must match verified sender in SendGrid
const FROM_NAME = 'SurveyGo';
function getSgMail() {
    mail_1.default.setApiKey(sendgridApiKey.value());
    return mail_1.default;
}
async function sendNewResponseEmail(params) {
    const mail = getSgMail();
    const { html, text } = (0, templates_1.newResponseTemplate)(params);
    await mail.send({
        to: params.toEmail,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `New response on "${params.surveyTitle}"`,
        html,
        text,
    });
}
async function sendMilestoneEmail(params) {
    const mail = getSgMail();
    const { html, text } = (0, templates_1.milestoneTemplate)(params);
    await mail.send({
        to: params.toEmail,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `🎉 "${params.surveyTitle}" just hit ${params.milestoneCount.toLocaleString()} responses!`,
        html,
        text,
    });
}
async function sendWeeklySummaryEmail(params) {
    const mail = getSgMail();
    const { html, text } = (0, templates_1.weeklySummaryTemplate)(params);
    await mail.send({
        to: params.toEmail,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `Your SurveyGo weekly summary — ${params.weekLabel}`,
        html,
        text,
    });
}
//# sourceMappingURL=sendEmail.js.map