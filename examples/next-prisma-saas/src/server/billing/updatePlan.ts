export function getBillingProvider(): string {
  return process.env.STRIPE_SECRET_KEY ? "stripe" : "fixture";
}
