
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manuel parse of .env because dotenv is missing
const envPath = path.join(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudioData() {
  const { data: studios, error: sError } = await supabase
    .from('studios')
    .select('id, nome, instagram_handle')
    .order('id');
  
  if (sError) {
    console.error(sError);
    return;
  }
  
  const results = [];
  for (const studio of studios) {
    const { count, error: fError } = await supabase
      .from('figuras')
      .select('id', { count: 'exact', head: true })
      .eq('studio_id', studio.id);
    
    results.push({
      ...studio,
      figureCount: count
    });
  }
  
  console.log('--- Database Audit: Studios & Counts ---');
  console.log(JSON.stringify(results, null, 2));
}

checkStudioData();
