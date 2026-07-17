// Rwanda card payments use CyberSource which doesn't support RWF.
// We convert price_rwf to USD using a configurable rate so both MoMo and card
// cost the same in local terms. Set RWF_PER_USD in env to update the rate.
const RWF_PER_USD = Number(process.env.RWF_PER_USD ?? 1300);

// Converts an RWF amount to USD, rounding up to the nearest cent.
export function rwfToUsd(rwf: number): number {
  return Math.ceil((rwf / RWF_PER_USD) * 100) / 100;
}
