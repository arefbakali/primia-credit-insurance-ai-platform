/**
 * Test the exact insert that the controller does
 */
const supabase = require('./utils/supabaseClient');
const path = require('path');

async function testExactInsert() {
    if (!supabase) {
        console.log('❌ Supabase not configured');
        return;
    }

    console.log('Testing exact controller insert logic...\n');

    const user_email = 'amen@gmail.com';
    const description = 'Analyse automatique du rapport financier';
    const sector = 'BANQUES';
    const bank_report_path = 'uploads/test-file.pdf';

    console.log('Inserting with:');
    console.log(`  user_email: ${user_email}`);
    console.log(`  description: ${description}`);
    console.log(`  sector: ${sector}`);
    console.log(`  bank_report_path: ${bank_report_path}`);
    console.log(`  status: 'pending'`);
    console.log(`  base_amount: 0`);
    console.log(`  tva_rate: 19\n`);

    try {
        const { data: quoteData, error: quoteError } = await supabase
            .from('quotes')
            .insert([{
                user_email,
                description,
                sector,
                bank_report_path,
                status: 'pending',
                base_amount: 0,
                tva_rate: 19
            }])
            .select()
            .single();

        if (quoteError) {
            console.log('❌ INSERT FAILED:');
            console.log(`   Error: ${quoteError.message}`);
            console.log(`   Code: ${quoteError.code}`);
            console.log(`   Details: ${JSON.stringify(quoteError, null, 2)}`);
        } else {
            console.log('✅ INSERT SUCCESSFUL!');
            console.log(`   Quote ID: ${quoteData.id}`);
            console.log(`   Status: ${quoteData.status}`);
            
            // Clean up
            const { error: deleteError } = await supabase
                .from('quotes')
                .delete()
                .eq('id', quoteData.id);
            if (deleteError) {
                console.log(`   ⚠️  Could not delete: ${deleteError.message}`);
            } else {
                console.log(`   ✅ Test record deleted`);
            }
        }
    } catch (err) {
        console.log('❌ EXCEPTION:');
        console.log(`   ${err.message}`);
        console.log(`   Stack: ${err.stack}`);
    }
}

testExactInsert().catch(console.error);

