import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  // Extract ID from the URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  
  console.log("Fetching rides for user:", id);
  
  if (!id) {
    console.error("Missing user ID");
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    console.log("Running database query...");
    
    const response = await sql`
        SELECT
            rides.ride_id,
            rides.origin_address,
            rides.destination_address,
            rides.origin_latitude,
            rides.origin_longitude,
            rides.destination_latitude,
            rides.destination_longitude,
            rides.ride_time,
            rides.fare_price,
            rides.payment_status,
            rides.created_at,
            json_build_object(
                'driver_id', drivers.id,
                'first_name', drivers.first_name,
                'last_name', drivers.last_name,
                'profile_image_url', drivers.profile_image_url,
                'car_image_url', drivers.car_image_url,
                'car_seats', drivers.car_seats,
                'rating', drivers.rating
            ) AS driver 
        FROM 
            rides
        INNER JOIN
            drivers ON rides.driver_id = drivers.id
        WHERE 
            rides.user_id = ${id}
        ORDER BY 
            rides.created_at DESC;
    `;

    console.log(`Found ${response.length} rides for user ${id}`);
    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching recent rides:", error);
    return Response.json({ 
      error: "Internal Server Error", 
      details: error.message || String(error)
    }, { status: 500 });
  }
}