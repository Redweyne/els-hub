const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const adminClient = createClient(
  supabaseUrl,
  serviceRoleKey
)

async function verify() {
  // Check account_requests
  const { data: request } = await adminClient
    .from("account_requests")
    .select("*")
    .eq("username_requested", "LesserRed")
    .single()

  console.log("Account Request:")
  console.log(`- Status: ${request?.status}`)
  console.log(`- Username: ${request?.username_requested}`)
  console.log(`- Created: ${request?.submitted_at}`)

  // Check profiles
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("username", "LesserRed")
    .single()

  console.log("\nProfile:")
  if (profile) {
    console.log(`- ID: ${profile.id}`)
    console.log(`- Role: ${profile.platform_role}`)
    console.log(`- Status: ${profile.status}`)
  } else {
    console.log("- Not found")
  }

  // Check auth user
  const { data: authUser } = await adminClient.auth.admin.listUsers()
  const lesserRedAuth = authUser?.users?.find(u => u.email?.includes("lesserred"))
  
  console.log("\nAuth User:")
  if (lesserRedAuth) {
    console.log(`- Email: ${lesserRedAuth.email}`)
    console.log(`- Created: ${lesserRedAuth.created_at}`)
  } else {
    console.log("- Not found")
  }

  process.exit(0)
}

verify()
