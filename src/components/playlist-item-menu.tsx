import { ArrowDown, ArrowUp, CalendarDays, Clock, Copy, EllipsisVertical, ListVideo, ListX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
export type PlaylistItemAction = 'up' | 'down' | 'remove' | 'duplicate' | 'daily' | 'periodic' | 'transition';

export function PlaylistItemMenu({ name, first, last, disabled, onAction }: {
  name: string; first: boolean; last: boolean; disabled: boolean;
  onAction: (action: PlaylistItemAction) => void;
}) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={disabled} aria-label={`Actions pour ${name}`} title={`Actions pour ${name}`}><EllipsisVertical className="size-4" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)] [&_[role=menuitem]]:items-start [&_[role=menuitem]]:py-3 [&_[role=menuitem]]:whitespace-normal">
      <DropdownMenuItem onSelect={() => onAction('daily')}><Clock />Définir les heures d’affichage quotidiennes</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction('periodic')}><CalendarDays />Programmer l’affichage périodique</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction('transition')}><ListVideo />Définir une transition personnalisée</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={first} onSelect={() => onAction('up')}><ArrowUp />Déplacer l’élément vers le haut</DropdownMenuItem>
      <DropdownMenuItem disabled={last} onSelect={() => onAction('down')}><ArrowDown />Déplacer l’élément vers le bas</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction('duplicate')}><Copy />Dupliquer l’élément</DropdownMenuItem>
      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onAction('remove')}><ListX />Retirer de la liste de lecture</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}