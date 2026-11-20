import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, uid } from "@/lib/store";

export const Route = createFileRoute("/schedule")({
  head: () => ({ meta: [
    { title: "Schedule — ScreenFlow" },
    { name: "description", content: "Programmez vos playlists par date et horaire." },
    { property: "og:title", content: "Schedule — ScreenFlow" },
    { property: "og:description", content: "Programmez vos playlists par date et horaire." },
  ] }),
  component: SchedulePage,
});

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function SchedulePage() {
  const { schedules, playlists, screens, groups, set } = useStore();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ playlistId: "", target: "", startDate: today, endDate: today, startTime: "08:00", endTime: "20:00", days: [0, 1, 2, 3, 4] });
  const targetName = (t: string, id: string) => (t === "screen" ? screens.find((s) => s.id === id)?.name : groups.find((g) => g.id === id)?.name) ?? "—";
  const valid = f.playlistId && f.target && f.days.length && f.startDate <= f.endDate && f.startTime < f.endTime;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Schedule" description="Calendrier de diffusion de vos playlists." action={<Button onClick={() => setOpen(true)} disabled={!playlists.length}><Plus /> Programmer</Button>} />
      {schedules.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Aucune programmation" text={playlists.length ? "Planifiez une playlist sur une période, des jours et une plage horaire." : "Créez d'abord une playlist pour pouvoir la programmer."} />
      ) : (
        <Card className="overflow-x-auto p-4">
          <div className="grid min-w-[700px] grid-cols-7 gap-2">
            {DAYS.map((d, i) => (
              <div key={d}>
                <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">{d}</p>
                <div className="space-y-2">
                  {schedules.filter((s) => s.days.includes(i)).sort((a, b) => a.startTime.localeCompare(b.startTime)).map((s) => (
                    <div key={s.id} className="group rounded-md border-l-2 border-primary bg-accent p-2 text-xs text-accent-foreground">
                      <p className="font-semibold">{s.startTime}–{s.endTime}</p>
                      <p className="truncate">{playlists.find((p) => p.id === s.playlistId)?.name}</p>
                      <p className="truncate opacity-70">{targetName(s.targetType, s.targetId)}</p>
                      <p className="opacity-70">{s.startDate} → {s.endDate}</p>
                      <button className="mt-1 hidden text-destructive group-hover:inline-flex" aria-label="Supprimer" onClick={() => set((st) => ({ ...st, schedules: st.schedules.filter((x) => x.id !== s.id) }))}><Trash2 className="size-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle programmation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Playlist</Label>
              <Select value={f.playlistId} onValueChange={(v) => setF({ ...f, playlistId: v })}><SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>{playlists.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Cible</Label>
              <Select value={f.target} onValueChange={(v) => setF({ ...f, target: v })}><SelectTrigger><SelectValue placeholder="TV ou groupe…" /></SelectTrigger>
                <SelectContent>
                  {screens.map((s) => <SelectItem key={s.id} value={`screen:${s.id}`}>TV · {s.name}</SelectItem>)}
                  {groups.map((g) => <SelectItem key={g.id} value={`group:${g.id}`}>Groupe · {g.name}</SelectItem>)}
                </SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Du</Label><Input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Au</Label><Input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>De</Label><Input type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></div>
              <div className="space-y-2"><Label>À</Label><Input type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} /></div>
            </div>
            <div className="flex flex-wrap gap-1">
              {DAYS.map((d, i) => (
                <Button key={d} type="button" size="sm" variant={f.days.includes(i) ? "default" : "outline"} onClick={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i] })}>{d}</Button>
              ))}
            </div>
          </div>
          <DialogFooter><Button disabled={!valid} onClick={() => {
            const [targetType, targetId] = f.target.split(":") as ["screen" | "group", string];
            set((s) => ({ ...s, schedules: [...s.schedules, { id: uid(), playlistId: f.playlistId, targetType, targetId, startDate: f.startDate, endDate: f.endDate, startTime: f.startTime, endTime: f.endTime, days: f.days }] }));
            setOpen(false);
          }}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
