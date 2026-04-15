"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingKillSwitch = void 0;
const billing_1 = require("@google-cloud/billing");
const pubsub_1 = require("firebase-functions/v2/pubsub");
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? '';
const PROJECT_NAME = `projects/${PROJECT_ID}`;
const BUDGET_TOPIC = 'budget-alerts'; // Must match the Pub/Sub topic linked to your budget
/**
 * Billing Kill Switch
 *
 * Listens to GCP budget alert notifications via Pub/Sub.
 * When spend exceeds the budget threshold, disables billing
 * on the project — stopping all paid services.
 *
 * Setup:
 * 1. Create a budget in GCP Console → Billing → Budgets & alerts
 * 2. Set amount to $10
 * 3. Connect it to a Pub/Sub topic named "budget-alerts"
 * 4. Grant the Cloud Functions service account the role:
 *    roles/billing.projectManager
 */
exports.billingKillSwitch = (0, pubsub_1.onMessagePublished)(BUDGET_TOPIC, async (event) => {
    const data = event.data.message.json;
    console.log(`Budget notification: ${data.budgetDisplayName} — ` +
        `spent ${data.costAmount} ${data.currencyCode} of ${data.budgetAmount} ${data.currencyCode} budget`);
    // Only kill billing if we've exceeded the budget
    if (data.costAmount <= data.budgetAmount) {
        console.log('Cost is within budget. No action taken.');
        return;
    }
    console.warn(`⚠️ COST EXCEEDED BUDGET. Disabling billing for project ${PROJECT_ID}...`);
    const billingClient = new billing_1.CloudBillingClient();
    try {
        const [projectBilling] = await billingClient.getProjectBillingInfo({ name: PROJECT_NAME });
        if (!projectBilling.billingEnabled) {
            console.log('Billing is already disabled.');
            return;
        }
        await billingClient.updateProjectBillingInfo({
            name: PROJECT_NAME,
            projectBillingInfo: {
                billingAccountName: '', // Setting to empty string disables billing
            },
        });
        console.warn(`🛑 Billing DISABLED for project ${PROJECT_ID}.`);
    }
    catch (err) {
        console.error('Failed to disable billing:', err);
        throw err;
    }
});
//# sourceMappingURL=killSwitch.js.map