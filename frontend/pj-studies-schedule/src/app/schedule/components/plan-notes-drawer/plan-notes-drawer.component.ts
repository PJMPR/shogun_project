import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ScheduleNote, ScheduleNotesService } from '../../services/schedule-notes.service';

@Component({
  selector: 'app-plan-notes-drawer', imports: [FormsModule, ButtonModule],
  template: `<div class="backdrop" (click)="closed.emit()"></div><aside><header><div><small>Plan zajęć</small><h3>Notatki planistów</h3></div><button class="close" (click)="closed.emit()"><i class="pi pi-times"></i></button></header><main>@for(note of service.notes(); track note.id){<details><summary><span>{{heading(note)}}</span><small>{{note.authorDisplayName}} · {{format(note.createdAt)}}</small></summary><article>@if(editingId()===note.id){<input [(ngModel)]="editTitle" maxlength="200" placeholder="Tytuł (opcjonalnie)"/><textarea rows="3" [(ngModel)]="editDraft"></textarea><p-button label="Zapisz" size="small" (onClick)="saveEdit(note)"/>} @else {<p>{{note.body}}</p><div class="actions">@if(note.canEdit){<button (click)="startEdit(note)">Edytuj</button>}@if(note.canDelete){<button (click)="remove(note)">Usuń</button>}</div>}</article></details>}@empty{<div class="empty">Brak notatek do planu.</div>}</main><footer><input [(ngModel)]="title" maxlength="200" placeholder="Tytuł (opcjonalnie)"/><textarea rows="3" [(ngModel)]="draft" placeholder="Napisz notatkę…"></textarea><p-button label="Dodaj notatkę" icon="pi pi-plus" [disabled]="!draft.trim()" (onClick)="add()"/></footer></aside>`,
  styles: [`:host{position:fixed;inset:0;z-index:100}.backdrop{position:absolute;inset:0;background:#0f172a55}aside{position:absolute;top:0;right:0;display:flex;flex-direction:column;width:min(440px,96vw);height:100%;background:white;box-shadow:-10px 0 30px #0f172a33}header{display:flex;justify-content:space-between;padding:1rem 1.2rem;border-bottom:1px solid var(--p-surface-200)}h3{margin:.2rem 0}.close{border:0;background:transparent;cursor:pointer}main{flex:1;overflow:auto;padding:.7rem 1.2rem}details{margin-bottom:.55rem;border:1px solid var(--p-surface-200);border-radius:7px;overflow:hidden}summary{display:flex;flex-direction:column;gap:.15rem;padding:.7rem .8rem;background:var(--p-surface-50);cursor:pointer}summary span{font-weight:600}summary small{color:var(--p-surface-500)}article{padding:.8rem}article p{white-space:pre-wrap}.actions{display:flex;justify-content:flex-end;gap:.6rem}.actions button{border:0;color:var(--p-primary-700);background:transparent;cursor:pointer}footer{padding:1rem 1.2rem;border-top:1px solid var(--p-surface-200)}textarea,input{box-sizing:border-box;width:100%;margin-bottom:.5rem;padding:.6rem;border:1px solid var(--p-surface-300);border-radius:6px}textarea{resize:vertical}.empty{padding:3rem 0;text-align:center;color:var(--p-surface-500)}`],
})
export class PlanNotesDrawerComponent {
  readonly scheduleId = input.required<string>(); readonly closed = output<void>(); readonly service = inject(ScheduleNotesService);
  protected draft=''; protected title=''; protected editDraft=''; protected editTitle=''; protected readonly editingId=signal<string|null>(null);
  protected async add(){const body=this.draft.trim();if(!body)return;await this.service.add(this.scheduleId(),body,this.title.trim());this.draft='';this.title='';}
  protected startEdit(note:ScheduleNote){this.editingId.set(note.id);this.editDraft=note.body;this.editTitle=note.title??'';}
  protected async saveEdit(note:ScheduleNote){if(this.editDraft.trim())await this.service.edit(note.id,this.editDraft.trim(),this.editTitle.trim());this.editingId.set(null);}
  protected async remove(note:ScheduleNote){if(confirm('Usunąć notatkę?'))await this.service.remove(note.id);}
  protected format(value:string){return new Date(value).toLocaleString('pl-PL');}
  protected heading(note:ScheduleNote){return note.title?.trim()||`${note.body.slice(0,55)}${note.body.length>55?'…':''}`;}
}
