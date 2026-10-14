import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ContactApi, Contact, CreateContactRequest } from '../../core/api/contact-api';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class ContactComponent {
  private readonly contactApi = inject(ContactApi);
  private readonly fb = inject(FormBuilder);

  readonly searchForm: FormGroup = this.fb.group({
    contactId: ['', [Validators.required, Validators.min(1)]],
  });

  readonly createForm: FormGroup = this.fb.group({
    lastName: ['', [Validators.required]],
    firstName: [''],
    email: [''],
    thirdPartyId: [''],
  });

  readonly searchLoading = signal(false);
  readonly createLoading = signal(false);
  readonly contact = signal<Contact | null>(null);
  readonly error = signal<string | null>(null);
  readonly createdId = signal<number | null>(null);

  readonly searchButtonText = computed(() =>
    this.searchLoading()
      ? $localize`@@contact.action.searching:Searching...`
      : $localize`@@contact.action.search:Search`
  );

  readonly createButtonText = computed(() =>
    this.createLoading()
      ? $localize`@@contact.action.creating:Creating...`
      : $localize`@@contact.action.create:Create contact`
  );

  searchContact(): void {
    if (this.searchForm.invalid) {
      return;
    }
    this.searchLoading.set(true);
    this.error.set(null);
    this.contact.set(null);

    const id = this.searchForm.value.contactId;
    this.contactApi.getContact(id).subscribe({
      next: (contact) => {
        this.contact.set(contact);
        this.searchLoading.set(false);
      },
      error: (err) => {
        this.error.set(this.extractErrorDetail(err));
        this.searchLoading.set(false);
      },
    });
  }

  createContact(): void {
    if (this.createForm.invalid) {
      return;
    }
    this.createLoading.set(true);
    this.error.set(null);
    this.createdId.set(null);

    const request: CreateContactRequest = {
      lastName: this.createForm.value.lastName,
      firstName: this.createForm.value.firstName || null,
      email: this.createForm.value.email || null,
      thirdPartyId: this.createForm.value.thirdPartyId || null,
    };

    this.contactApi.createContact(request).subscribe({
      next: (response) => {
        this.createdId.set(response.id);
        this.createLoading.set(false);
        this.fetchCreatedContact(response.id);
      },
      error: (err) => {
        this.error.set(this.extractErrorDetail(err));
        this.createLoading.set(false);
      },
    });
  }

  private fetchCreatedContact(id: number): void {
    this.contactApi.getContact(id).subscribe({
      next: (contact) => {
        this.contact.set(contact);
      },
      error: (err) => {
        this.error.set(this.extractErrorDetail(err));
      },
    });
  }

  private extractErrorDetail(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const httpError = err as { error: unknown };
      if (
        httpError.error &&
        typeof httpError.error === 'object' &&
        'detail' in httpError.error
      ) {
        const problemDetail = httpError.error as { detail: string };
        return problemDetail.detail;
      }
    }
    return $localize`@@contact.error.unexpected:Unable to communicate with Alixar.`;
  }
}