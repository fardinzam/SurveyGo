import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

export const getBillingData = onCall(
  { secrets: [stripeSecretKey], cors: true, invoker: 'public' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    let stripeCustomerId: string | undefined;
    try {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      stripeCustomerId = userDoc.data()?.subscription?.stripeCustomerId as string | undefined;
    } catch {
      throw new HttpsError('internal', 'Failed to load user data.');
    }

    if (!stripeCustomerId) {
      return { paymentMethod: null, invoices: [] };
    }

    const stripe = new Stripe(stripeSecretKey.value());

    let paymentMethods: Stripe.ApiList<Stripe.PaymentMethod>;
    let invoiceList: Stripe.ApiList<Stripe.Invoice>;
    try {
      [paymentMethods, invoiceList] = await Promise.all([
        stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card', limit: 1 }),
        stripe.invoices.list({ customer: stripeCustomerId, limit: 5 }),
      ]);
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        throw new HttpsError('internal', 'Failed to fetch billing data.');
      }
      throw err;
    }

    const pm = paymentMethods.data[0]?.card ?? null;
    const paymentMethod = pm
      ? {
          brand: pm.brand,
          last4: pm.last4,
          expMonth: pm.exp_month,
          expYear: pm.exp_year,
          name: paymentMethods.data[0].billing_details.name ?? null,
        }
      : null;

    const invoices = invoiceList.data.map((inv) => ({
      id: inv.id,
      date: inv.created,
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? 'unknown',
      description: inv.description ?? inv.lines.data[0]?.description ?? null,
    }));

    return { paymentMethod, invoices };
  }
);
