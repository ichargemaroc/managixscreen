import { createFileRoute } from '@tanstack/react-router';
import { weatherLocationSchema } from '@/lib/integrations';
export const Route=createFileRoute('/api/public/weather')({server:{handlers:{GET:async({request})=>{
 const url=new URL(request.url);const input=weatherLocationSchema.pick({latitude:true,longitude:true}).safeParse({latitude:url.searchParams.get('lat'),longitude:url.searchParams.get('lon')});
 if(!url.searchParams.has('lat')||!url.searchParams.has('lon')||!input.success)return Response.json({error:'Coordonnées invalides.'},{status:400,headers:{'Cache-Control':'no-store'}});
 try{const {fetchWeather}=await import('@/lib/weather.server');return Response.json(await fetchWeather(input.data.latitude,input.data.longitude),{headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=3600, s-maxage=3600','X-Content-Type-Options':'nosniff'}});}catch{return Response.json({error:'Météo momentanément indisponible.'},{status:503,headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});}
}}}});