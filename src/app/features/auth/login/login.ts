import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { authErrorMessage } from '../../../core/auth/auth-error';
import { safeReturnUrl } from '../../../core/auth/auth-navigation';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  readonly submitLabel = computed(() =>
    this.submitting()
      ? $localize`:@@auth.login.submitting:Signing in...`
      : $localize`:@@auth.login.submit:Sign in`,
  );

  readonly errorMessage = computed(() => {
    const error = this.auth.error();
    return error ? authErrorMessage(error) : null;
  });

  readonly errorDetail = computed(() => {
    const error = this.auth.error();
    const message = this.errorMessage();
    return error?.detail && error.detail !== message ? error.detail : null;
  });

  ngOnInit(): void {
    if (this.auth.status() === 'authenticated') {
      void this.router.navigateByUrl(this.returnUrl);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { identifier, password } = this.form.getRawValue();
    const error = await this.auth.login(identifier, password);
    this.form.controls.password.reset();
    this.submitting.set(false);

    if (!error) {
      await this.router.navigateByUrl(this.returnUrl);
    }
  }

  async retry(): Promise<void> {
    await this.auth.bootstrap();
    if (this.auth.status() === 'authenticated') {
      await this.router.navigateByUrl(this.returnUrl);
    }
  }
}
