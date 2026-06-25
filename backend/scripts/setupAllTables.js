/**
 * Script to create all database tables programmatically
 * Alternative to running SQL script manually
 * 
 * Note: Supabase doesn't support direct SQL execution via JS client easily.
 * It's recommended to run createTablesComplete.sql in Supabase Dashboard > SQL Editor
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableExists(tableName) {
    try {
        const { error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
        
        if (error) {
            if (error.code === '42P01' || error.message.includes('schema cache')) {
                return false; // Table doesn't exist
            }
            throw error;
        }
        return true; // Table exists
    } catch (err) {
        return false;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('DATABASE TABLES STATUS CHECK');
    console.log('='.repeat(60));
    console.log('\n⚠️  NOTE: Supabase JS client cannot execute DDL (CREATE TABLE) statements directly.');
    console.log('   You need to run the SQL script in Supabase Dashboard.\n');
    console.log('📋 To create all tables:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the contents of: backend/scripts/createTablesComplete.sql');
    console.log('   4. Click "Run" to execute\n');
    
    console.log('Checking existing tables...\n');
    
    const tables = [
        'users',
        'companies',
        'financial_results',
        'stock_trading_history',
        'stock_index_history',
        'quotes'
    ];
    
    const results = {};
    for (const table of tables) {
        const exists = await checkTableExists(table);
        results[table] = exists;
        console.log(`  ${exists ? '✅' : '❌'} ${table.padEnd(25)} ${exists ? 'EXISTS' : 'MISSING'}`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    const missingTables = Object.entries(results).filter(([_, exists]) => !exists);
    if (missingTables.length > 0) {
        console.log(`\n⚠️  ${missingTables.length} table(s) are missing:`);
        missingTables.forEach(([table]) => console.log(`   - ${table}`));
        console.log('\n💡 Run createTablesComplete.sql in Supabase Dashboard to create them.');
    } else {
        console.log('\n✅ All tables exist!');
    }
    
    console.log('\n' + '='.repeat(60));
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { checkTableExists };

