import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://pllvcfgsbowubifvossb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbHZjZmdzYm93dWJpZnZvc3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDQxOTEsImV4cCI6MjA5MjAyMDE5MX0.2oq7YRWphmgrH3Q5hrvWgM78g6N-CwCLZRZq1hZs4Wo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Deleting Bengaluru businesses...");
  const { error: e1 } = await supabase.from('businesses').delete().ilike('address', '%Bengaluru%');
  if (e1) console.error(e1);
  else console.log("Deleted Bengaluru businesses");

  console.log("Deleting Bengaluru shelters...");
  const { error: e2 } = await supabase.from('shelters').delete().ilike('address', '%Bengaluru%');
  if (e2) console.error(e2);
  else console.log("Deleted Bengaluru shelters");

  console.log("Deleting Bengaluru drivers...");
  const names = ["Ravi Kumar", "Priya Sharma", "Akash Reddy", "Sunita Devi"];
  const { error: e3 } = await supabase.from('drivers').delete().in('name', names);
  if (e3) console.error(e3);
  else console.log("Deleted Bengaluru drivers");
}

run();
