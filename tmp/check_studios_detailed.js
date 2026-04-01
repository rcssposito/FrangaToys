
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudioData() {
  // 1. Get all studios
  const { data: studios, error: sError } = await supabase
    .from('studios')
    .select('id, nome, instagram_handle')
    .order('id');
  
  if (sError) {
    console.error(sError);
    return;
  }
  
  // 2. Count figures per studio
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
  
  // 3. Look for CA3D specifically in names
  const ca3dSearch = studios.filter(s => s.nome.toLowerCase().includes('ca') || s.nome.toLowerCase().includes('3d'));

  console.log('--- Studios with Figure Counts ---');
  console.log(JSON.stringify(results, null, 2));
  console.log('--- Potential CA3D matches ---');
  console.log(JSON.stringify(ca3dSearch, null, 2));
}

checkStudioData();
