#!/bin/zsh
cd /Users/hamzaelmoueddane/Desktop/car/carhubos/backend
set -a && source .env && set +a

OUT=/Users/hamzaelmoueddane/Desktop/car/carhubos/backend/setup_db_result.txt
echo "=== DB SETUP $(date) ===" > $OUT

echo "\n--- MIGRATE ---" >> $OUT
npx prisma migrate deploy >> $OUT 2>&1
echo "MIGRATE_EXIT:$?" >> $OUT

echo "\n--- SEED ROLES ---" >> $OUT
node prisma/seed-roles.js >> $OUT 2>&1
echo "SEED_ROLES_EXIT:$?" >> $OUT

echo "\n--- SEED MAIN ---" >> $OUT
node prisma/seed.js >> $OUT 2>&1
echo "SEED_MAIN_EXIT:$?" >> $OUT

echo "\n--- SEED PLANS ---" >> $OUT
node prisma/seed-plans.js >> $OUT 2>&1
echo "SEED_PLANS_EXIT:$?" >> $OUT

echo "\n=== DONE ===" >> $OUT
