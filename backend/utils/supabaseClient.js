require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing in .env file. Supabase features will be disabled.');
    console.warn('To enable Supabase, add SUPABASE_URL and SUPABASE_KEY to your .env file.');
} else {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error.message);
    }
}

module.exports = supabase;
