import { createClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'

async function main() {
  const [email, password] = process.argv.slice(2)

  if (!email || !password) {
    console.error('Usage: tsx scripts/seed-admin.ts <email> <password>')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment',
    )
    process.exit(1)
  }

  const supabase = createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userId: string | null = null

  const displayName = email.split('@')[0]

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })

  if (createError) {
    const alreadyExists =
      createError.message.toLowerCase().includes('already') ||
      (createError as { status?: number }).status === 422

    if (!alreadyExists) {
      console.error('Failed to create user:', createError.message)
      process.exit(1)
    }

    let page = 1
    while (!userId) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 200,
      })
      if (error) {
        console.error('Failed to look up existing user:', error.message)
        process.exit(1)
      }
      const match = data.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      )
      if (match) {
        userId = match.id
        const { error: updateAuthError } =
          await supabase.auth.admin.updateUserById(match.id, { password })
        if (updateAuthError) {
          console.error(
            'Failed to update existing user password:',
            updateAuthError.message,
          )
          process.exit(1)
        }
        break
      }
      if (data.users.length < 200) break
      page += 1
    }

    if (!userId) {
      console.error('User exists but could not be located via listUsers.')
      process.exit(1)
    }
  } else {
    userId = created.user.id
  }

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileLookupError) {
    console.error('Failed to look up profile:', profileLookupError.message)
    process.exit(1)
  }

  if (!existingProfile) {
    const { error: insertError } = await supabase.from('profiles').insert({
      user_id: userId,
      role: 'admin',
      display_name: email.split('@')[0],
    })
    if (insertError) {
      console.error('Failed to insert profile:', insertError.message)
      process.exit(1)
    }
  } else if (existingProfile.role !== 'admin') {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('user_id', userId)
    if (updateError) {
      console.error('Failed to promote profile to admin:', updateError.message)
      process.exit(1)
    }
  }

  console.log(`Admin user ready: ${email} (user_id=${userId})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
