import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize, switchMap } from 'rxjs';
import { Contact, ContactApi, UpdateContactRequest } from '../../core/api/contact-api';
import { contactErrorMessage } from './contact-error';
import { CONTACTS_PATH } from './contact-navigation';
import { contactNonBlankValidator, positiveIntegerValidator } from './contact-validation';

@Component({
  selector: 'app-contact-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './contact-edit.html',
  styleUrl: './contact.scss',
})
export class ContactEditComponent implements OnInit {
  private readonly contactApi = inject(ContactApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly contactsPath = CONTACTS_PATH;
  readonly contactId = signal<number | null>(null);
  readonly contact = signal<Contact | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly confirmingDelete = signal(false);
  readonly changed = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly contactName = computed(() => {
    const contact = this.contact();
    if (!contact) return '';
    return contact.firstName ? `${contact.lastName}, ${contact.firstName}` : contact.lastName;
  });
  readonly form = this.fb.group({
    lastName: this.fb.nonNullable.control('', [Validators.required, contactNonBlankValidator]),
    firstName: this.fb.control<string | null>(null),
    email: this.fb.control<string | null>(null),
    thirdPartyId: this.fb.control<number | null>(null, [positiveIntegerValidator]),
  });
  private readonly original = signal<Contact | null>(null);

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.changed.set(this.hasChanges()));
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = Number(params.get('id'));
          this.contactId.set(id);
          this.contact.set(null);
          this.original.set(null);
          this.loading.set(true);
          this.saving.set(false);
          this.deleting.set(false);
          this.confirmingDelete.set(false);
          this.changed.set(false);
          this.error.set(null);
          this.success.set(null);
          return this.contactApi.getContact(id).pipe(
            catchError((error: unknown) => {
              this.error.set(contactErrorMessage(error));
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((contact) => this.applyContact(contact));
  }

  save(): void {
    const original = this.original();
    if (!original || this.loading() || this.saving() || this.deleting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.buildPatch(original);
    if (!Object.keys(request).length) return;

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.contactApi
      .updateContact(original.id, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (contact) => {
          this.applyContact(contact);
          this.success.set($localize`:@@contact.edit.success:Contact saved successfully.`);
        },
        error: (error: unknown) => this.error.set(contactErrorMessage(error)),
      });
  }

  requestDelete(): void {
    if (!this.contact() || this.loading() || this.saving() || this.deleting()) return;
    this.confirmingDelete.set(true);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.confirmingDelete.set(false);
  }

  confirmDelete(): void {
    const contact = this.contact();
    if (!contact || !this.confirmingDelete() || this.saving() || this.deleting()) return;
    this.deleting.set(true);
    this.error.set(null);
    this.success.set(null);
    this.contactApi
      .deleteContact(contact.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => {
          this.confirmingDelete.set(false);
          this.contact.set(null);
          this.original.set(null);
          void this.router.navigate([CONTACTS_PATH]);
        },
        error: (error: unknown) => this.error.set(contactErrorMessage(error)),
      });
  }

  private buildPatch(original: Contact): UpdateContactRequest {
    const value = this.form.getRawValue();
    const request: UpdateContactRequest = {};
    if (value.lastName !== original.lastName) request.lastName = value.lastName;
    const firstName = this.optionalText(value.firstName);
    if (firstName !== original.firstName) request.firstName = firstName;
    const email = this.optionalText(value.email);
    if (email !== original.email) request.email = email;
    if (value.thirdPartyId !== original.thirdPartyId) request.thirdPartyId = value.thirdPartyId;
    return request;
  }

  private hasChanges(): boolean {
    const original = this.original();
    if (!original) return false;
    const value = this.form.getRawValue();
    return (
      value.lastName !== original.lastName ||
      this.optionalText(value.firstName) !== original.firstName ||
      this.optionalText(value.email) !== original.email ||
      value.thirdPartyId !== original.thirdPartyId
    );
  }

  private optionalText(value: string | null): string | null {
    return value && value.trim().length ? value : null;
  }

  private applyContact(contact: Contact): void {
    this.contact.set(contact);
    this.contactId.set(contact.id);
    this.original.set(contact);
    this.form.reset(
      {
        lastName: contact.lastName,
        firstName: contact.firstName,
        email: contact.email,
        thirdPartyId: contact.thirdPartyId,
      },
      { emitEvent: false },
    );
    this.changed.set(false);
  }
}
