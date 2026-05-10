type Translate = (key: string) => string;

const SYSTEM_LABEL_KEYS: Record<string, string> = {
  "credit card": "labels.accountTypes.creditCard",
  "debit card": "labels.accountTypes.debitCard",
  cdt: "labels.accountTypes.cdt",
  external: "labels.accountTypes.external",
  user: "labels.roles.user",
  admin: "labels.roles.admin",
  success: "labels.transactionStatuses.success",
  pending: "labels.transactionStatuses.pending",
  expense: "labels.transactionTypes.expense",
  income: "labels.transactionTypes.income",
  transfer: "labels.transactionTypes.transfer",
  settled: "labels.splitStatuses.settled",
  "pending receival": "labels.splitStatuses.pendingReceival",
  "pending payment": "labels.splitStatuses.pendingPayment",
  ignored: "labels.splitStatuses.ignored",
};

export function getSystemLabelKey(value: string | null | undefined) {
  if (!value) return null;
  return SYSTEM_LABEL_KEYS[value.trim().toLowerCase()] ?? null;
}

export function formatSystemLabel(value: string | null | undefined, t: Translate) {
  if (!value) return "";
  const key = getSystemLabelKey(value);
  return key ? t(key) : value;
}
