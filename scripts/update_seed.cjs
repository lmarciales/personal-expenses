const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function updateSeed() {
    console.log('Deleting existing account types...');
    const { error: delError } = await supabase
        .from('account_types')
        .delete()
        .neq('name', 'INVALID_NAME_TO_MATCH_ALL'); // Delete all

    if (delError) {
        console.error('Delete error:', delError);
        return;
    }

    console.log('Inserting new account types...');
    const { error: insError } = await supabase
        .from('account_types')
        .insert([
            { name: 'Credit Card', color: '#6366f1' },
            { name: 'Debit Card', color: '#3b82f6' },
            { name: 'Wallet', color: '#10b981' }
        ]);

    if (insError) {
        console.error('Insert error:', insError);
    } else {
        console.log('Successfully updated account types!');
    }
}

updateSeed();
