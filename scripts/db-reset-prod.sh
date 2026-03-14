#!/bin/bash

echo "WARNING: This will reset the PRODUCTION database and delete ALL data!"
echo "Project: $NEXT_PUBLIC_SUPABASE_PROJECT_REF"
echo ""
read -p "Type 'reset production' to confirm: " confirmation

if [ "$confirmation" != "reset production" ]; then
  echo "Operation cancelled"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_PROJECT_REF" ]; then
  echo "Error: NEXT_PUBLIC_SUPABASE_PROJECT_REF is not set"
  exit 1
fi

echo ""
echo "Linking to production project ($NEXT_PUBLIC_SUPABASE_PROJECT_REF)..."
npx supabase link --project-ref "$NEXT_PUBLIC_SUPABASE_PROJECT_REF"

if [ $? -ne 0 ]; then
  echo "Failed to link project"
  exit 1
fi

echo ""
echo "Resetting production database..."
npx supabase db reset --linked

if [ $? -ne 0 ]; then
  echo "Database reset failed"
  exit 1
fi

echo ""
echo "Production database reset complete!"
