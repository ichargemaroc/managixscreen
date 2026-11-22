import { describe,it,expect } from 'vitest';
import { canvaPublishedUrl,instagramPostUrl,instagramDisplayUrl,weatherDisplayUrl,weatherLocationSchema,isScreenflowDisplay,previewDisplayUrl } from '@/lib/integrations';
describe('Published sources',()=>{
 it('recognizes only owned display pages, never external sites or dashboard paths',()=>{
  expect(isScreenflowDisplay('https://screenflow.live/display/weather?name=RABAT','http://localhost:8080')).toBe(true);
  expect(isScreenflowDisplay('https://screenflow.live.evil.test/display/weather','https://screenflow.live')).toBe(false);
  expect(isScreenflowDisplay('https://screenflow.live/billing-admin','https://screenflow.live')).toBe(false);
  expect(isScreenflowDisplay('https://example.com/display/weather','https://screenflow.live')).toBe(false);
  expect(isScreenflowDisplay('https://user:password@screenflow.live/display/weather','https://screenflow.live')).toBe(false);
 });
 it('opens the local weather preview instead of a potentially older published version',()=>{
  expect(previewDisplayUrl('https://screenflow.live/display/weather?name=RABAT&lat=34.02&lon=-6.84','http://localhost:8080')).toBe('http://localhost:8080/display/weather?name=RABAT&lat=34.02&lon=-6.84');
  expect(previewDisplayUrl('https://example.com/page','http://localhost:8080')).toBe('https://example.com/page');
 });
 it('preserves published Canva links without pretending to connect an account',()=>{expect(canvaPublishedUrl('https://www.canva.com/design/ABC/secret/view?embed')).toBe('https://www.canva.com/design/ABC/secret/view?embed');expect(canvaPublishedUrl('https://brand.my.canva.site/')).toBe('https://brand.my.canva.site/');expect(()=>canvaPublishedUrl('https://www.canva.com/design/ABC/edit')).toThrow();expect(()=>canvaPublishedUrl('https://canva.com.evil.test/design/ABC/view')).toThrow();});
 it('accepts public Instagram posts and Reels but not profiles or Stories',()=>{expect(instagramPostUrl('https://instagram.com/reel/ABC_123/?igsh=secret')).toBe('https://www.instagram.com/reel/ABC_123/');expect(()=>instagramPostUrl('https://www.instagram.com/stories/user/123')).toThrow();expect(()=>instagramPostUrl('https://www.instagram.com/user/')).toThrow();expect(instagramDisplayUrl('https://screenflow.live','https://instagram.com/p/ABC/')).toBe('https://screenflow.live/display/instagram?post=https%3A%2F%2Fwww.instagram.com%2Fp%2FABC%2F');});
 it('bounds real weather coordinates and preserves explicit location names',()=>{expect(weatherLocationSchema.safeParse({name:'Casablanca',latitude:100,longitude:0}).success).toBe(false);expect(weatherDisplayUrl('https://screenflow.live',{name:'Casablanca',latitude:33.5731,longitude:-7.5898})).toBe('https://screenflow.live/display/weather?name=Casablanca&lat=33.57&lon=-7.59');});
});