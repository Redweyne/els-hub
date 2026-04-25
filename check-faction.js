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

async function check() {
  const { data: factions, error } = await supabase
    .from("factions")
    .select("*")

  if (error) {
    console.error("Error:", error.message)
  } else {
    console.log("Factions in database:")
    factions.forEach(f => console.log(`- ${f.tag}: ${f.name}`))
    
    const hasGuest = factions.some(f => f.tag === "GUEST")
    if (!hasGuest) {
      console.log("\nGUEST faction missing. Creating...")
      const { data: newFaction, error: createError } = await supabase
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
      
      if (createError) {
        console.error("Create error:", createError.message)
      } else {
        console.log("✓ GUEST faction created")
      }
    }
  }
  process.exit(0)
}

check()
