# Instructions to Create All Database Tables

## Quick Method: Using Supabase Dashboard (Recommended)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your Makina project

### Step 2: Open SQL Editor
1. Click on **SQL Editor** in the left sidebar
2. Click **New Query**

### Step 3: Copy and Execute SQL Script
1. Open the file: `backend/scripts/createTablesComplete.sql`
2. Copy **ALL** the contents
3. Paste into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 4: Verify Tables Created
1. Go to **Table Editor** in the left sidebar
2. You should see these tables:
   - ✅ users
   - ✅ companies
   - ✅ financial_results
   - ✅ stock_trading_history
   - ✅ stock_index_history
   - ✅ quotes

---

## Alternative: Check Table Status

Run this command to check which tables exist:

```bash
cd backend
npm run check:tables
```

---

## What Gets Created

### Tables Created:

1. **users** - User accounts (email, password, name, role)
2. **companies** - Company records linked to users
3. **financial_results** - Financial analysis data
4. **stock_trading_history** - Stock trading data
5. **stock_index_history** - Stock index data
6. **quotes** - Insurance quote requests

### Also Created:

- ✅ **Indexes** for better query performance
- ✅ **Foreign Key Constraints** for data integrity
- ✅ **Triggers** to auto-update `updated_at` timestamps
- ✅ **Check Constraints** for valid status values

---

## After Creating Tables

Once tables are created, you can run the import script:

```bash
cd backend
npm run import:all
```

This will:
- Create users for all companies
- Import financial data
- Link everything together

---

## Troubleshooting

### Error: "relation already exists"
- The table already exists, which is fine
- The script uses `CREATE TABLE IF NOT EXISTS` so it's safe to run again

### Error: "permission denied"
- Make sure you're using the **Service Role Key** in your `.env` file
- Service Role Key has full database access

### Foreign Key Errors
- If you get foreign key constraint errors, the tables are being created in the wrong order
- The complete script handles this automatically
- Make sure to run the **complete script** in order

---

## File Locations

- **Complete SQL Script**: `backend/scripts/createTablesComplete.sql`
- **Simplified SQL Script**: `backend/scripts/createTables.sql`
- **Check Script**: `backend/scripts/setupAllTables.js`

Use `createTablesComplete.sql` for the most complete setup with all features.

