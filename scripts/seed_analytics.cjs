/**
 * Seed script for analytics testing data.
 * Inserts income and expense transactions across 2025 and 2026
 * to test year navigation, year-over-year comparisons, and income vs expenses charts.
 *
 * Usage: node scripts/seed_analytics.cjs
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load env vars from .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^(\w+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Expense payees with realistic COP amounts (ranges)
const expenseTemplates = [
  { payee: "Éxito Supermercado", minAmount: 150000, maxAmount: 450000 },
  { payee: "Rappi Delivery", minAmount: 25000, maxAmount: 80000 },
  { payee: "EPM Servicios", minAmount: 120000, maxAmount: 200000 },
  { payee: "Claro Internet", minAmount: 85000, maxAmount: 95000 },
  { payee: "Netflix", minAmount: 33000, maxAmount: 45000 },
  { payee: "Spotify", minAmount: 17000, maxAmount: 17000 },
  { payee: "Uber Rides", minAmount: 15000, maxAmount: 60000 },
  { payee: "Restaurante El Cielo", minAmount: 80000, maxAmount: 250000 },
  { payee: "Farmacia Pasteur", minAmount: 20000, maxAmount: 120000 },
  { payee: "Gym SmartFit", minAmount: 90000, maxAmount: 110000 },
  { payee: "Arriendo Apartamento", minAmount: 1200000, maxAmount: 1500000 },
  { payee: "Gasolina Terpel", minAmount: 80000, maxAmount: 180000 },
  { payee: "Falabella Ropa", minAmount: 100000, maxAmount: 350000 },
  { payee: "Dentista Dr. García", minAmount: 150000, maxAmount: 400000 },
  { payee: "Seguro SURA", minAmount: 200000, maxAmount: 300000 },
];

// Income payees
const incomeTemplates = [
  { payee: "Salario Mensual", minAmount: 4500000, maxAmount: 5500000 },
  { payee: "Freelance Web Dev", minAmount: 800000, maxAmount: 2000000 },
  { payee: "Dividendos CDT", minAmount: 50000, maxAmount: 200000 },
];

function randomAmount(min, max) {
  return Math.round((Math.random() * (max - min) + min) / 100) * 100;
}

function randomDay(month, year) {
  const maxDay = new Date(year, month, 0).getDate();
  return Math.floor(Math.random() * maxDay) + 1;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log("Fetching authenticated user...");

  // Get the first user's data by querying accounts
  const { data: accounts, error: accErr } = await supabase.from("accounts").select("id, user_id, name").limit(10);

  if (accErr || !accounts || accounts.length === 0) {
    console.error("No accounts found. Create at least one account first.", accErr);
    return;
  }

  const userId = accounts[0].user_id;
  const accountIds = accounts.map((a) => a.id);
  console.log(`Found user ${userId} with ${accounts.length} account(s): ${accounts.map((a) => a.name).join(", ")}`);

  // Get categories
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);

  if (catErr) {
    console.error("Error fetching categories:", catErr);
    return;
  }

  const categoryIds = (categories || []).map((c) => c.id);
  console.log(`Found ${categoryIds.length} categories: ${(categories || []).map((c) => c.name).join(", ")}`);

  // Generate transactions for 2025 (Jul-Dec) and 2026 (Jan-Mar already has data, skip or add Apr-Jun)
  const transactions = [];

  // 2025: July through December
  for (let month = 7; month <= 12; month++) {
    // 5-8 expenses per month
    const numExpenses = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numExpenses; i++) {
      const template = pickRandom(expenseTemplates);
      const day = randomDay(month, 2025);
      transactions.push({
        user_id: userId,
        account_id: pickRandom(accountIds),
        date: `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        total_amount: -randomAmount(template.minAmount, template.maxAmount),
        payee: template.payee,
        type: "expense",
        is_recurring: false,
        notes: null,
      });
    }

    // 1-2 income per month
    const numIncome = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numIncome; i++) {
      const template = incomeTemplates[i === 0 ? 0 : pickRandom([1, 2])];
      const day = i === 0 ? 1 : randomDay(month, 2025);
      transactions.push({
        user_id: userId,
        account_id: pickRandom(accountIds),
        date: `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        total_amount: randomAmount(template.minAmount, template.maxAmount),
        payee: template.payee,
        type: "income",
        is_recurring: false,
        notes: null,
      });
    }
  }

  // 2026: Add income transactions for Jan-Mar (expenses likely already exist)
  for (let month = 1; month <= 3; month++) {
    // 1-2 income per month
    const numIncome = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numIncome; i++) {
      const template = incomeTemplates[i === 0 ? 0 : pickRandom([1, 2])];
      const day = i === 0 ? 1 : randomDay(month, 2026);
      transactions.push({
        user_id: userId,
        account_id: pickRandom(accountIds),
        date: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        total_amount: randomAmount(template.minAmount, template.maxAmount),
        payee: template.payee,
        type: "income",
        is_recurring: false,
        notes: null,
      });
    }
  }

  console.log(`Inserting ${transactions.length} transactions...`);

  // Insert in batches of 50
  for (let i = 0; i < transactions.length; i += 50) {
    const batch = transactions.slice(i, i + 50);
    const { data: inserted, error: insertErr } = await supabase.from("transactions").insert(batch).select("id");

    if (insertErr) {
      console.error(`Batch insert error at offset ${i}:`, insertErr);
      return;
    }

    // Assign random categories to inserted transactions
    if (categoryIds.length > 0 && inserted) {
      const categoryLinks = [];
      for (const txn of inserted) {
        // 1-2 categories per transaction
        const numCats = 1 + Math.floor(Math.random() * Math.min(2, categoryIds.length));
        const shuffled = [...categoryIds].sort(() => Math.random() - 0.5);
        for (let c = 0; c < numCats; c++) {
          categoryLinks.push({
            transaction_id: txn.id,
            category_id: shuffled[c],
          });
        }
      }

      const { error: catLinkErr } = await supabase.from("transaction_categories").insert(categoryLinks);

      if (catLinkErr) {
        console.error("Category link error:", catLinkErr);
      }
    }

    console.log(`  Inserted batch ${Math.floor(i / 50) + 1} (${batch.length} transactions)`);
  }

  console.log("Done! Seed data inserted successfully.");
  console.log("Summary:");
  console.log(`  - 2025 (Jul-Dec): ~${6 * 7} expense + ~${6 * 1.5} income transactions`);
  console.log(`  - 2026 (Jan-Mar): ~${3 * 1.5} income transactions (expenses already exist)`);
}

seed().catch(console.error);
