import { NextRequest, NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"
import sharp from "sharp"

export async function GET(req: NextRequest) {
  try {
    // Read from the Els members folder directly
    const imagePath = join(
      process.cwd(),
      "..",
      "Els members",
      "login.png"
    )

    const imageBuffer = readFileSync(imagePath)

    // Get image metadata to know height
    const metadata = await sharp(imageBuffer).metadata()
    const height = metadata.height || 1080

    // Crop to top 40% to show the Account page header
    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: 0,
        width: metadata.width || 1080,
        height: Math.floor(height * 0.4),
      })
      .png()
      .toBuffer()

    return new NextResponse(croppedBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Error serving screenshot:", error)
    return NextResponse.json(
      { error: "Failed to load image" },
      { status: 500 }
    )
  }
}
