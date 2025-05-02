import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id } = body;
    
    console.log("Updating all rides with user_id:", user_id);
    
    if (!user_id) {
      return Response.json({ error: "Missing user_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    
    // First check if the user_id column exists
    try {
      const columnCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'rides' AND column_name = 'user_id'
      `;
      
      console.log("Column check result:", columnCheck);
      
      // If the user_id column doesn't exist, create it
      if (columnCheck.length === 0) {
        console.log("Adding user_id column to rides table");
        await sql`ALTER TABLE rides ADD COLUMN user_id TEXT`;
      }
    } catch (err) {
      console.error("Error checking/creating user_id column:", err);
    }
    
    // Update all rides with the provided user_id
    const result = await sql`
      UPDATE rides
      SET user_id = ${user_id}
      WHERE user_id IS NULL OR user_id = ''
      RETURNING *
    `;

    console.log(`Updated ${result.length} rides with user_id ${user_id}`);
    
    return Response.json({ 
      message: `Updated ${result.length} rides with user_id ${user_id}`,
      data: result 
    });
  } catch (error) {
    console.error("Error updating rides:", error);
    return Response.json({ 
      error: "Internal Server Error", 
      details: error.message || String(error) 
    }, { status: 500 });
  }
} 