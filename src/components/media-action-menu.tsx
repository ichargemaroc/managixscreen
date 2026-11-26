import { EllipsisVertical, ListPlus, ListX, FolderInput, RefreshCw, Trash2, SquareCheck, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

type Props = {
  name: string;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onDelete: () => void;
  onRename: () => void;
  onManage: () => void;
};

export function MediaActionMenu({ name, busy, onAdd, onRemove, onDelete, onRename, onManage }: Props) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={busy} aria-label={`Actions pour ${name}`} title="Actions du média"><EllipsisVertical /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={6} className="w-96 max-w-[calc(100vw-2rem)] p-2 [&_[role=menuitem]]:gap-3 [&_[role=menuitem]]:px-3 [&_[role=menuitem]]:py-3 [&_[role=menuitem]]:whitespace-normal [&_[role=menuitem]]:leading-5">
      <DropdownMenuItem onSelect={onAdd}><ListPlus className="text-muted-foreground" /><span>Ajouter aux listes de lecture de plusieurs écrans</span></DropdownMenuItem>
      <DropdownMenuItem onSelect={onRemove}><ListX className="text-muted-foreground" /><span>Retirer de toutes les listes de lecture</span></DropdownMenuItem>
      <DropdownMenuItem disabled title="Les dossiers ne sont pas encore disponibles"><FolderInput /><span>Déplacer vers un autre dossier <span className="text-xs">(indisponible)</span></span></DropdownMenuItem>
      <DropdownMenuItem disabled title="Le remplacement de fichier n’est pas encore disponible"><RefreshCw /><span>Remplacer le fichier <span className="text-xs">(indisponible)</span></span></DropdownMenuItem>
      <DropdownMenuItem onSelect={onRename}><Pencil className="text-muted-foreground" /><span>Renommer</span></DropdownMenuItem>
      <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 /><span>Supprimer le fichier</span></DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onManage}><SquareCheck className="text-muted-foreground" /><span className="flex flex-col gap-1"><span>Gestion des fichiers</span><span className="text-xs text-muted-foreground">Gérer plusieurs fichiers à la fois</span></span></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}