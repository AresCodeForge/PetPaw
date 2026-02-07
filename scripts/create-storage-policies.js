const https = require('https');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sql = `
-- Storage policies for adoption-images
drop policy if exists "Anyone can view adoption images" on storage.objects;
create policy "Anyone can view adoption images" on storage.objects
  for select using (bucket_id = 'adoption-images');

drop policy if exists "Users can upload adoption images" on storage.objects;
create policy "Users can upload adoption images" on storage.objects
  for insert with check (
    bucket_id = 'adoption-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update own adoption images" on storage.objects;
create policy "Users can update own adoption images" on storage.objects
  for update using (
    bucket_id = 'adoption-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own adoption images" on storage.objects;
create policy "Users can delete own adoption images" on storage.objects
  for delete using (
    bucket_id = 'adoption-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for shelter-documents
drop policy if exists "Users can upload shelter documents" on storage.objects;
create policy "Users can upload shelter documents" on storage.objects
  for insert with check (
    bucket_id = 'shelter-documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can view own shelter documents" on storage.objects;
create policy "Users can view own shelter documents" on storage.objects
  for select using (
    bucket_id = 'shelter-documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own shelter documents" on storage.objects;
create policy "Users can delete own shelter documents" on storage.objects
  for delete using (
    bucket_id = 'shelter-documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
`;

// Extract project ref from URL
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

// Try using pg package if available
async function runWithPg() {
  try {
    const { Client } = require('pg');
    // Try connection via pooler
    const client = new Client({
      connectionString: `postgresql://postgres.${projectRef}:${process.env.DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
    });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('Policies created successfully via pg!');
    return true;
  } catch (e) {
    console.log('pg not available or connection failed:', e.message);
    return false;
  }
}

// Alternative: Create an exec_sql function first, then call it
async function createExecFunction() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(supabaseUrl, serviceKey);
  
  // Try to call rpc if exec_sql exists
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  
  if (error) {
    console.log('exec_sql RPC not available:', error.message);
    console.log('\nPlease run the following SQL in your Supabase Dashboard SQL Editor:\n');
    console.log(sql);
    return false;
  }
  
  console.log('Policies created successfully!');
  return true;
}

createExecFunction();
