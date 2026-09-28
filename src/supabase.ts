import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tcfltbzyuliqwsjyfayu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZmx0Ynp5dWxpcXdzanlmYXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1Mjc2NjcsImV4cCI6MjEwNjEwMzY2N30.4eKw2yBai4n9gusbjbTdojU0KZ13pggqR63SVncl2fU';

export const supabase = createClient(supabaseUrl, supabaseKey);
