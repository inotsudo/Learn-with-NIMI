import Stripe from "stripe";
import * as dotenv from "dotenv";
import * as path from "path";

// load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("⚠️ STRIPE_SECRET_KEY not found in environment variables!");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});


async function main() {
  const monthly = await stripe.products.create({ name: "Premium Plan (Monthly)" });
  const monthlyPrice = await stripe.prices.create({
    product: monthly.id,
    unit_amount: 699,
    currency: "usd",
    recurring: { interval: "month" },
  });

  console.log("✅ Monthly Price ID:", monthlyPrice.id);

  const yearly = await stripe.products.create({ name: "Premium Plan (Yearly)" });
  const yearlyPrice = await stripe.prices.create({
    product: yearly.id,
    unit_amount: 5999,
    currency: "usd",
    recurring: { interval: "year" },
  });

  console.log("✅ Yearly Price ID:", yearlyPrice.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
