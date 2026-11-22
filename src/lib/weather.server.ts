import { z } from 'zod';
import { weatherDataSchema,weatherLocationSchema,roundedCoordinate } from './integrations';

export async function fetchWeather(latitude:number,longitude:number){
 const coordinates=weatherLocationSchema.pick({latitude:true,longitude:true}).parse({latitude,longitude});const lat=roundedCoordinate(coordinates.latitude),lon=roundedCoordinate(coordinates.longitude);
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 // This service-only abuse counter stores no location or user identity.
 const limit=await supabaseAdmin.rpc('consume_device_limit',{p_key:'weather-provider-global',p_max:1000,p_seconds:3600});if(limit.error || !limit.data)throw new Error('Météo momentanément indisponible.');
 const response=await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`,{headers:{'User-Agent':'ScreenFlow/1.0 https://screenflow.live','Accept':'application/json'},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('Météo momentanément indisponible.');
 const schema=z.object({properties:z.object({meta:z.object({updated_at:z.string()}),timeseries:z.array(z.object({time:z.string(),data:z.object({instant:z.object({details:z.object({air_temperature:z.number(),wind_speed:z.number()})}),next_1_hours:z.object({summary:z.object({symbol_code:z.string()})}).optional(),next_6_hours:z.object({summary:z.object({symbol_code:z.string()})}).optional()})})).min(1)})});
 const parsed=schema.parse(await response.json());const point=parsed.properties.timeseries.find(p=>Date.parse(p.time)>=Date.now())??parsed.properties.timeseries.at(-1);if(!point)throw new Error('Prévision indisponible.');
 return weatherDataSchema.parse({updatedAt:parsed.properties.meta.updated_at,forecastAt:point.time,temperature:point.data.instant.details.air_temperature,wind:point.data.instant.details.wind_speed,symbol:point.data.next_1_hours?.summary.symbol_code??point.data.next_6_hours?.summary.symbol_code??'unknown',latitude:lat,longitude:lon});
}