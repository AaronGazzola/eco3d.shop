#!/bin/bash

echo "WARNING: This will reset the DEV database and delete ALL data!"
echo "Project: $NEXT_PUBLIC_SUPABASE_PROJECT_REF"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
  echo "Operation cancelled"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_PROJECT_REF" ]; then
  echo "Error: NEXT_PUBLIC_SUPABASE_PROJECT_REF is not set"
  exit 1
fi

echo ""
echo "Linking to dev project ($NEXT_PUBLIC_SUPABASE_PROJECT_REF)..."
npx supabase link --project-ref "$NEXT_PUBLIC_SUPABASE_PROJECT_REF"

if [ $? -ne 0 ]; then
  echo "Failed to link project"
  exit 1
fi

echo ""
echo "Resetting dev database..."
npx supabase db reset --linked

if [ $? -ne 0 ]; then
  echo "Database reset failed"
  exit 1
fi

echo ""
echo "Dev database reset complete!"
