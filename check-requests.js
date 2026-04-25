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

async function check() {
  const { data, error } = await adminClient
    .from("account_requests")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(5)

  if (error) {
    console.error("Error:", error)
  } else {
    console.log(`Total requests: ${data?.length || 0}`)
    data?.forEach(r => {
      console.log(`- ${r.username_requested} (${r.status}) - ${r.submitted_at}`)
    })
  }
  process.exit(0)
}

check()
