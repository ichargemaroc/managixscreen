import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PanelsTopLeft, Plus, Pencil, Trash2, Play, Pause, Square, Save } from 'lucide-react';
import { PageHeader, EmptyState, StatusBadge } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useStore, saveVideoWall, controlVideoWall, deleteVideoWall } from '@/lib/store';
import { wallConfigSchema, type WallConfig, type WallMember, type VideoWall } from '@/lib/video-wall';
import { WallMediaPreview } from '@/components/wall-media-preview';
import { toast } from 'sonner';
import { WallAssignments } from '@/components/wall-assignments';
import { WallPositionTest } from '@/components/wall-position-test';
export const Route=createFileRoute('/_authenticated/video-walls')({head:()=>({meta:[
  {title:'Murs d’images — ScreenFlow'}, {name:'description',content:'Configurez vos murs de télévisions, leurs positions et la diffusion commune de vos images et vidéos.'},
  {property:'og:title',content:'Murs d’images — ScreenFlow'},{property:'og:description',content:'Gestion des murs d’images et contrôle des lecteurs ScreenFlow.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'},
]}),component:WallsPage});
const DEFAULT:WallConfig={name:'',columns:2,rows:2,width:3840,height:2160,gap_x:0,gap_y:0,orientation:'landscape',media_id:null};
const states={playing:'Lecture programmée',paused:'En pause',stopped:'Arrêté'};
const Preview = WallMediaPreview;
function WallsPage(){
  const {walls,screens,media,wallEvents,refresh}=useStore();
  const [editing,setEditing]=useState<string|null>(null); const [open,setOpen]=useState(false);
  const [config,setConfig]=useState<WallConfig>(DEFAULT); const [members,setMembers]=useState<WallMember[]>([]);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [removing,setRemoving]=useState<VideoWall|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const active=walls.find(w=>w.id===selected)??walls[0];
  const begin=(wall?:VideoWall)=>{setEditing(wall?.id??null);setConfig(wall?{name:wall.name,columns:wall.columns,rows:wall.rows,width:wall.width,height:wall.height,gap_x:wall.gap_x,gap_y:wall.gap_y,orientation:wall.orientation,media_id:wall.media_id,media_x:wall.media_x??0,media_y:wall.media_y??0,media_scale:wall.media_scale??1}:DEFAULT);setMembers(wall?.members.map(m=>({...m}))??[]);setError('');setOpen(true);};
  const run=async(task:()=>Promise<unknown>)=>{setBusy(true);try{await task();refresh();}catch(e){toast.error(e instanceof Error?e.message:'La modification a échoué.');}finally{setBusy(false);}};
  const resize=(columns:number,rows:number)=>{setConfig(c=>({...c,columns,rows,width:columns*(c.orientation==='landscape'?1920:1080),height:rows*(c.orientation==='landscape'?1080:1920)}));setMembers(list=>list.filter(m=>m.column_index<columns&&m.row_index<rows));};

  const save=async(launch=false)=>{const parsed=wallConfigSchema.safeParse(config);if(!parsed.success){setError(parsed.error.issues[0]?.message??'Configuration invalide.');return;}setBusy(true);setError('');try{const id=await saveVideoWall(editing,parsed.data,members);setSelected(id);setEditing(id);refresh();if(launch)await controlVideoWall(id,'play');setOpen(false);toast.success('Mur enregistré');}catch(e){setError(e instanceof Error?e.message:'Enregistrement impossible.');}finally{setBusy(false);}};
  return <div className="mx-auto max-w-7xl">
    <PageHeader title="Murs d’images" description="Diffusion commune" action={<Button onClick={()=>begin()}><Plus/>Nouveau mur</Button>}/>
    {!walls.length?<EmptyState icon={PanelsTopLeft} title="Aucun mur d’images" text="Aucun écran affecté." action={<Button onClick={()=>begin()}><Plus/>Créer un mur</Button>}/>:<>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{walls.map(w=>{const connected=w.members.filter(m=>screens.find(s=>s.id===m.screen_id)?.status==='online').length;return <Button key={w.id} variant="outline" onClick={()=>setSelected(w.id)} className={`h-auto min-w-0 flex-col items-stretch whitespace-normal rounded-lg p-4 text-left ${active?.id===w.id?'border-primary bg-secondary':'text-foreground'}`}>
        <div className="flex items-center justify-between gap-2"><span className="truncate font-medium">{w.name}</span><PanelsTopLeft className="shrink-0"/></div>
        <div className="mt-3"><Preview config={w} media={media.find(m=>m.id===w.media_id)}/></div>
        <span className="mt-3 text-xs text-muted-foreground">{w.columns} colonnes × {w.rows} lignes · {w.members.length}/{w.columns*w.rows} écrans · {connected} en ligne</span>
      </Button>;})}</div>
      {active && <section className="border-t pt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl">{active.name}</h2><p className="mt-1 text-sm text-muted-foreground">{states[active.state]} · {active.width} × {active.height} px</p></div><div className="flex flex-wrap gap-1">
          <Button disabled={busy||!active.media_id||!active.members.length} variant="secondary" title="Démarrer ou reprendre" aria-label="Démarrer le mur" onClick={()=>void run(()=>controlVideoWall(active.id,'play'))}><Play/>Lancer le mur</Button>
          <Button disabled={busy||active.state!=='playing'} variant="ghost" size="icon" title="Pause" aria-label="Mettre le mur en pause" onClick={()=>void run(()=>controlVideoWall(active.id,'pause'))}><Pause/></Button>
          <Button disabled={busy||active.state==='stopped'} variant="ghost" title="Arrêter" aria-label="Arrêter le mur" onClick={()=>void run(()=>controlVideoWall(active.id,'stop'))}><Square/>Arrêter le mur</Button>
          <Button variant="ghost" size="icon" title="Configurer" aria-label="Configurer le mur" onClick={()=>begin(active)}><Pencil/></Button>
          <Button variant="ghost" size="icon" title="Supprimer" aria-label="Supprimer le mur" onClick={()=>setRemoving(active)}><Trash2/></Button>
        </div></div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]"><Preview config={active} media={media.find(m=>m.id===active.media_id)}/><div className="min-w-0"><h3 className="mb-3 text-sm font-medium">Positions des écrans</h3><div className="space-y-3">{Array.from({length:active.rows*active.columns},(_,i)=>{const row=Math.floor(i/active.columns),col=i%active.columns;const member=active.members.find(m=>m.row_index===row&&m.column_index===col);const screen=screens.find(s=>s.id===member?.screen_id);return <div key={i} className="flex items-center justify-between gap-3 border-b pb-2 text-sm"><span className="min-w-0"><span className="text-muted-foreground">{row+1}:{col+1}</span> · {screen?.name??'Libre'}</span>{screen && <StatusBadge status={screen.status}/>}</div>;})}</div></div></div>
         <WallPositionTest key={active.id} wall={active}/>
         <div className="mt-7 border-t pt-5"><h3 className="mb-3 text-sm font-medium">Commandes communes</h3>{wallEvents.filter(e=>e.wall_id===active.id).slice(0,5).map(e=><div key={e.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{e.action==='play'?'Démarrer / reprendre':e.action==='pause'?'Pause':'Arrêt'}</span><time className="text-muted-foreground">{new Date(e.effective_at).toLocaleString('fr-FR')}</time></div>)}</div>
      </section>}
    </>}
    <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>{editing?'Configurer le mur':'Nouveau mur d’images'}</DialogTitle><DialogDescription>Configuration et affectations</DialogDescription></DialogHeader>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"><div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="wall-name">Nom du mur</Label><Input id="wall-name" value={config.name} onChange={e=>setConfig(c=>({...c,name:e.target.value}))} maxLength={120}/></div>
        <div className="space-y-2"><Label>Configuration</Label><Select value={`${config.columns}x${config.rows}`} onValueChange={v=>{if(v==='custom')return;const [columns,rows]=v.split('x').map(Number);if(columns&&rows)resize(columns,rows);}}><SelectTrigger aria-label="Configuration prédéfinie"><SelectValue placeholder="Personnalisée"/></SelectTrigger><SelectContent>{[[1,2],[2,2],[2,3],[3,3],[4,4]].map(([c,r])=><SelectItem key={`${c}x${r}`} value={`${c}x${r}`}>{c} colonnes × {r} lignes</SelectItem>)}<SelectItem value="custom">Personnalisée</SelectItem></SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3">{(['columns','rows'] as const).map(key=><div className="space-y-2" key={key}><Label htmlFor={`wall-${key}`}>{key==='columns'?'Colonnes':'Lignes'}</Label><Input id={`wall-${key}`} type="number" min={1} max={8} value={config[key]} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=8)resize(key==='columns'?n:config.columns,key==='rows'?n:config.rows);}}/></div>)}</div>
        <div className="space-y-2"><Label>Orientation des écrans</Label><Select value={config.orientation} onValueChange={v=>{const orientation=v==='portrait'?'portrait':'landscape';setConfig(c=>({...c,orientation,width:c.columns*(orientation==='landscape'?1920:1080),height:c.rows*(orientation==='landscape'?1080:1920)}));}}><SelectTrigger aria-label="Orientation"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="landscape">Paysage</SelectItem><SelectItem value="portrait">Portrait</SelectItem></SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3">{(['width','height','gap_x','gap_y'] as const).map(key=><div className="space-y-2" key={key}><Label htmlFor={`wall-${key}`}>{({width:'Largeur (px)',height:'Hauteur (px)',gap_x:'Espace X (px)',gap_y:'Espace Y (px)'})[key]}</Label><Input id={`wall-${key}`} type="number" min={key==='width'?320:key==='height'?180:0} value={config[key]} onChange={e=>setConfig(c=>({...c,[key]:Number(e.target.value)}))}/></div>)}</div>
        <div className="space-y-2"><Label>Contenu du mur</Label><Select value={config.media_id??'none'} onValueChange={value=>setConfig(c=>({...c,media_id:value==='none'?null:value}))}><SelectTrigger aria-label="Contenu du mur"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Aucun contenu</SelectItem>{media.map(m=><SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
      </div><div className="min-w-0 space-y-5"><Preview config={config} media={media.find(m=>m.id===config.media_id)} onChange={placement=>setConfig(previous=>({...previous,...placement}))}/><h3 className="text-sm font-medium">Affectation des télévisions · {members.length}/{config.columns*config.rows}</h3>
        <WallAssignments config={config} members={members} screens={screens} walls={walls} wallId={editing} busy={busy} onChange={setMembers}/>
      </div></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>Annuler</Button><Button variant="secondary" disabled={busy||!config.name.trim()||!config.media_id||!members.length} onClick={()=>void save(true)}><Play/>Lancer le mur</Button><Button disabled={busy||!config.name.trim()} onClick={()=>void save()}><Save/>{busy?'Enregistrement…':'Enregistrer les affectations'}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={Boolean(removing)} onOpenChange={v=>!v&&setRemoving(null)}><DialogContent><DialogHeader><DialogTitle>Supprimer {removing?.name} ?</DialogTitle><DialogDescription>Les télévisions retrouveront leur playlist habituelle. Les médias seront conservés.</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={()=>setRemoving(null)}>Annuler</Button><Button variant="destructive" disabled={busy} onClick={()=>{if(removing)void run(async()=>{await deleteVideoWall(removing.id);setRemoving(null);});}}><Trash2/>Supprimer</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
