#!/bin/zsh
cd /Users/hamzaelmoueddane/Desktop/car/carhubos/backend

OUT=/Users/hamzaelmoueddane/Desktop/car/carhubos/backend/check_results.txt
echo "=== HEALTH CHECK $(date) ===" > $OUT

echo "\n--- TSC ---" >> $OUT
npx tsc --noEmit >> $OUT 2>&1
echo "TSC_EXIT:$?" >> $OUT

echo "\n--- JEST ---" >> $OUT
npx jest --passWithNoTests --forceExit >> $OUT 2>&1
echo "JEST_EXIT:$?" >> $OUT

echo "\n=== DONE ===" >> $OUT
