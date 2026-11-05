import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  CONTACTS_PAGE_SIZE,
  ContactApi,
  ContactPage,
  ContactQuery,
} from '../../core/api/contact-api';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { Permission } from '../../core/auth/permission';
import { contactErrorMessage } from './contact-error';
import { contactEditPath, CONTACTS_NEW_PATH } from './contact-navigation';

@Component({
  selector: 'app-contact-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './contact-list.html',
  styleUrl: './contact.scss',
})
export class ContactListComponent implements OnInit {
  private readonly contactApi = inject(ContactApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthSessionService);

  readonly newPath = CONTACTS_NEW_PATH;
  readonly editPath = contactEditPath;
  readonly filterForm = inject(FormBuilder).group({
    thirdPartyId: [null as number | null, [Validators.min(1)]],
  });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<ContactPage | null>(null);
  readonly canCreate = computed(() => this.auth.hasPermission(Permission.ContactsManage));
  readonly canEdit = this.canCreate;
  private query: ContactQuery = { page: 0, size: CONTACTS_PAGE_SIZE };

  ngOnInit(): void {
    this.load();
  }

  applyFilter(): void {
    if (this.loading()) return;
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }
    this.query = {
      page: 0,
      size: CONTACTS_PAGE_SIZE,
      thirdPartyId: this.filterForm.controls.thirdPartyId.value,
    };
    this.load();
  }

  clearFilter(): void {
    if (this.loading()) return;
    this.filterForm.reset({ thirdPartyId: null });
    this.query = { page: 0, size: CONTACTS_PAGE_SIZE };
    this.load();
  }

  page(offset: number): void {
    const result = this.result();
    if (this.loading() || !result) return;
    const page = result.page + offset;
    if (page < 0 || page * result.size >= result.total) return;
    this.query = { ...this.query, page };
    this.load();
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.contactApi
      .listContacts(this.query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error: unknown) => this.error.set(contactErrorMessage(error)),
      });
  }
}
