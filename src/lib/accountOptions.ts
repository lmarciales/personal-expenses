export interface MoneyMovementAccount {
  id: string;
  type: string;
}

interface MoneyMovementAccountOptions {
  excludeAccountId?: string;
  excludeCreditCards?: boolean;
}

export function isCdtAccount(account: { type: string }): boolean {
  return account.type === "CDT";
}

export function getMoneyMovementAccountOptions<TAccount extends MoneyMovementAccount>(
  accounts: TAccount[],
  options: MoneyMovementAccountOptions = {},
): TAccount[] {
  return accounts.filter((account) => {
    if (isCdtAccount(account)) return false;
    if (options.excludeAccountId && account.id === options.excludeAccountId) return false;
    if (options.excludeCreditCards && account.type === "Credit Card") return false;
    return true;
  });
}
