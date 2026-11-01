// Optional cloud accounts. Leave empty for local profiles (progress stays on this device, move it with an export code).
// To enable sign up from any device: create a free Supabase project, run supabase/schema.sql, then paste the project URL
// and the public anon key below. The anon key is meant to be public; row level security protects each player's row.
window.IRTS_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
