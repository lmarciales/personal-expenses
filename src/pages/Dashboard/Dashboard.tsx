import { Navbar } from "@/components/Navbar";
import { Products } from "@/components/Products";
import { Transactions } from "@/components/Transactions";

export const Dashboard = () => {
  const products = [
    { id: 1, name: "Debit Card", balance: 1234.56, color: "bg-blue-500" },
    { id: 2, name: "Credit Card", balance: 5678.9, color: "bg-green-500" },
    { id: 3, name: "Savings Account", balance: 9876.54, color: "bg-yellow-500" },
    { id: 4, name: "Investment Account", balance: 15000.0, color: "bg-purple-500" },
    { id: 5, name: "Emergency Fund", balance: 5000.0, color: "bg-red-500" },
  ];

  const transactions = [
    { id: 1, description: "Grocery Store", amount: -75.5, date: "2023-06-15", category: "Food" },
    { id: 2, description: "Salary Deposit", amount: 3000, date: "2023-06-01", category: "Income" },
    { id: 3, description: "Electric Bill", amount: -85.2, date: "2023-06-10", category: "Utilities" },
    { id: 4, description: "Restaurant Dinner", amount: -45.8, date: "2023-06-12", category: "Food" },
    { id: 5, description: "Gasoline", amount: -50.0, date: "2023-06-14", category: "Transportation" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="container flex-grow p-4 mx-auto">
        <Products products={products} />
        <Transactions transactions={transactions} />
      </main>
    </div>
  );
};
