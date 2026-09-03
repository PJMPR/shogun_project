import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, ViewChild, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';

export interface MentionRecipient { userId: string; displayName: string; email?: string | null }
interface DirectoryUser extends MentionRecipient { hasEmail: boolean }

@Component({
  selector: 'app-mention-input', standalone: true, imports: [FormsModule],
  template: `<div class="mention-editor"><textarea #editor [rows]="rows()" [ngModel]="value()" (ngModelChange)="changed($event)" (click)="cursorChanged()" (keyup)="cursorChanged()" (keydown)="keyDown($event)" [placeholder]="placeholder()"></textarea>
    @if (open()) { <div class="mention-menu" role="listbox">@for(user of results(); track user.userId; let index=$index){<button type="button" [class.active]="activeIndex()===index" [disabled]="!user.hasEmail" (mousedown)="$event.preventDefault(); select(user)"><strong>{{user.displayName}}</strong><small>{{user.email || 'Brak adresu e-mail'}}</small></button>}@empty{<span>Brak wyników</span>}</div> }
  </div>
  @if (recipients().length) { <div class="recipients"><small>Odbiorcy:</small>@for(recipient of recipients(); track recipient.userId){<button type="button" class="chip" (click)="remove(recipient)">{{recipient.displayName}}@if(recipient.email){ · {{recipient.email}}}<i class="pi pi-times"></i></button>}</div> }`,
  styles: [`.mention-editor{position:relative}.mention-editor textarea{box-sizing:border-box;width:100%}.mention-menu{position:absolute;right:0;bottom:100%;left:0;z-index:5;max-height:210px;overflow:auto;border:1px solid var(--p-surface-300,#cbd5e1);border-radius:7px;background:#fff;box-shadow:0 8px 24px #0f172a24}.mention-menu button{display:flex;width:100%;flex-direction:column;padding:.55rem .7rem;border:0;border-bottom:1px solid #eef2f7;background:#fff;text-align:left;cursor:pointer}.mention-menu button:hover:not(:disabled),.mention-menu button.active{background:#f1f5f9}.mention-menu button:disabled{opacity:.5;cursor:not-allowed}.mention-menu small,.mention-menu>span{padding:.35rem .7rem;color:#64748b}.recipients{display:flex;align-items:center;flex-wrap:wrap;gap:.35rem;margin:.4rem 0}.recipients small{color:#64748b}.chip{padding:.25rem .5rem;border:0;border-radius:99px;color:#1e3a8a;background:#dbeafe;cursor:pointer}.chip i{margin-left:.3rem;font-size:.65rem}`]
})
export class MentionInputComponent {
  private readonly http=inject(HttpClient); private readonly search$=new Subject<string>(); private mentionStart=-1;
  readonly value=input(''); readonly recipients=input<MentionRecipient[]>([]); readonly rows=input(3); readonly placeholder=input('');
  readonly valueChange=output<string>(); readonly recipientsChange=output<MentionRecipient[]>();
  protected readonly results=signal<DirectoryUser[]>([]); protected readonly open=signal(false); protected readonly activeIndex=signal(0);
  @ViewChild('editor') private editor?:ElementRef<HTMLTextAreaElement>;
  constructor(){this.search$.pipe(debounceTime(200),distinctUntilChanged(),switchMap(query=>this.http.get<DirectoryUser[]>('/api-users/api/v1/user-directory',{params:{query,limit:20}}))).subscribe({next:items=>{const results=items.filter(x=>!this.recipients().some(r=>r.userId===x.userId));this.results.set(results);this.activeIndex.set(0);this.open.set(results.length>0)},error:()=>this.open.set(false)});}
  protected keyDown(event:KeyboardEvent){if(!this.open())return;if(event.key==='Escape'){event.preventDefault();this.open.set(false);return;}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const length=this.results().length;if(length)this.activeIndex.update(i=>(i+(event.key==='ArrowDown'?1:-1)+length)%length);return;}if(event.key==='Enter'||event.key==='Tab'){const user=this.results()[this.activeIndex()];if(user?.hasEmail){event.preventDefault();this.select(user);}}}
  protected changed(text:string){this.valueChange.emit(text);const kept=this.recipients().filter(r=>text.includes(`@${r.displayName}`));if(kept.length!==this.recipients().length)this.recipientsChange.emit(kept);queueMicrotask(()=>this.cursorChanged());}
  protected cursorChanged(){const el=this.editor?.nativeElement;if(!el)return;const before=el.value.slice(0,el.selectionStart);if(/\s$/.test(before)){this.open.set(false);return;}const match=before.match(/(?:^|\s)@([^@\n]*)$/);if(!match){this.open.set(false);return;}this.mentionStart=el.selectionStart-match[1].length-1;const query=match[1].trim();if(query.length<2){this.open.set(false);return;}this.search$.next(query);}
  protected select(user:DirectoryUser){if(!user.hasEmail)return;const el=this.editor?.nativeElement;const start=this.mentionStart;const end=el?.selectionStart??this.value().length;const next=`${this.value().slice(0,start)}@${user.displayName} ${this.value().slice(end)}`;this.valueChange.emit(next);this.recipientsChange.emit([...this.recipients(),user]);this.open.set(false);queueMicrotask(()=>{if(el){const caret=start+user.displayName.length+2;el.value=next;el.focus();el.setSelectionRange(caret,caret);}});}
  protected remove(recipient:MentionRecipient){const token=`@${recipient.displayName}`;this.valueChange.emit(this.value().replace(token,'').replace(/ {2,}/g,' '));this.recipientsChange.emit(this.recipients().filter(x=>x.userId!==recipient.userId));}
}
