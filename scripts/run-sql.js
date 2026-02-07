const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function runSQL() {
  // Use the SQL endpoint directly
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation'
    }
  });
  
  console.log('Testing connection:', response.status);
  
  const sqlEndpoint = `${supabaseUrl}/pg/query`;
  
  const sql = `
drop policy if exists "Anyone can view adoption images" on storage.objects;
create policy "Anyone can view adoption images" on storage.objects
  for select using (bucket_id = 'adoption-images');
  `;

  const sqlResponse = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({ query: sql })
  });
  
  console.log('SQL endpoint status:', sqlResponse.status);
  const text = await sqlResponse.text();
  console.log('Response:', text);
}

runSQL().catch(console.error);
