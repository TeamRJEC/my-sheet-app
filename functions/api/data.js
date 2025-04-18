export async function onRequest(context) {
  const url = context.env.APP_SCRIPT_URL;
  const response = await fetch(url);
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}