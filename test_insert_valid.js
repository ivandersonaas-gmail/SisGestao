import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { error } = await supabase.from('user_pinned_processes').insert({ 
    user_id: 'ce3979b4-367b-4557-b0f7-2588a68bc9f5', 
    process_id: '88fe7361-3169-4c06-98a3-fe3cd41fd2e4' 
  });
  console.log('insert error with valid uuids:', error);
}

test();
