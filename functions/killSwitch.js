// Billing kill switch: a Cloud Billing budget publishes its status to a Pub/Sub topic several times a
// day; once actual spend reaches the budget, this unlinks the billing account from the project.
// Everything paid stops (functions, writes above the free tier); Firestore data is kept. Re-link the
// billing account in the console to turn it back on. Budget data lags by hours, so this caps a
// runaway bill rather than preventing any spend at all.

const KILL_SWITCH_TOPIC = 'billing-kill-switch';

const METADATA = 'http://metadata.google.internal/computeMetadata/v1';
const BILLING_API = 'https://cloudbilling.googleapis.com/v1';

// Hard ceiling regardless of what the console budget says, so raising the budget by mistake can't
// lift it. Only applied to USD billing accounts: the payload is in the account's currency, and 5 of
// another currency would mean something else entirely.
const MAX_MONTHLY_SPEND_USD = 5;

// Budget notification payload: https://cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications
// costAmount is spend so far in the budget period (a month by default).
function spendLimit({ budgetAmount, currencyCode }) {
  const budget = typeof budgetAmount === 'number' ? budgetAmount : Infinity;
  return currencyCode === 'USD' ? Math.min(budget, MAX_MONTHLY_SPEND_USD) : budget;
}

function shouldDisableBilling(notification) {
  if (!notification || typeof notification.costAmount !== 'number') return false;
  return notification.costAmount >= spendLimit(notification);
}

async function metadata(path) {
  const res = await fetch(`${METADATA}/${path}`, { headers: { 'Metadata-Flavor': 'Google' } });
  if (!res.ok) throw new Error(`Metadata ${path} failed (${res.status})`);
  return res;
}

// Uses the function's own service account; it needs Billing Account Administrator on the billing
// account and Project Billing Manager on the project (see README).
async function disableProjectBilling(logger) {
  const projectId = await (await metadata('project/project-id')).text();
  const { access_token: token } = await (await metadata('instance/service-accounts/default/token')).json();
  const url = `${BILLING_API}/projects/${projectId}/billingInfo`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const current = await fetch(url, { headers });
  if (!current.ok) throw new Error(`Reading billing info failed (${current.status}): ${await current.text()}`);
  if (!(await current.json()).billingEnabled) {
    logger.info('[KillSwitch] billing already disabled');
    return false;
  }

  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ billingAccountName: '' }) });
  if (!res.ok) throw new Error(`Disabling billing failed (${res.status}): ${await res.text()}`);
  logger.warn(`[KillSwitch] billing disabled for ${projectId}`);
  return true;
}

module.exports = { KILL_SWITCH_TOPIC, MAX_MONTHLY_SPEND_USD, shouldDisableBilling, spendLimit, disableProjectBilling };
