import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://jvoxlmgjzjogfioastxc.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2b3hsbWdqempvZ2Zpb2FzdHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Nzk3NjYsImV4cCI6MjA5MTM1NTc2Nn0.AhggVl73r0fVtppfpOn5xVyzac6ytQHX2dmT0d3qD14';

export const supabase = createClient(supabaseUrl, supabaseKey);
