export function roundCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatUsd(value: number) {
  return `$${roundCents(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
