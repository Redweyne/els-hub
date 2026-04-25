const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
)

async function seed() {
  const { data, error } = await supabase
    .from("factions")
    .insert({
      tag: "GUEST",
      name: "Guest Accounts",
      server_no: 0,
      class_tier: "D",
      public_slug: "guest",
      is_public: false,
    })
    .select()

  if (error) {
    if (error.message.includes("duplicate")) {
      console.log("✓ GUEST faction already exists")
    } else {
      console.error("✗ Error:", error.message)
    }
  } else {
    console.log("✓ GUEST faction created")
  }
  process.exit(0)
}

seed()
