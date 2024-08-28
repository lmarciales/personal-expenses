import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string;
}

const Transactions = ({ transactions }: { transactions: Transaction[] }) => {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Recent Transactions</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.description}</TableCell>
                <TableCell className={transaction.amount < 0 ? "text-red-500" : "text-green-500"}>
                  ${Math.abs(transaction.amount).toFixed(2)}
                </TableCell>
                <TableCell>{transaction.date}</TableCell>
                <TableCell>{transaction.category}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Transactions;
