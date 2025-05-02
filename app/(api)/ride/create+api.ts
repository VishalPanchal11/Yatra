import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received ride creation request with body:", JSON.stringify(body, null, 2));
    
    const {
      origin_address,
      destination_address,
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      ride_time,
      fare_price,
      payment_status,
      driver_id,
      user_id,
    } = body;

    // Special debug for user_id
    console.log("USER ID received:", user_id);
    console.log("USER ID type:", typeof user_id);
    
    if (!user_id || typeof user_id !== 'string') {
      console.error("User ID is missing or invalid:", user_id);
      return Response.json(
        { error: "Invalid user ID", details: `user_id: ${user_id}, type: ${typeof user_id}` },
        { status: 400 },
      );
    }

    if (
      !origin_address ||
      !destination_address ||
      !origin_latitude ||
      !origin_longitude ||
      !destination_latitude ||
      !destination_longitude ||
      !ride_time ||
      !fare_price ||
      !payment_status ||
      !driver_id
    ) {
      console.error("Missing required fields:", {
        origin_address: !!origin_address,
        destination_address: !!destination_address,
        origin_latitude: !!origin_latitude,
        origin_longitude: !!origin_longitude,
        destination_latitude: !!destination_latitude,
        destination_longitude: !!destination_longitude,
        ride_time: !!ride_time,
        fare_price: !!fare_price,
        payment_status: !!payment_status,
        driver_id: !!driver_id,
      });
      
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    console.log("Inserting ride into database with user_id:", user_id);

    const response = await sql`
      INSERT INTO rides ( 
          origin_address, 
          destination_address, 
          origin_latitude, 
          origin_longitude, 
          destination_latitude, 
          destination_longitude, 
          ride_time, 
          fare_price, 
          payment_status, 
          driver_id, 
          user_id
      ) VALUES (
          ${origin_address},
          ${destination_address},
          ${origin_latitude},
          ${origin_longitude},
          ${destination_latitude},
          ${destination_longitude},
          ${ride_time},
          ${fare_price},
          ${payment_status},
          ${driver_id},
          ${user_id}
      )
      RETURNING *;
    `;

    console.log("Ride created successfully:", JSON.stringify(response[0], null, 2));
    return Response.json({ data: response[0] }, { status: 201 });
  } catch (error) {
    console.error("Error inserting data into rides:", error);
    return Response.json({ 
      error: "Internal Server Error", 
      details: error.message || String(error) 
    }, { status: 500 });
  }
}