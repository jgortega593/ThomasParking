// supabase/functions/tu-funcion/index.ts
Deno.serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:5173",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "authorization, content-type",
      }
    });
  }

  // Tu lógica principal aquí
  return new Response(JSON.stringify({ data: "ok" }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "http://localhost:5173"
    }
  });
});
