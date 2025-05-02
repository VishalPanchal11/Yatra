import { Stripe } from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { payment_method_id, payment_intent_id, customer_id } = body;

    if (!payment_intent_id || !customer_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 },
      );
    }

    let result;
    
    if (payment_method_id) {
      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(
        payment_method_id,
        { customer: customer_id },
      );
    }

    // Confirm the payment intent
    result = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (result.status === 'requires_confirmation') {
      result = await stripe.paymentIntents.confirm(payment_intent_id, {
        payment_method: payment_method_id || result.payment_method,
      });
    }

    // Handle different payment statuses
    if (result.status === 'succeeded') {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment successful",
          result: result,
        }),
      );
    } else if (result.status === 'requires_action' || result.status === 'requires_source_action') {
      // Payment requires authentication
      return new Response(
        JSON.stringify({
          requires_action: true,
          payment_intent_client_secret: result.client_secret,
          result: result,
        }),
      );
    } else {
      // Other status, payment is still processing
      return new Response(
        JSON.stringify({
          success: false,
          requires_action: false,
          message: `Payment status: ${result.status}`,
          result: result,
        }),
      );
    }
  } catch (error) {
    console.error("Error paying:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
    });
  }
}