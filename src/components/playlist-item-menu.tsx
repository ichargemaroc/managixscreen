import { ArrowDown, ArrowUp, CalendarDays, Clock, Copy, EllipsisVertical, ListVideo, ListX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function PlaylistItemMenu({ name, first, last, disabled, onAction }: {
  name: string; first: boolean; last: boolean; disabled: boolean;
  onAction: (action: 'up' | 'down' | 'remove') => void;
}) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={disabled} aria-label={`Actions pour ${name}`} title={`Actions pour ${name}`}><EllipsisVertical className="size-4" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)] [&_[role=menuitem]]:items-start [&_[role=menuitem]]:py-3 [&_[role=menuitem]]:whitespace-normal">
      <DropdownMenuItem disabled title="Les horaires sont définis pour une playlist dans Programmation."><Clock />Définir les heures d’affichage quotidiennes — indisponible</DropdownMenuItem>
      <DropdownMenuItem disabled title="La programmation individuelle des médias n’est pas disponible."><CalendarDays />Programmer l’affichage périodique — indisponible</DropdownMenuItem>
      <DropdownMenuItem disabled title="La transition est configurée pour l’ensemble de la playlist."><ListVideo />Définir une transition personnalisée — indisponible</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={first} onSelect={() => onAction('up')}><ArrowUp />Déplacer l’élément vers le haut</DropdownMenuItem>
      <DropdownMenuItem disabled={last} onSelect={() => onAction('down')}><ArrowDown />Déplacer l’élément vers le bas</DropdownMenuItem>
      <DropdownMenuItem disabled title="Un même média ne peut pas figurer deux fois dans une playlist."><Copy />Dupliquer l’élément — indisponible</DropdownMenuItem>
      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onAction('remove')}><ListX />Retirer de la liste de lecture</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}