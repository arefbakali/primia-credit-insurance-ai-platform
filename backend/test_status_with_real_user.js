/**
 * Test status constraint with real user email
 */
const supabase = require('./utils/supabaseClient');

async function testWithRealUser() {
    if (!supabase) {
        console.log('❌ Supabase not configured');
        return;
    }

    console.log('Testing status values with real user email...\n');

    const realUserEmail = 'amen@gmail.com'; // Known user from tests
    const testStatuses = ['pending', 'generated', 'confirmed', 'updated'];
    
    for (const status of testStatuses) {
        try {
            console.log(`Testing status: "${status}"...`);
            const { data, error } = await supabase
                .from('quotes')
                .insert([{
                    user_email: realUserEmail,
                    description: `TEST - ${status} - DELETE ME`,
                    sector: 'TEST',
                    status: status,
                    base_amount: 0,
                    tva_rate: 19
                }])
                .select()
                .single();

            if (error) {
                if (error.message.includes('check constraint')) {
                    console.log(`  ❌ "${status}" - NOT ALLOWED (check constraint violation)`);
                    console.log(`     Error: ${error.message}`);
                } else {
                    console.log(`  ⚠️  "${status}" - Other error: ${error.message}`);
                }
            } else {
                console.log(`  ✅ "${status}" - ALLOWED and inserted successfully`);
                // Delete the test record
                const { error: deleteError } = await supabase
                    .from('quotes')
                    .delete()
                    .eq('id', data.id);
                if (deleteError) {
                    console.log(`     ⚠️  Could not delete test record: ${deleteError.message}`);
                } else {
                    console.log(`     ✅ Test record deleted`);
                }
            }
        } catch (err) {
            console.log(`  ❌ "${status}" - Exception: ${err.message}`);
        }
        console.log('');
    }

    console.log('✅ Test complete');
}

testWithRealUser().catch(console.error);

